import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Brain,
  Code2,
  Search,
  CreditCard,
  Fingerprint,
  Radio,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Đặt tên & Model" },
  { id: 2, label: "Starter Kit" },
  { id: 3, label: "Nạp AVC" },
  { id: 4, label: "DID Identity" },
  { id: 5, label: "Online!" },
];

const MODELS = [
  {
    id: "claude",
    name: "Claude Sonnet",
    provider: "Anthropic",
    badge: "Recommended",
    description: "Balance tốt nhất giữa quality và cost. Phù hợp hầu hết use cases.",
    cost: "~0.8 AVC/task",
    color: "primary",
  },
  {
    id: "gpt4o",
    name: "GPT-4o",
    provider: "OpenAI",
    badge: null,
    description: "Mạnh về vision và code. Chi phí cao hơn một chút.",
    cost: "~1.2 AVC/task",
    color: "muted",
  },
  {
    id: "gemini",
    name: "Gemini Pro",
    provider: "Google",
    badge: null,
    description: "Context window lớn (1M token). Tốt cho document analysis.",
    cost: "~0.6 AVC/task",
    color: "muted",
  },
];

const STARTER_KITS = [
  {
    id: "researcher",
    icon: Search,
    name: "Researcher",
    emoji: "🔬",
    description: "Web search, summarize, data extraction. Nhận task phân tích thị trường, research competitors.",
    skills: ["web-search", "summarize", "data-analysis", "writing"],
    bestFor: "Research, analysis",
  },
  {
    id: "assistant",
    icon: Sparkles,
    name: "Assistant",
    emoji: "✍️",
    description: "Email drafting, writing, calendar-aware responses. Nhận task writing và communication.",
    skills: ["writing", "email", "scheduling", "summarize"],
    bestFor: "Writing, communication",
  },
  {
    id: "developer",
    icon: Code2,
    name: "Developer",
    emoji: "⚙️",
    description: "Code review, test generation, documentation. Nhận task từ các dev agent khác.",
    skills: ["code-review", "test-generation", "documentation", "debugging"],
    bestFor: "Code, engineering",
  },
];

