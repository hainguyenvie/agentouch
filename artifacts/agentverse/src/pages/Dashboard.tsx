import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Activity, Zap, Cpu, Server, ShieldCheck } from "lucide-react";
import { useLogStream, type LogItem } from "@/hooks/use-simulation";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

const LogLine = ({ log }: { log: LogItem }) => {
  const time = format(log.timestamp, "HH:mm:ss");
  
  const getColorClass = () => {
    switch(log.type) {
      case "SYSTEM": return "text-muted-foreground";
      case "TRANSFER": return "text-primary";
      case "TASK": return "text-foreground";
      case "ERROR": return "text-danger";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words flex gap-3 group hover:bg-white/[0.02] px-2 py-1 rounded"
    >
      <span className="text-white/20 shrink-0 select-none">[{time}]</span>
      <span className={getColorClass()}>
        {log.type === "SYSTEM" && "> "}
        {log.message}
        {log.amount && (
          <span className="text-economy ml-2 font-semibold select-all">
            {formatCurrency(log.amount)} AVC
          </span>
        )}
      </span>
    </motion.div>
  );
};

export default function Dashboard() {
  const logs = useLogStream();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-5xl font-display italic text-foreground mb-2">Control Dashboard</h1>
        <p className="text-muted-foreground">Monitor your gateway and local agent connectivity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Gateway Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
            {/* Glowing accent border top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                <Server className="w-5 h-5 text-primary" />
                Gateway Node
              </h2>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-success/10 border border-success/20 rounded text-xs font-mono text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-fast" />
                SYNCED
              </div>
            </div>

            <div className="space-y-6 relative">
              {/* Abstract Connection Visualization */}
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground px-2 py-4 bg-background rounded-lg border border-white/[0.05]">
                <div className="flex flex-col items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  <span>LOCAL</span>
                </div>
                <div className="flex-1 flex items-center px-2">
                  <div className="h-px w-full bg-white/[0.1] relative">
                    <motion.div 
                      animate={{ x: ["0%", "100%"] }} 
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-[2px] bg-primary blur-[1px]"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="text-primary">GATEWAY</span>
                </div>
                <div className="flex-1 flex items-center px-2">
                  <div className="h-px w-full bg-white/[0.1] relative">
                    <motion.div 
                      animate={{ x: ["100%", "0%"] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-[2px] bg-economy blur-[1px]"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Zap className="w-5 h-5 text-economy" />
                  <span className="text-economy">NETWORK</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background border border-white/[0.04] rounded-xl p-4">
                  <div className="text-sm text-muted-foreground mb-1">Queued Tasks</div>
                  <div className="text-2xl font-display text-foreground">3</div>
                  <div className="text-xs text-success mt-1">Ready for compute</div>
                </div>
                <div className="bg-background border border-economy/20 rounded-xl p-4 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]">
                  <div className="text-sm text-economy/80 mb-1">Earned Offline</div>
                  <div className="text-2xl font-mono text-economy font-semibold">47.00</div>
                  <div className="text-xs text-economy/60 mt-1">AVC credited</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/[0.08] rounded-2xl p-6">
             <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground mb-4">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                Security Status
              </h2>
              <ul className="space-y-3 font-mono text-sm">
                <li className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                  <span className="text-muted-foreground">Encryption</span>
                  <span className="text-success">AES-256-GCM</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/[0.04] pb-2">
                  <span className="text-muted-foreground">Keys Rotated</span>
                  <span className="text-foreground">2 hrs ago</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Threat Level</span>
                  <span className="text-success">Low (0 alerts)</span>
                </li>
              </ul>
          </div>
        </div>

        {/* Right Column - A2A Communication Log */}
        <div className="lg:col-span-2 h-[600px] flex flex-col bg-[#020308] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Mac-like terminal header */}
          <div className="h-12 bg-surface/80 border-b border-white/[0.08] flex items-center px-4 shrink-0">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Terminal className="w-3.5 h-3.5" />
              A2A_COMM_LOG
            </div>
          </div>

          {/* Log content */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col-reverse">
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <LogLine key={log.id} log={log} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
