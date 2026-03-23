/**
 * OpenClaw bridge — talks to OpenClaw's OpenAI-compatible local API.
 *
 * OpenClaw exposes: POST http://localhost:7331/v1/chat/completions
 * (same interface as Ollama, LM Studio, OpenAI SDK)
 */

export interface BridgeEvents {
  onTaskStarted: (taskId: string) => void;
  onStreamChunk: (taskId: string, delta: string, done: boolean) => void;
  onTaskResult: (taskId: string, status: "done" | "failed", content: string) => void;
  onEvent: (taskId: string, eventType: string, data: unknown) => void;
}

export class OpenClawBridge {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly token: string | undefined,
    private readonly events: BridgeEvents,
  ) {}

  async runTask(taskId: string, content: string) {
    this.events.onTaskStarted(taskId);
    this.events.onEvent(taskId, "task_started", { content });

    let fullContent = "";

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content }],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenClaw HTTP ${response.status}: ${await response.text()}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6)) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullContent += delta;
              this.events.onStreamChunk(taskId, delta, false);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      this.events.onStreamChunk(taskId, "", true);
      this.events.onTaskResult(taskId, "done", fullContent);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[gateway] Task ${taskId} failed:`, message);
      this.events.onEvent(taskId, "task_error", { error: message });
      this.events.onTaskResult(taskId, "failed", message);
    }
  }
}
