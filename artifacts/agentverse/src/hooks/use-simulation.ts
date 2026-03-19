import { useState, useEffect } from "react";

export type AgentStatus = "success" | "processing" | "failed";

export interface FeedItem {
  id: string;
  agentName: string;
  agentEmoji: string;
  task: string;
  amount: number;
  timestamp: Date;
  status: AgentStatus;
}

export interface LogItem {
  id: string;
  timestamp: Date;
  message: string;
  type: "TRANSFER" | "SYSTEM" | "TASK" | "ERROR";
  amount?: number;
}

const EMOJIS = ["🤖", "🧠", "⚡", "🔮", "🎨", "🔬", "🛰️", "⚙️"];
const NAMES = ["Aria", "Nexus", "Cipher", "Nova", "Atlas", "Echo", "Flux", "Omen"];
const TASKS = [
  "Processed image recognition dataset",
  "Optimized trading algorithm",
  "Generated 3D asset variants",
  "Summarized quarterly reports",
  "Executed smart contract arbitrage",
  "Translated video stream realtime",
  "Trained localized LLM module",
  "Scraped competitor pricing data"
];

// Generates a random realistic feed item
function generateFeedItem(): FeedItem {
  const isSuccess = Math.random() > 0.15;
  return {
    id: Math.random().toString(36).substring(2, 9),
    agentEmoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    agentName: NAMES[Math.floor(Math.random() * NAMES.length)],
    task: TASKS[Math.floor(Math.random() * TASKS.length)],
    amount: Number((Math.random() * 50 + 0.5).toFixed(2)),
    timestamp: new Date(),
    status: isSuccess ? "success" : (Math.random() > 0.5 ? "processing" : "failed"),
  };
}

export function useLiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(() => 
    Array.from({ length: 5 }).map((_, i) => ({
      ...generateFeedItem(),
      timestamp: new Date(Date.now() - i * 5000),
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => {
        const newItems = [generateFeedItem(), ...prev];
        return newItems.slice(0, 15); // Keep last 15
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return items;
}

export function useLogStream() {
  const [logs, setLogs] = useState<LogItem[]>([]);

  useEffect(() => {
    // Initial logs
    setLogs([
      { id: '1', timestamp: new Date(Date.now() - 10000), message: "Gateway initialized. Establishing secure link...", type: "SYSTEM" },
      { id: '2', timestamp: new Date(Date.now() - 8000), message: "Connection to AgentVerse cluster confirmed.", type: "SYSTEM" },
    ]);

    const interval = setInterval(() => {
      const typeRand = Math.random();
      let type: LogItem["type"] = "TASK";
      let msg = "";
      let amt = 0;

      const agent1 = NAMES[Math.floor(Math.random() * NAMES.length)];
      const agent2 = NAMES[Math.floor(Math.random() * NAMES.length)];

      if (typeRand > 0.7) {
        type = "TRANSFER";
        amt = Number((Math.random() * 10).toFixed(2));
        msg = `A2A_TRANSFER: 🤖 ${agent1} -> 🧠 ${agent2}`;
      } else if (typeRand > 0.9) {
        type = "ERROR";
        msg = `TIMEOUT_EXCEPTION: Agent ${agent1} failed to respond within threshold.`;
      } else {
        type = "TASK";
        amt = Number((Math.random() * 20).toFixed(2));
        msg = `TASK_COMPLETE: ${agent1} finalized compute job.`;
      }

      const newLog: LogItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date(),
        message: msg,
        type,
        amount: amt > 0 ? amt : undefined
      };

      setLogs((prev) => [...prev.slice(-30), newLog]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return logs;
}
