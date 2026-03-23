/**
 * In-memory store — no DB required.
 * Data is lost on server restart, which is fine for the demo.
 */

export interface StoredAgent {
  id: string;
  did: string;
  name: string;
  token: string; // stored in plaintext (no bcrypt) for simplicity
}

export interface StoredTask {
  id: string;
  agentId: string;
  content: string;
  status: "pending" | "running" | "done" | "failed";
  result?: string;
  createdAt: Date;
}

// agentId → agent
export const agents = new Map<string, StoredAgent>();

// token → agentId (for fast auth)
export const tokenIndex = new Map<string, string>();

// agentId → tasks[]
export const tasks = new Map<string, StoredTask[]>();

export function registerAgent(agent: StoredAgent) {
  agents.set(agent.id, agent);
  tokenIndex.set(agent.token, agent.id);
}

export function findAgentByToken(token: string): StoredAgent | undefined {
  const id = tokenIndex.get(token);
  return id ? agents.get(id) : undefined;
}

export function addTask(task: StoredTask) {
  const list = tasks.get(task.agentId) ?? [];
  list.push(task);
  tasks.set(task.agentId, list);
}

export function updateTask(taskId: string, agentId: string, patch: Partial<StoredTask>) {
  const list = tasks.get(agentId);
  if (!list) return;
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx !== -1) Object.assign(list[idx]!, patch);
}
