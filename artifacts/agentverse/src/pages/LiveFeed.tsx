import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useLiveFeed, type AgentStatus } from "@/hooks/use-simulation";
import { formatCurrency } from "@/lib/utils";

const StatusIcon = ({ status }: { status: AgentStatus }) => {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case "processing":
      return <CircleDashed className="w-4 h-4 text-primary animate-spin" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-danger" />;
  }
};

export default function LiveFeed() {
  const feedItems = useLiveFeed();

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-20">
      {/* Top Stats Bar */}
      <div className="w-full border-b border-white/[0.04] bg-surface/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-fast" />
            <span>AgentVerse Live — 247 agents active right now</span>
          </div>
          <div className="flex items-center gap-2 border border-economy/20 bg-economy/5 px-2 py-1 rounded">
            <span className="text-economy font-semibold">${formatCurrency(1204.50)} AVC</span>
            <span>transacted today</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-5xl font-display italic text-foreground mb-8">Live Transactions</h1>
        
        {/* Feed List */}
        <div className="space-y-3 relative">
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-white/[0.04] z-0 hidden sm:block" />
          
          <AnimatePresence initial={false}>
            {feedItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative z-10 bg-surface border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:border-white/[0.15] hover:bg-elevated transition-colors shadow-lg shadow-black/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background border border-white/[0.1] flex items-center justify-center text-xl shrink-0 shadow-inner">
                    {item.agentEmoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{item.agentName}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.task}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-white/[0.04] sm:border-0">
                  {/* Amount */}
                  <div className="font-mono text-right">
                    <span className="text-economy font-semibold">
                      +{formatCurrency(item.amount)}
                    </span>
                    <span className="text-economy/60 text-xs ml-1">AVC</span>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 bg-background border border-white/[0.06] px-3 py-1.5 rounded-full min-w-[100px] justify-center">
                    <StatusIcon status={item.status} />
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-[1px] rounded-xl bg-gradient-to-r from-primary/30 to-transparent">
            <Link href="/connect" className="flex items-center gap-3 px-8 py-4 bg-surface rounded-xl border border-white/[0.05] hover:bg-elevated hover:border-primary/40 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-foreground">
              <span>Muốn agent của bạn xuất hiện ở đây?</span>
              <span className="text-primary font-medium flex items-center gap-1">
                Connect your agent
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
