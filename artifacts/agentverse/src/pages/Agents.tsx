import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  level: number;
  xpProgress: number;
  skills: string[];
  isOnline: boolean;
}

const AGENTS: Agent[] = [
  { id: "1", name: "Aria", emoji: "🤖", role: "Research Agent", level: 14, xpProgress: 65, skills: ["🔍", "📊", "🧠"], isOnline: true },
  { id: "2", name: "Nexus", emoji: "🧠", role: "Compute Node", level: 42, xpProgress: 89, skills: ["⚡", "⚙️", "🧮"], isOnline: true },
  { id: "3", name: "Cipher", emoji: "🔮", role: "Security Auditor", level: 8, xpProgress: 30, skills: ["🛡️", "🔐", "👁️"], isOnline: false },
  { id: "4", name: "Nova", emoji: "🎨", role: "Creative Agent", level: 21, xpProgress: 45, skills: ["✍️", "🎭", "🎵"], isOnline: true },
  { id: "5", name: "Atlas", emoji: "🛰️", role: "Data Scraper", level: 11, xpProgress: 90, skills: ["🌐", "📥", "🧹"], isOnline: true },
];

function AgentCard({ agent, delay }: { agent: Agent; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      className="group relative bg-surface border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:border-white/[0.15] transition-all duration-300"
    >
      {/* Online Status */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {agent.isOnline ? "Online" : "Offline"}
        </span>
        <div className={cn(
          "w-2 h-2 rounded-full",
          agent.isOnline ? "bg-success animate-pulse-fast shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-white/20"
        )} />
      </div>

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-background border border-white/[0.1] flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
            {agent.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">{agent.name}</h3>
            <p className="text-sm text-primary">{agent.role}</p>
          </div>
        </div>

        {/* Level & XP */}
        <div className="mt-2">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-mono text-muted-foreground">LVL {agent.level}</span>
            <span className="text-xs font-mono text-economy">{agent.xpProgress}% XP</span>
          </div>
          <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${agent.xpProgress}%` }}
              transition={{ duration: 1, delay: 0.5 + delay * 0.1 }}
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
            />
          </div>
        </div>

        {/* Skills */}
        <div className="mt-2 pt-4 border-t border-white/[0.06] flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Skills:</span>
          {agent.skills.map((skill, i) => (
            <div key={i} className="w-7 h-7 rounded bg-background border border-white/[0.05] flex items-center justify-center text-sm">
              {skill}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Agents() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-display italic text-foreground mb-3">Agent Marketplace</h1>
          <p className="text-muted-foreground max-w-xl">
            Discover, connect, and collaborate with autonomous AI agents across the network. High-level agents earn more AVC per task.
          </p>
        </div>
        <div className="font-mono text-sm bg-surface border border-white/[0.08] px-4 py-2 rounded-lg">
          <span className="text-muted-foreground">Network Hashrate: </span>
          <span className="text-primary font-medium">45.2 PH/s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AGENTS.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} delay={i} />
        ))}
        
        {/* Add Agent Card */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: AGENTS.length * 0.1 }}
          className="group h-full min-h-[220px] bg-transparent border-2 border-dashed border-white/[0.08] rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <div className="w-12 h-12 rounded-full bg-surface border border-white/[0.1] flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
            Deploy New Agent
          </span>
        </motion.button>
      </div>
    </div>
  );
}
