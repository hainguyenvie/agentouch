/**
 * OpenClaw bridge — connects to OpenClaw's native WebSocket gateway.
 *
 * Protocol: ws://127.0.0.1:18789
 * Auth: connect.challenge → connect req with token → hello.ok
 * Chat: chat.send → stream ChatEvent via "chat" event frames
 */

import WebSocket from "ws";
import { randomUUID } from "crypto";

const PROTOCOL_VERSION = 3;

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: string; [k: string]: unknown };

type ChatEvent = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: {
    role?: string;
    content?: ContentBlock | ContentBlock[] | string;
  };
  errorMessage?: string;
};

export interface BridgeEvents {
  onTaskStarted: (taskId: string) => void;
  onStreamChunk: (taskId: string, delta: string, done: boolean) => void;
  onToolCall: (taskId: string, tool: string, input: Record<string, unknown>) => void;
  onTaskResult: (taskId: string, status: "done" | "failed", content: string) => void;
  onEvent: (taskId: string, eventType: string, data: unknown) => void;
}

export class OpenClawBridge {
  private ws: WebSocket | null = null;
  private connected = false;
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  private chatHandlers = new Map<string, (event: ChatEvent) => void>();

  constructor(
    private readonly gatewayUrl: string, // ws://127.0.0.1:18789
    private readonly token: string | undefined,
    private readonly events: BridgeEvents,
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Allow plaintext ws:// to loopback
      process.env["OPENCLAW_ALLOW_INSECURE_PRIVATE_WS"] = "1";

      const ws = new WebSocket(this.gatewayUrl);
      this.ws = ws;
      let connectResolved = false;

      const done = (err?: Error) => {
        if (connectResolved) return;
        connectResolved = true;
        err ? reject(err) : resolve();
      };

      ws.on("open", () => {
        console.log("[openclaw] WebSocket open, waiting for challenge...");
      });

      ws.on("message", (raw) => {
        let frame: { type: string; id?: string; seq?: number; event?: string; data?: unknown; final?: boolean; result?: unknown; error?: unknown };
        try {
          frame = JSON.parse(raw.toString()) as typeof frame;
        } catch {
          return;
        }

        if (frame.type === "event") {
          if (frame.event === "connect.challenge") {
            // Respond to challenge with our connect request
            this.sendRaw("connect", {
              minProtocol: PROTOCOL_VERSION,
              maxProtocol: PROTOCOL_VERSION,
              client: {
                id: "agentverse-gateway",
                version: "0.1.0",
                platform: process.platform,
                mode: "backend",
              },
              caps: [],
              auth: this.token ? { token: this.token } : undefined,
              role: "operator",
              scopes: ["operator.admin"],
            })
              .then(() => {
                this.connected = true;
                console.log("[openclaw] Connected to gateway ✓");
                done();
              })
              .catch((err: unknown) => done(err instanceof Error ? err : new Error(String(err))));
          } else if (frame.event === "chat") {
            const chatEvent = frame.data as ChatEvent;
            this.chatHandlers.get(chatEvent?.sessionKey ?? "")?.call(undefined, chatEvent);
          }
        } else if (frame.type === "res" && frame.id) {
          const p = this.pending.get(frame.id);
          if (p) {
            this.pending.delete(frame.id);
            if (frame.error) {
              p.reject(new Error(JSON.stringify(frame.error)));
            } else {
              p.resolve(frame.result ?? {});
            }
          }
        }
      });

      ws.on("error", (err) => done(err));
      ws.on("close", () => { this.connected = false; });
    });
  }

  private sendRaw(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  async runTask(taskId: string, content: string): Promise<void> {
    this.events.onTaskStarted(taskId);
    this.events.onEvent(taskId, "task_started", { content });

    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connect();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.events.onEvent(taskId, "task_error", { error: msg });
        this.events.onTaskResult(taskId, "failed", `Cannot connect to OpenClaw: ${msg}`);
        return;
      }
    }

    const sessionKey = `agentverse-${taskId}`;
    let fullText = "";
    let finished = false;

    await new Promise<void>((resolve) => {
      this.chatHandlers.set(sessionKey, (event: ChatEvent) => {
        if (event.state === "delta" && event.message) {
          const rawContent = event.message.content;
          const blocks: ContentBlock[] = Array.isArray(rawContent)
            ? rawContent
            : rawContent
              ? [rawContent as ContentBlock]
              : [];

          for (const block of blocks) {
            if (block.type === "text" || block.type === "text_delta") {
              const text = (block as { text: string }).text ?? "";
              if (text) {
                fullText += text;
                this.events.onStreamChunk(taskId, text, false);
              }
            } else if (block.type === "tool_use") {
              const t = block as { name: string; input: Record<string, unknown> };
              this.events.onToolCall(taskId, t.name, t.input ?? {});
            }
          }
        } else if (event.state === "final") {
          finished = true;
          this.chatHandlers.delete(sessionKey);
          this.events.onStreamChunk(taskId, "", true);
          this.events.onTaskResult(taskId, "done", fullText);
          resolve();
        } else if (event.state === "aborted" || event.state === "error") {
          finished = true;
          this.chatHandlers.delete(sessionKey);
          const errMsg = event.errorMessage ?? "aborted";
          this.events.onTaskResult(taskId, "failed", errMsg);
          resolve();
        }
      });

      this.sendRaw("chat.send", {
        sessionKey,
        message: content,
        idempotencyKey: randomUUID(),
      }).catch((err: unknown) => {
        if (!finished) {
          this.chatHandlers.delete(sessionKey);
          const msg = err instanceof Error ? err.message : String(err);
          this.events.onEvent(taskId, "task_error", { error: msg });
          this.events.onTaskResult(taskId, "failed", msg);
          resolve();
        }
      });
    });
  }

  close() {
    this.connected = false;
    this.ws?.close();
  }
}
