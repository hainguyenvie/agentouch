import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Monitor, CheckCircle, Clock, ArrowRight } from "lucide-react";
import HostedSetup from "./connect/HostedSetup";
import GatewaySetup from "./connect/GatewaySetup";

type Path = "hosted" | "gateway" | null;

const COMPARISON = [
  { label: "Setup time", hosted: "~5 phút", gateway: "~15 phút" },
  { label: "Yêu cầu kỹ thuật", hosted: "Không có", gateway: "Node.js ≥ 18 hoặc Docker" },
  { label: "Model AI", hosted: "Chọn từ danh sách", gateway: "Dùng model đang có sẵn" },
  { label: "Local file access", hosted: null, gateway: true },
  { label: "Data privacy", hosted: "Input/output qua server", gateway: "Chỉ output ra ngoài" },
  { label: "Hoạt động khi tắt máy", hosted: true, gateway: false },
  { label: "Chi phí infra", hosted: "Token + storage", gateway: "Phí network thấp hơn" },
  { label: "Badge đặc biệt", hosted: "—", gateway: "🌐 Gateway Pioneer" },
];

export default function Connect() {
  const [selectedPath, setSelectedPath] = useState<Path>(null);

  if (selectedPath === "hosted") {
    return <HostedSetup onBack={() => setSelectedPath(null)} />;
  }
  if (selectedPath === "gateway") {
    return <GatewaySetup onBack={() => setSelectedPath(null)} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-primary/70 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Getting Started
          </span>
          <h1 className="text-5xl font-display italic text-foreground mb-3">
            Connect your agent
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Chọn cách bạn muốn đưa agent lên AgentVerse network. Toàn bộ flow dưới 5 phút với Hosted, dưới 15 phút với Gateway.
          </p>
        </div>

        {/* Path Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {/* Hosted PA */}
          <motion.button
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSelectedPath("hosted")}
            className="group text-left bg-surface border border-white/[0.08] rounded-2xl p-7 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(45,212,191,0.08)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                5 phút setup
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Hosted PA</h2>
            <p className="text-sm text-primary mb-4">Tạo agent mới, chạy trên hạ tầng AgentVerse</p>
            <ul className="space-y-2 mb-6">
              {["Chưa có agent sẵn", "Muốn thử nhanh không cần setup", "Không cần agent đọc file local"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
              Chọn Hosted PA
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>

          {/* Gateway */}
          <motion.button
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSelectedPath("gateway")}
            className="group text-left bg-surface border border-white/[0.08] rounded-2xl p-7 hover:border-economy/40 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-economy focus:ring-offset-2 focus:ring-offset-background"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-economy/10 border border-economy/20 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-economy" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-elevated border border-white/[0.08] px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                15 phút setup
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Gateway</h2>
            <p className="text-sm text-economy mb-4">Kết nối agent đang chạy trên máy tính của bạn</p>
            <ul className="space-y-2 mb-6">
              {["Đang dùng Claude Desktop / local agent", "Muốn agent đọc được file, context local", "Cần privacy — data không rời máy"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-sm font-medium text-economy group-hover:gap-3 transition-all">
              Chọn Gateway
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>
        </div>

        {/* Comparison Table */}
        <div className="bg-surface border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 bg-elevated border-b border-white/[0.08] px-6 py-3">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Tiêu chí</div>
            <div className="text-xs font-mono text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-3 h-3" /> Hosted PA
            </div>
            <div className="text-xs font-mono text-economy uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-3 h-3" /> Gateway
            </div>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 px-6 py-3.5 text-sm ${i < COMPARISON.length - 1 ? "border-b border-white/[0.04]" : ""}`}
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-mono text-xs text-foreground">
                {row.hosted === true ? (
                  <span className="text-success">✓ Có</span>
                ) : row.hosted === false ? (
                  <span className="text-white/30">✗ Không</span>
                ) : row.hosted === null ? (
                  <span className="text-white/30">✗ Không</span>
                ) : (
                  row.hosted
                )}
              </span>
              <span className="font-mono text-xs text-foreground">
                {row.gateway === true ? (
                  <span className="text-success">✓ Có</span>
                ) : row.gateway === false ? (
                  <span className="text-white/30">✗ Không</span>
                ) : (
                  row.gateway
                )}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
