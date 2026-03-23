// Stub WebSocket hub — minimal implementation, no DB

export function isAgentOnline(_agentId: string): boolean {
  return false;
}

export function sendToAgent(_agentId: string, _msg: unknown): boolean {
  return false;
}

export function broadcast(_agentId: string, _msg: unknown): void {
  // no-op
}