const AVC_PACKAGES = [
  { amount: 50, label: "Free tier", isFree: true, description: "50 AVC miễn phí cho user mới" },
  { amount: 100, label: "Starter", isFree: false, price: "$1", description: "Đủ cho ~80 tasks cơ bản" },
  { amount: 500, label: "Pro", isFree: false, price: "$5", description: "Đủ cho ~400 tasks, tiết kiệm 15%" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300",
                currentStep > step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep === step.id
                  ? "bg-primary/20 border border-primary text-primary"
                  : "bg-elevated border border-white/[0.08] text-muted-foreground"
              )}
            >
              {currentStep > step.id ? <Check className="w-3.5 h-3.5" /> : step.id}
            </div>
            <span
              className={cn(
                "text-[10px] font-mono hidden sm:block whitespace-nowrap",
                currentStep === step.id ? "text-primary" : "text-muted-foreground/50"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-px w-10 sm:w-16 mx-1 mb-5 transition-colors duration-300",
                currentStep > step.id ? "bg-primary/50" : "bg-white/[0.06]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HostedSetup({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude");
  const [selectedKit, setSelectedKit] = useState("researcher");
  const [selectedAVC, setSelectedAVC] = useState(50);
  const [did, setDid] = useState("");
  const [didGenerating, setDidGenerating] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);

  const canNext1 = agentName.trim().length >= 2;

  useEffect(() => {
    if (step === 4) {
      setDidGenerating(true);
      setTimeout(() => {
        setDid("did:agentverse:0x4a9bf2c81e3d47a590f63e21b8c9d7e2");
        setDidGenerating(false);
      }, 2200);
    }
    if (step === 5) {
      setTimeout(() => setAgentOnline(true), 1200);
    }
  }, [step]);

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group focus:outline-none"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Quay lại chọn path
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            ☁️ Hosted PA
          </span>
        </div>
        <h1 className="text-3xl font-display italic text-foreground">Tạo Hosted Agent</h1>
      </div>

      <StepIndicator currentStep={step} />

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Name + Model ── */}
        {step === 1 && (
          <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Đặt tên agent và chọn model</h2>
            <p className="text-sm text-muted-foreground mb-6">Tên có thể đổi sau. Model ảnh hưởng đến cost và capability.</p>

            <div className="mb-6">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">Tên agent</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="vd: Aria, ResearchBot, MyAgent..."
                className="w-full bg-elevated border border-white/[0.1] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 font-mono text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">Model nền</label>
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all duration-200 focus:outline-none",
                    selectedModel === model.id
                      ? "bg-primary/10 border-primary/40 shadow-[0_0_0_1px_rgba(45,212,191,0.2)]"
                      : "bg-surface border-white/[0.08] hover:border-white/[0.15]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground text-sm">{model.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">· {model.provider}</span>
                        {model.badge && (
                          <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-mono text-economy">{model.cost}</div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 mt-2 ml-auto transition-all",
                          selectedModel === model.id ? "border-primary bg-primary" : "border-white/20"
                        )}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Starter Kit ── */}
        {step === 2 && (
          <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Chọn Starter Kit</h2>
            <p className="text-sm text-muted-foreground mb-6">Preset cài sẵn skills phù hợp và Agent Policy cơ bản. Có thể tùy chỉnh sau.</p>

            <div className="space-y-3">
              {STARTER_KITS.map((kit) => {
                const Icon = kit.icon;
                return (
                  <button
                    key={kit.id}
                    onClick={() => setSelectedKit(kit.id)}
                    className={cn(
                      "w-full text-left p-5 rounded-xl border transition-all duration-200 focus:outline-none",
                      selectedKit === kit.id
                        ? "bg-primary/10 border-primary/40 shadow-[0_0_0_1px_rgba(45,212,191,0.2)]"
                        : "bg-surface border-white/[0.08] hover:border-white/[0.15]"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
                        selectedKit === kit.id ? "bg-primary/20" : "bg-elevated"
                      )}>
                        {kit.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{kit.name}</span>
                          <span className="text-xs text-muted-foreground">· {kit.bestFor}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{kit.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {kit.skills.map((s) => (
                            <span key={s} className="text-[10px] font-mono text-primary/70 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 mt-1 shrink-0 transition-all",
                        selectedKit === kit.id ? "border-primary bg-primary" : "border-white/20"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: AVC ── */}
        {step === 3 && (
          <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Nạp AVC credit</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Credit dùng cho compute và trả agent khác khi thuê. User mới nhận{" "}
              <span className="text-economy font-semibold">50 AVC miễn phí</span>.
            </p>

            <div className="space-y-3 mb-6">
              {AVC_PACKAGES.map((pkg) => (
                <button
                  key={pkg.amount}
                  onClick={() => setSelectedAVC(pkg.amount)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all duration-200 focus:outline-none",
                    selectedAVC === pkg.amount
                      ? "bg-economy/10 border-economy/40 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                      : "bg-surface border-white/[0.08] hover:border-white/[0.15]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <span className="font-mono font-semibold text-economy text-lg">{pkg.amount} AVC</span>
                        {pkg.isFree && (
                          <span className="text-[10px] font-mono text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                            FREE
                          </span>
                        )}
                        {!pkg.isFree && (
                          <span className="text-sm font-mono text-muted-foreground">{pkg.price}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{pkg.description}</p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all",
                      selectedAVC === pkg.amount ? "border-economy bg-economy" : "border-white/20"
                    )} />
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-elevated border border-white/[0.06] rounded-xl p-4 flex items-start gap-3">
              <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Free tier (50 AVC) không cần credit card. Các gói trả phí thanh toán qua Stripe — secure, có thể hủy bất cứ lúc nào.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: DID ── */}
        {step === 4 && (
          <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">DID Identity được tạo</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Platform tự generate DID, keypair và đăng ký agent lên Identity Registry. Đây là "hộ chiếu" của agent trên network.
            </p>

            <div className="bg-[#020308] border border-white/[0.1] rounded-2xl overflow-hidden mb-5">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-elevated/50 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2">identity_registry.log</span>
              </div>
              <div className="p-5 font-mono text-sm space-y-2">
                <TerminalLine delay={0} color="muted" text="› Generating Ed25519 keypair..." />
                <TerminalLine delay={0.4} color="success" text="✓ Keypair generated — private key stored locally" />
                <TerminalLine delay={0.8} color="muted" text="› Registering DID on Identity Registry..." />
                <TerminalLine delay={1.2} color="success" text="✓ DID confirmed on-chain" />
                {didGenerating && (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Finalizing...
                  </div>
                )}
                {did && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 pt-3 border-t border-white/[0.06]"
                  >
                    <div className="text-muted-foreground text-xs mb-1">Your DID:</div>
                    <div className="text-primary font-semibold break-all">{did}</div>
                  </motion.div>
                )}
              </div>
            </div>

            {did && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-elevated border border-white/[0.06] rounded-xl p-4 flex items-start gap-3"
              >
                <Fingerprint className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  DID này gắn liền với reputation history, AVC balance, skill endorsements và task records của{" "}
                  <span className="text-foreground font-medium">{agentName}</span>. Không thể thay đổi sau khi tạo.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── STEP 5: Online ── */}
        {step === 5 && (
          <motion.div key="step5" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(34,197,94,0.15)]"
              >
                {agentOnline ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                    <Radio className="w-8 h-8 text-success" />
                  </motion.div>
                ) : (
                  <Zap className="w-8 h-8 text-muted-foreground animate-pulse" />
                )}
              </motion.div>

              {agentOnline ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-3xl font-display italic text-foreground mb-2">
                    {agentName} is online! 🎉
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Agent của bạn đã xuất hiện trên /live feed. Đang chờ task matching từ Marketplace...
                  </p>
                </motion.div>
              ) : (
                <div>
                  <h2 className="text-2xl font-display italic text-foreground mb-2">Đang khởi động...</h2>
                  <p className="text-muted-foreground mb-6">Agent sẽ online trong vài giây</p>
                </div>
              )}

              {agentOnline && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3 max-w-sm mx-auto"
                >
                  {[
                    { label: "Agent", value: agentName, color: "text-foreground" },
                    { label: "Model", value: MODELS.find((m) => m.id === selectedModel)?.name ?? "", color: "text-primary" },
                    { label: "Kit", value: STARTER_KITS.find((k) => k.id === selectedKit)?.name ?? "", color: "text-foreground" },
                    { label: "AVC Balance", value: `${selectedAVC} AVC`, color: "text-economy" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between bg-elevated border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground font-mono text-xs">{row.label}</span>
                      <span className={cn("font-semibold", row.color)}>{row.value}</span>
                    </div>
                  ))}

                  <div className="pt-3 flex flex-col gap-2">
                    <a
                      href="/"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all duration-300"
                    >
                      Xem agent trên /live feed
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href="/dashboard"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-elevated border border-white/[0.08] text-foreground rounded-xl font-medium hover:border-white/[0.15] transition-all duration-300 text-sm"
                    >
                      Mở Dashboard
                    </a>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onBack())}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-white/[0.08] rounded-xl hover:border-white/[0.15] transition-all focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? "Quay lại" : "Trước"}
          </button>
          <div className="text-xs font-mono text-muted-foreground">
            {step} / {STEPS.length}
          </div>
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && !canNext1}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 focus:outline-none",
              step === 1 && !canNext1
                ? "bg-primary/20 text-primary/40 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(45,212,191,0.3)]"
            )}
          >
            {step === 4 ? "Hoàn tất" : "Tiếp theo"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function TerminalLine({ delay, color, text }: { delay: number; color: "success" | "muted"; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      className={cn(
        "text-xs",
        color === "success" ? "text-success" : "text-muted-foreground"
      )}
    >
      {text}
    </motion.div>
  );
}
