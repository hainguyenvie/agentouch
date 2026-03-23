import { WebSocket } from "ws";

type MessageHandler = (msg: unknown) => void;

export class AgentverseClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: string[] = [];
  private handlers: MessageHandler[] = [];
  private closed = false;

  constructor(
    private readonly serverUrl: string,
    private readonly token: string,
  ) {}

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
  }

  send(msg: unknown) {
    const str = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(str);
    } else {
      this.messageQueue.push(str);
    }
  }

  connect() {
    const url = `${this.serverUrl}?type=agent&token=${encodeURIComponent(this.token)}`;
    console.log(`[gateway] Connecting to ${this.serverUrl}...`);
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log("[gateway] Connected to AgentVerse server");
      this.reconnectDelay = 1000;
      // flush queued messages
      for (const msg of this.messageQueue) this.ws!.send(msg);
      this.messageQueue = [];
      // start heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.send({ type: "heartbeat" });
      }, 30_000);
    });

    this.ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      for (const h of this.handlers) h(msg);
    });

    this.ws.on("close", () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (!this.closed) {
        console.log(`[gateway] Disconnected. Reconnecting in ${this.reconnectDelay / 1000}s...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
      }
    });

    this.ws.on("error", (err) => {
      console.error("[gateway] WebSocket error:", err.message);
    });
  }

  close() {
    this.closed = true;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.ws?.close();
  }
}
