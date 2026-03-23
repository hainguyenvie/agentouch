/**
 * AgentVerse SSE client — uses HTTP/SSE instead of WebSocket
 * so it works behind HTTP/2 proxies (Replit, Cloudflare, etc.)
 */

import https from "https";
import http from "http";

type MessageHandler = (msg: unknown) => void;

export class AgentverseClient {
  private reconnectDelay = 1000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private handlers: MessageHandler[] = [];

  constructor(
    private readonly serverUrl: string, // e.g. https://connectingverse.replit.app
    private readonly token: string,
  ) {}

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
  }

  private emit(msg: unknown) {
    for (const h of this.handlers) h(msg);
  }

  // POST a message back to the server (relay events, heartbeats, task results)
  send(payload: unknown) {
    const body = JSON.stringify(payload);
    const url = new URL(`/api/agents/relay-anon?token=${encodeURIComponent(this.token)}`, this.serverUrl);

    // We don't have the agentId until after auth, so use a placeholder route.
    // The server resolves the agent from the token.
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => { res.resume(); }, // drain
    );
    req.on("error", () => {}); // ignore send errors
    req.end(body);
  }

  // After we have agentId, use the proper relay endpoint
  private agentId: string | null = null;

  sendRelay(payload: unknown) {
    if (!this.agentId) { this.send(payload); return; }
    const body = JSON.stringify(payload);
    const url = new URL(`/api/agents/${this.agentId}/relay?token=${encodeURIComponent(this.token)}`, this.serverUrl);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => { res.resume(); },
    );
    req.on("error", () => {});
    req.end(body);
  }

  connect() {
    if (this.closed) return;
    const url = new URL(`/api/agents/stream?token=${encodeURIComponent(this.token)}`, this.serverUrl);
    // Find agentId from URL path if we have it
    const sseUrl = this.agentId
      ? new URL(`/api/agents/${this.agentId}/stream?token=${encodeURIComponent(this.token)}`, this.serverUrl)
      : url;

    console.log(`[gateway] Connecting to ${this.serverUrl}...`);
    const lib = sseUrl.protocol === "https:" ? https : http;

    const req = lib.get(
      { hostname: sseUrl.hostname, port: sseUrl.port || (sseUrl.protocol === "https:" ? 443 : 80), path: sseUrl.pathname + sseUrl.search, headers: { Accept: "text/event-stream", "Cache-Control": "no-cache" } },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`[gateway] Server responded with ${res.statusCode}`);
          res.resume();
          this.scheduleReconnect();
          return;
        }

        console.log("[gateway] SSE stream established");
        this.reconnectDelay = 1000;

        // Start heartbeat
        this.heartbeatTimer = setInterval(() => {
          this.sendRelay({ type: "heartbeat" });
        }, 30_000);

        let buf = "";
        let eventName = "message";

        res.on("data", (chunk: Buffer) => {
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6)) as unknown;
                // If auth_ok, store agentId
                if (eventName === "auth_ok" && data && typeof data === "object" && "agentId" in data) {
                  this.agentId = (data as { agentId: string }).agentId;
                }
                this.emit({ type: eventName, ...(typeof data === "object" && data !== null ? data : { data }) });
              } catch { /* skip */ }
              eventName = "message";
            }
          }
        });

        res.on("end", () => {
          if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
          if (!this.closed) this.scheduleReconnect();
        });

        res.on("error", () => {
          if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
          if (!this.closed) this.scheduleReconnect();
        });
      },
    );

    req.on("error", (err) => {
      console.error("[gateway] Connection error:", err.message);
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    console.log(`[gateway] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
  }

  close() {
    this.closed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}
