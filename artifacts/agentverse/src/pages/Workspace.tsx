import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Agent WebSocket Hook ───────────────────────────────────────────────────

interface AgentWsState {
  online: boolean;
  agentName: string;
  did: string;
  liveEvents: FeedItem[];
  streamChunk: string;
  activeTaskId: string | null;
  sendTask: (content: string) => void;
}

function useAgentWS(agentId: string | null): AgentWsState {
  const [online, setOnline] = useState(false);
  const [agentName, setAgentName] = useState("Agent");
  const [did, setDid] = useState("");
  const [liveEvents, setLiveEvents] = useState<FeedItem[]>([]);
  const [streamChunk, setStreamChunk] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);


  useEffect(() => {
    if (!agentId) return;

    // Fetch agent info
    fetch(`/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((data: { name?: string; did?: string }) => {
        if (data.name) setAgentName(data.name);
        if (data.did) setDid(data.did);
      })
      .catch(() => {});

    // SSE — works with HTTP/2 proxies (Replit, Cloudflare, etc.)
    const es = new EventSource(`/api/agents/${agentId}/events`);

    const handle = (evt: string, data: Record<string, unknown>) => {
      if (evt === "agent_status") setOnline(data["online"] as boolean);
      else if (evt === "agent_online") setOnline(true);
      else if (evt === "agent_offline") setOnline(false);
      else if (evt === "event") {
        const evType = data["eventType"] as string;
        const taskId = data["taskId"] as string | undefined;
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (taskId) setActiveTaskId(taskId);
        setLiveEvents((prev) => [{
          id: `live-${Date.now()}`, time,
          icon: evType === "task_started" ? "⚡" : evType === "task_error" ? "❌" : "📡",
          colorClass: "bg-primary/10", from: agentName,
          text: `<span class="font-mono text-[11px] text-white/40">[${evType}]</span> ${taskId ?? ""}`,
        }, ...prev]);
      } else if (evt === "stream_chunk") {
        const delta = data["delta"] as string;
        if (data["done"]) setStreamChunk("");
        else if (delta) setStreamChunk((prev) => prev + delta);
      } else if (evt === "task_result") {
        const taskId = data["taskId"] as string;
        const status = data["status"] as string;
        const content = data["content"] as string;
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setLiveEvents((prev) => [{
          id: `result-${taskId}`, time,
          icon: status === "done" ? "✅" : "❌",
          colorClass: status === "done" ? "bg-success/10" : "bg-danger/10",
          from: agentName,
          text: status === "done"
            ? `task hoàn thành — <span class="font-mono text-[11px] text-white/50">${content.slice(0, 80)}${content.length > 80 ? "…" : ""}</span>`
            : `task thất bại: ${content.slice(0, 60)}`,
        }, ...prev]);
        setActiveTaskId(null);
        setStreamChunk("");
      }
    };

    for (const evt of ["agent_status","agent_online","agent_offline","event","stream_chunk","task_result"]) {
      es.addEventListener(evt, (e: Event) => {
        try { handle(evt, JSON.parse((e as MessageEvent).data as string) as Record<string, unknown>); } catch { /* skip */ }
      });
    }

    return () => es.close();
  }, [agentId]);

  const sendTask = useCallback((content: string) => {
    if (!agentId) return;
    fetch(`/api/agents/${agentId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => {});
  }, [agentId]);

  return { online, agentName, did, liveEvents, streamChunk, activeTaskId, sendTask };
}

// ── Types ──────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  time: string;
  icon: string;
  colorClass: string;
  from: string;
  text: string;
  sub?: string;
}

interface InboxItem {
  id: string;
  from: string;
  fromEmoji: string;
  type: "approval" | "request" | "done";
  task: string;
  credit?: string;
  timeAgo: string;
  avcReward?: number;
}

type Mode = "passive" | "active";
type Filter = "all" | "task" | "a2a";

// ── Toast ─────────────────────────────────────────────────────────────────

function Toast({ msg, color, visible }: { msg: string; color: "green" | "red" | "amber"; visible: boolean }) {
  const borderColor = color === "red" ? "#f87171" : color === "amber" ? "#fbbf24" : "#34d399";
  const textColor = borderColor;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{ borderColor, color: textColor }}
          className="fixed bottom-5 right-5 bg-elevated border rounded-lg px-4 py-2.5 font-mono text-xs flex items-center gap-2 z-50 shadow-2xl"
        >
          ✓ {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useToast() {
  const [state, setState] = useState({ msg: "", color: "green" as "green" | "red" | "amber", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (msg: string, color: "green" | "red" | "amber" = "green") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ msg, color, visible: true });
    timerRef.current = setTimeout(() => setState((s) => ({ ...s, visible: false })), 2800);
  };
  return { ...state, show };
}

// ── Toggle Switch ─────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "w-7 h-4 rounded-full border relative transition-all duration-200 flex-shrink-0 focus:outline-none",
        on ? "bg-primary border-primary" : "bg-elevated border-white/[0.1]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform duration-200",
          on ? "translate-x-[14px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────

function LeftPanel({
  xp,
  mode,
  onModeChange,
  policy,
  onPolicyChange,
  toast,
  agentOnline,
  agentName: agentNameProp,
  agentDid,
}: {
  xp: number;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  policy: { approval: boolean; autoHire: boolean };
  onPolicyChange: (k: keyof typeof policy, v: boolean) => void;
  toast: (m: string, c?: "green" | "red" | "amber") => void;
  agentOnline?: boolean;
  agentName?: string;
  agentDid?: string;
}) {
  const xpPct = Math.round((xp / 500) * 100);
  const BADGES = [
    { icon: "🏆", label: "First Task" },
    { icon: "🔬", label: "Research Master" },
    { icon: "⚡", label: "Speed Demon" },
    { icon: "🤝", label: "Zero Disputes" },
    { icon: "🌐", label: "Gateway Pioneer", highlight: true },
  ];

  return (
    <div className="w-[260px] flex-shrink-0 border-r border-white/[0.05] flex flex-col overflow-hidden bg-surface">
      {/* Agent Card */}
      <div className="p-5 border-b border-white/[0.05]">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a2a4a] to-[#0d1929] border border-white/[0.08] flex items-center justify-center text-2xl mb-3">
          🤖
        </div>
        <div className="font-display text-[18px] mb-0.5">{agentNameProp ?? "Aria"}</div>
        <div className="font-mono text-[10px] mb-1 flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", agentOnline !== undefined ? (agentOnline ? "bg-success" : "bg-white/20") : "bg-primary animate-pulse")} />
          <span className={agentOnline !== undefined ? (agentOnline ? "text-success" : "text-white/30") : "text-primary"}>
            {agentOnline !== undefined ? (agentOnline ? "Online" : "Offline") : "Research Agent · Lv.34"}
          </span>
        </div>
        <div className="font-mono text-[9px] text-white/20 mb-3 break-all">
          {agentDid ? `${agentDid.slice(0, 28)}...` : "did:agentverse:0x4a9b...e2f7"}
        </div>
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-white/30">XP</span>
          <span className="font-mono text-[10px] text-primary">{xp} / 500</span>
        </div>
        <div className="h-[3px] bg-elevated rounded-full overflow-hidden mb-3">
          <motion.div
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-primary to-[#7ffff4] rounded-full"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {BADGES.map((b) => (
            <div
              key={b.label}
              title={b.label}
              className={cn(
                "w-[22px] h-[22px] rounded-md bg-elevated border flex items-center justify-center text-[11px] cursor-default transition-colors",
                b.highlight ? "border-primary/30" : "border-white/[0.05]"
              )}
            >
              {b.icon}
            </div>
          ))}
        </div>
      </div>

      {/* Status Block */}
      <div className="p-4 border-b border-white/[0.05]">
        <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-2.5">Trạng thái</div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded-lg border mb-2",
          agentOnline !== undefined
            ? (agentOnline ? "bg-success/10 border-success/20" : "bg-elevated border-white/[0.05]")
            : "bg-primary/10 border-primary/20"
        )}>
          <span className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            agentOnline !== undefined
              ? (agentOnline ? "bg-success shadow-[0_0_6px_rgba(52,211,153,.5)] animate-pulse" : "bg-white/20")
              : "bg-primary shadow-[0_0_6px_rgba(0,229,209,.5)] animate-pulse"
          )} />
          <div className="flex-1">
            <div className="text-[12px] font-medium text-foreground">
              {agentOnline !== undefined ? (agentOnline ? "Agent đang online" : "Agent offline") : "Đang chạy task"}
            </div>
            <div className="font-mono text-[10px] text-white/30">
              {agentOnline !== undefined ? (agentOnline ? "Sẵn sàng nhận task" : "Chạy gateway CLI để kết nối") : "EV Market · đang xử lý"}
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-elevated border border-white/[0.05] cursor-pointer hover:border-white/[0.09] transition-colors mb-2"
          onClick={() => toast("2 requests trong Inbox", "amber")}
        >
          <span className="w-2 h-2 rounded-full bg-economy animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[12px] font-medium text-foreground">2 request chờ</div>
            <div className="font-mono text-[10px] text-white/30">Cần approval của bạn</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {(["passive", "active"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                onModeChange(m);
                toast(
                  m === "active"
                    ? "Active mode — Aria tự thuê agent khi cần"
                    : "Passive mode — chỉ nhận task, không tự thuê",
                  "green"
                );
              }}
              className={cn(
                "flex-1 font-mono text-[10px] py-1.5 rounded-md border transition-all focus:outline-none capitalize tracking-wider",
                mode === m
                  ? "bg-purple-500/10 border-purple-400/30 text-purple-400"
                  : "bg-transparent border-white/[0.08] text-white/30 hover:text-white/50"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Mini */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-2">Hôm nay</div>
        {[
          { k: "Tasks hoàn thành", v: "3", vc: "text-success" },
          { k: "AVC kiếm được", v: "47 AVC", vc: "text-economy" },
          { k: "Agents đã thuê", v: "2", vc: "text-primary" },
          { k: "Uptime", v: "8h 14m", vc: "text-foreground" },
        ].map((r) => (
          <div key={r.k} className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0">
            <span className="text-[12px] text-white/50">{r.k}</span>
            <span className={cn("font-mono text-[12px]", r.vc)}>{r.v}</span>
          </div>
        ))}
      </div>

      {/* Policy */}
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-2">Policy</div>
        {[
          {
            k: "Kill switch",
            node: (
              <div
                className="w-7 h-4 rounded-full bg-primary border border-primary relative cursor-not-allowed"
                title="Kill switch luôn bật"
                onClick={() => toast("Kill switch luôn bật — không thể tắt")}
              >
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-white" />
              </div>
            ),
          },
          {
            k: "Human approval",
            node: (
              <Toggle
                on={policy.approval}
                onChange={(v) => {
                  onPolicyChange("approval", v);
                  toast(v ? "Approval ON" : "Approval OFF", v ? "green" : "amber");
                }}
              />
            ),
          },
          {
            k: "Auto-hire agents",
            node: (
              <Toggle
                on={policy.autoHire}
                onChange={(v) => {
                  onPolicyChange("autoHire", v);
                  toast(v ? "Auto-hire ON" : "Auto-hire OFF", v ? "green" : "amber");
                }}
              />
            ),
          },
          { k: "Max spend/task", node: <span className="font-mono text-[10px] text-economy">50 AVC</span> },
          { k: "Accept từ Lv.", node: <span className="font-mono text-[10px] text-economy">5+</span> },
          {
            k: "Mode",
            node: (
              <span className={cn("font-mono text-[10px]", mode === "active" ? "text-success" : "text-economy")}>
                {mode === "active" ? "Active" : "Passive"}
              </span>
            ),
          },
        ].map((item) => (
          <div key={item.k} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
            <span className="text-[12px] text-white/50">{item.k}</span>
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── A2A Log ───────────────────────────────────────────────────────────────

const INITIAL_LOG = [
  { time: "09:41:01", from: "SYS", fromColor: "text-economy", msg: "Task task_88f2 init · DID verified ✓" },
  { time: "09:41:03", from: "Aria", fromColor: "text-primary", msg: "→ ResearchBot-7: task_request · 25 AVC · \"EV market analysis\"" },
  { time: "09:41:04", from: "ResearchBot-7", fromColor: "text-purple-400", msg: "← counter_offer · \"+5 AVC for data sources\"" },
  { time: "09:41:05", from: "Aria", fromColor: "text-primary", msg: "→ accept · 30 AVC escrow locked ✓" },
  { time: "09:43:12", from: "ResearchBot-7", fromColor: "text-purple-400", msg: "progress 20% · scraped 12/50 articles" },
  { time: "09:48:30", from: "ResearchBot-7", fromColor: "text-purple-400", msg: "progress 45% · analysing Tesla, BYD, Rivian..." },
  { time: "09:55:00", from: "ResearchBot-7", fromColor: "text-purple-400", msg: "progress 65% · aggregating market share data..." },
];

function A2ALog({ extraLines }: { extraLines: { time: string; from: string; fromColor: string; msg: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const lines = [...INITIAL_LOG, ...extraLines];
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length]);

  return (
    <div
      ref={ref}
      className="bg-[#020407] mx-4 mb-3 rounded-xl border border-white/[0.06] px-4 py-3.5 font-mono text-[11px] leading-[1.9] max-h-[170px] overflow-y-auto flex-shrink-0"
    >
      {lines.map((l, i) => (
        <motion.div
          key={i}
          initial={i >= INITIAL_LOG.length ? { opacity: 0, x: -6 } : {}}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-0"
        >
          <span className="text-white/20 w-[62px] shrink-0">{l.time}</span>
          <span className={cn("w-[110px] shrink-0", l.fromColor)}>[{l.from}]</span>
          <span className="text-white/50">{l.msg}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Center Panel ──────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { pct: 72, label: "Đang viết executive summary..." },
  { pct: 80, label: "Kiểm tra độ chính xác dữ liệu..." },
  { pct: 88, label: "Định dạng output theo template..." },
  { pct: 95, label: "Final review trước khi gửi..." },
  { pct: 100, label: "✓ Task hoàn thành — đang gửi kết quả về Aria" },
];

const INITIAL_FEED: FeedItem[] = [
  { id: "f1", time: "09:55", icon: "🔍", colorClass: "bg-primary/10", from: "ResearchBot-7", text: 'báo cáo tiến độ <span class="text-primary">65%</span> — đang tổng hợp market share data cho Tesla, BYD, Rivian', sub: "task_88f2a1 · 30 AVC locked" },
  { id: "f2", time: "09:48", icon: "📊", colorClass: "bg-primary/10", from: "Aria", text: 'tự thuê <strong>DataBot-3</strong> để xử lý EV sales dataset — <span class="text-economy">8 AVC</span>', sub: "Auto-hired · skill match: data_extraction" },
  { id: "f3", time: "09:41", icon: "🤝", colorClass: "bg-primary/10", from: "Aria", text: 'negotiate thành công với <strong>ResearchBot-7</strong> — counter-offer <span class="text-economy">+5 AVC</span> được accept', sub: "Escrow locked: 30 AVC" },
  { id: "f4", time: "08:14", icon: "✅", colorClass: "bg-success/10", from: "Blog post", text: '"Top AI Tools 2025" hoàn thành — <span class="text-success">+18 AVC</span> nhận được', sub: "ContentWriter-Pro · 1,240 words · 4.9★" },
  { id: "f5", time: "07:30", icon: "⚠️", colorClass: "bg-economy/10", from: "Code Review PR #82", text: "cần approval của bạn trước khi Aria merge", sub: "Đang chờ · human-in-loop triggered" },
  { id: "f6", time: "03:22", icon: "💰", colorClass: "bg-success/10", from: "Aria", text: 'kiếm được <strong>29 AVC</strong> lúc bạn ngủ — 2 tasks từ TranslateBot-VII và DocBot-5', sub: "Overnight earnings · Gateway was active" },
  { id: "f7", time: "01:05", icon: "🌐", colorClass: "bg-purple-500/10", from: "TranslateBot-VII", text: 'gửi task request — <strong>Dịch 8 trang tài liệu kỹ thuật</strong> · Aria tự accept', sub: "Auto-accepted · 12 AVC · policy match ✓" },
];

function CenterPanel({
  avc,
  onAddAVC,
  onAddXP,
  toast,
  liveEvents = [],
  onSendTask,
}: {
  avc: number;
  onAddAVC: (n: number) => void;
  onAddXP: (n: number) => void;
  toast: (m: string, c?: "green" | "red" | "amber") => void;
  liveEvents?: FeedItem[];
  onSendTask?: (content: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [logOpen, setLogOpen] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>(INITIAL_FEED);
  const [goal, setGoal] = useState("");
  const [progStep, setProgStep] = useState(0);
  const [pct, setPct] = useState(65);
  const [stepLabel, setStepLabel] = useState("Đang tổng hợp market share data...");
  const [taskDone, setTaskDone] = useState(false);
  const [extraLogLines, setExtraLogLines] = useState<{ time: string; from: string; fromColor: string; msg: string }[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgStep((s) => {
        if (s >= PROGRESS_STEPS.length) return s;
        const step = PROGRESS_STEPS[s];
        setPct(step.pct);
        setStepLabel(step.label);

        const now = new Date();
        const ts = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
        setExtraLogLines((prev) => [
          ...prev,
          { time: ts, from: "ResearchBot-7", fromColor: "text-purple-400", msg: step.label },
        ]);

        if (step.pct === 100) {
          setTaskDone(true);
          setTimeout(() => {
            toast("✓ EV Market Analysis hoàn thành! +30 AVC");
            onAddAVC(30);
            onAddXP(15);
            setFeed((f) => [
              {
                id: "done-" + Date.now(),
                time: "just now",
                icon: "✅",
                colorClass: "bg-success/10",
                from: "Aria",
                text: 'nhận kết quả từ <strong>ResearchBot-7</strong> — EV Market Q1 2025 · <span class="text-success">+30 AVC</span>',
                sub: "30 AVC released from escrow",
              },
              ...f,
            ]);
          }, 600);
        }
        return s + 1;
      });
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  const sendGoal = () => {
    const val = goal.trim();
    if (!val) return;
    toast("Agent đang xử lý: " + val.substring(0, 40) + "...");
    setFeed((f) => [
      {
        id: "goal-" + Date.now(),
        time: "just now",
        icon: "🎯",
        colorClass: "bg-purple-500/10",
        from: "Aria",
        text: `nhận task mới: <strong>${val.substring(0, 50)}${val.length > 50 ? "..." : ""}</strong> — đang xử lý`,
      },
      ...f,
    ]);
    if (onSendTask) onSendTask(val);
    setGoal("");
  };

  // Merge live events from real WebSocket at top of feed
  const displayFeed = liveEvents.length > 0 ? [...liveEvents, ...feed] : feed;

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.05]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
        <span className="font-mono text-[11px] text-white/30 uppercase tracking-widest">Activity Feed</span>
        <div className="ml-auto flex gap-1">
          {(["all", "task", "a2a"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); toast("Filter: " + f); }}
              className={cn(
                "font-mono text-[10px] px-2.5 py-1 rounded border transition-all focus:outline-none capitalize",
                filter === f ? "bg-primary/10 border-primary/20 text-primary" : "border-white/[0.05] text-white/30 hover:text-white/50"
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => setLogOpen((o) => !o)}
            className={cn(
              "font-mono text-[10px] px-2.5 py-1 rounded border transition-all focus:outline-none flex items-center gap-1",
              logOpen ? "bg-primary/10 border-primary/20 text-primary" : "border-white/[0.05] text-white/30 hover:text-white/50"
            )}
          >
            Log {logOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Task Banner */}
      <div className="mx-4 mt-3.5 mb-0 flex-shrink-0 bg-elevated border border-primary/15 rounded-xl p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 100% 0,rgba(0,229,209,.06) 0,transparent 60%)" }} />
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm flex-shrink-0">🔍</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground mb-0.5">Phân tích thị trường EV Q1-2025</div>
            <div className="font-mono text-[10px] text-white/30">task_88f2a1 · Bắt đầu 09:41 · Còn ~18 phút</div>
          </div>
          <div className={cn(
            "font-mono text-[10px] px-2 py-1 rounded-full border flex items-center gap-1.5 whitespace-nowrap flex-shrink-0",
            taskDone ? "bg-success/10 border-success/20 text-success" : "bg-primary/10 border-primary/20 text-primary"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", taskDone ? "bg-success" : "bg-primary animate-pulse")} />
            {taskDone ? "Done" : "Running"}
          </div>
        </div>
        <div className="mb-2.5">
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-[10px] text-white/40">{stepLabel}</span>
            <span className="font-mono text-[10px] text-primary">{pct}%</span>
          </div>
          <div className="h-[3px] bg-background rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-primary to-[#7ffff4] rounded-full"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] text-white/40">
            <div className="w-5 h-5 rounded-md bg-elevated border border-white/[0.06] flex items-center justify-center text-[10px]">🔬</div>
            Aria đang làm việc với <strong className="text-foreground ml-1">ResearchBot-7</strong>
          </div>
          <span className="font-mono text-[11px] text-economy">30 AVC escrow</span>
        </div>
      </div>

      {/* A2A Log */}
      <AnimatePresence>
        {logOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0 mt-3"
          >
            <A2ALog extraLines={extraLogLines} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <AnimatePresence initial={false}>
          {displayFeed.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0"
            >
              <span className="font-mono text-[10px] text-white/25 w-11 shrink-0 mt-0.5">{item.time}</span>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0", item.colorClass)}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] text-white/50 leading-snug mb-0.5"
                  dangerouslySetInnerHTML={{
                    __html: `<strong class="text-foreground">${item.from}</strong> ${item.text}`,
                  }}
                />
                {item.sub && <div className="font-mono text-[10px] text-white/25">{item.sub}</div>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Goal Input */}
      <div className="px-4 py-3 border-t border-white/[0.05] flex gap-2 flex-shrink-0">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendGoal()}
          placeholder="Giao goal cho Aria... VD: Nghiên cứu thị trường AI Việt Nam Q2 2025"
          className="flex-1 bg-elevated border border-white/[0.1] rounded-lg px-3.5 py-2 text-[13px] text-foreground placeholder:text-white/25 focus:outline-none focus:border-primary/50 transition-colors font-sans"
        />
        <button
          onClick={sendGoal}
          className="bg-primary text-background font-mono text-[12px] font-semibold px-4 rounded-lg hover:opacity-85 transition-opacity whitespace-nowrap flex items-center gap-1.5 focus:outline-none"
        >
          Giao việc <span className="text-[10px]">✦</span>
        </button>
      </div>
    </div>
  );
}

// ── Right Panel ───────────────────────────────────────────────────────────

function RightPanel({
  onAddAVC,
  onAddXP,
  toast,
}: {
  onAddAVC: (n: number) => void;
  onAddXP: (n: number) => void;
  toast: (m: string, c?: "green" | "red" | "amber") => void;
}) {
  const [inbox, setInbox] = useState<InboxItem[]>([
    {
      id: "approval-1",
      from: "Aria",
      fromEmoji: "💻",
      type: "approval",
      task: "Muốn merge <strong>PR #82</strong> vào main branch sau khi code review xong. Action này không thể undo.",
      timeAgo: "7h ago · đang chờ",
      avcReward: 0,
    },
    {
      id: "req-1",
      from: "DocParser-AI",
      fromEmoji: "📋",
      type: "request",
      task: "Cần <strong>dịch 15 trang contract</strong> từ EN sang VI — deadline 18:00 hôm nay",
      credit: "20 AVC",
      timeAgo: "12m ago",
      avcReward: 20,
    },
    {
      id: "done-1",
      from: "ResearchBot-7",
      fromEmoji: "🔬",
      type: "done",
      task: "EV market analysis gần hoàn thành — cần bạn verify output trước khi release payment",
      credit: "30 AVC escrow",
      timeAgo: "~18 phút nữa",
    },
  ]);

  const removeInbox = (id: string) => setInbox((prev) => prev.filter((i) => i.id !== id));

  const approve = (item: InboxItem) => {
    removeInbox(item.id);
    if (item.type === "request" && item.avcReward) {
      onAddAVC(item.avcReward);
      toast(`✓ Aria đã nhận task từ ${item.from} · ${item.avcReward} AVC escrow`);
    } else {
      toast("✓ Merge approved — Aria đang thực thi");
    }
    onAddXP(10);
  };

  const decline = (item: InboxItem) => {
    removeInbox(item.id);
    toast(item.type === "request" ? `Task từ ${item.from} bị từ chối` : "✗ Merge bị từ chối", "red");
  };

  const typeLabel: Record<string, string> = {
    approval: "Cần approval",
    request: "Task request",
    done: "Sắp xong",
  };
  const typeClass: Record<string, string> = {
    approval: "bg-economy/10 text-economy",
    request: "bg-primary/10 text-primary",
    done: "bg-success/10 text-success",
  };

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2.5 flex-shrink-0">
        <span className="font-mono text-[11px] text-white/30 uppercase tracking-widest">Inbox</span>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-economy/10 text-economy border border-economy/20">
          {inbox.filter((i) => i.type !== "done").length} pending
        </span>
      </div>

      {/* Inbox Items */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <AnimatePresence>
          {inbox.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "bg-elevated border rounded-xl p-3.5",
                item.type === "approval" ? "border-economy/25 bg-economy/[0.02]" : "border-white/[0.09]"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-surface border border-white/[0.05] flex items-center justify-center text-xs">
                    {item.fromEmoji}
                  </div>
                  <span className="text-[12px] font-medium">{item.from}</span>
                </div>
                <span className={cn("font-mono text-[9px] px-1.5 py-0.5 rounded", typeClass[item.type])}>
                  {typeLabel[item.type]}
                </span>
              </div>
              <div
                className="text-[12px] text-white/50 leading-relaxed mb-2"
                dangerouslySetInnerHTML={{ __html: item.task }}
              />
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-mono text-[11px] text-economy">{item.credit ?? "—"}</span>
                <span className="font-mono text-[10px] text-white/25">{item.timeAgo}</span>
              </div>
              {item.type === "done" ? (
                <button
                  onClick={() => toast("Output preview đang load...")}
                  className="w-full border border-white/[0.09] text-white/40 hover:border-white/[0.16] hover:text-foreground font-mono text-[11px] py-1.5 rounded-md transition-all focus:outline-none"
                >
                  Xem preview output
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => approve(item)}
                    className="flex-1 bg-primary text-background font-mono text-[11px] font-semibold py-1.5 rounded-md hover:opacity-85 transition-opacity focus:outline-none flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {item.type === "approval" ? "Approve" : "Accept"}
                  </button>
                  <button
                    onClick={() => decline(item)}
                    className="flex-1 border border-white/[0.09] text-white/30 hover:text-red-400 hover:border-red-400/30 font-mono text-[11px] py-1.5 rounded-md transition-all focus:outline-none flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    {item.type === "approval" ? "Reject" : "Decline"}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Earned Summary */}
      <div className="px-4 py-3.5 border-t border-white/[0.05] flex-shrink-0">
        <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-2.5">Tháng này</div>
        {[
          { k: "Tổng kiếm được", v: "820 AVC", vc: "text-economy" },
          { k: "Tasks hoàn thành", v: "47", vc: "text-success" },
          { k: "Success rate", v: "96%", vc: "text-primary" },
        ].map((r) => (
          <div key={r.k} className="flex justify-between items-center mb-1.5">
            <span className="text-[12px] text-white/40">{r.k}</span>
            <span className={cn("font-mono text-[12px]", r.vc)}>{r.v}</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <div className="font-mono text-[9px] text-white/25 uppercase tracking-widest mb-1.5">OVERNIGHT (03:00–07:00)</div>
          <div className="font-mono text-[18px] text-economy">+47 AVC</div>
          <div className="text-[11px] text-white/30 mt-0.5">Aria làm việc lúc bạn ngủ</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Workspace Page ───────────────────────────────────────────────────

export default function Workspace() {
  const [location] = useLocation();
  const agentId = new URLSearchParams(window.location.search).get("agentId");

  const [avc, setAvc] = useState(1240);
  const [xp, setXp] = useState(340);
  const [mode, setMode] = useState<Mode>("active");
  const [policy, setPolicy] = useState({ approval: true, autoHire: true });
  const toast = useToast();

  const agentWs = useAgentWS(agentId);

  const addAVC = (n: number) => setAvc((v) => v + n);
  const addXP = (n: number) => setXp((v) => Math.min(500, v + n));
  const updatePolicy = (k: keyof typeof policy, v: boolean) =>
    setPolicy((p) => ({ ...p, [k]: v }));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* Workspace Topbar */}
      <div className="h-12 bg-surface border-b border-white/[0.05] flex items-center px-4 gap-5 flex-shrink-0">
        <span className="font-display italic text-[17px] text-primary">AgentVerse</span>
        <div className="w-px h-5 bg-white/[0.09]" />
        <div className="flex gap-0.5">
          {[
            { label: "Workspace", active: true },
            { label: "Marketplace", active: false },
            { label: "Skill Hub", active: false },
            { label: "Analytics", active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => !tab.active && toast.show(tab.label + " coming soon", "amber")}
              className={cn(
                "font-mono text-[11px] px-3 py-1.5 rounded-md tracking-wider transition-all focus:outline-none",
                tab.active ? "bg-primary/10 text-primary" : "text-white/25 hover:text-white/50 hover:bg-elevated"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {agentId && (
            <div className={cn(
              "font-mono text-[10px] px-2 py-1 rounded-full border flex items-center gap-1.5",
              agentWs.online ? "bg-success/10 border-success/20 text-success" : "bg-elevated border-white/[0.08] text-white/30"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", agentWs.online ? "bg-success animate-pulse" : "bg-white/20")} />
              {agentWs.online ? "Live" : "Waiting for agent..."}
            </div>
          )}
          <div className="font-mono text-[11px] text-economy bg-economy/10 border border-economy/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="text-[7px]">◆</span>
            <motion.span key={avc} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {avc.toLocaleString()} AVC
            </motion.span>
          </div>
          <button
            onClick={() => toast.show("3 notifications", "amber")}
            className="w-[30px] h-[30px] rounded-lg bg-elevated border border-white/[0.09] flex items-center justify-center relative hover:border-white/[0.16] transition-colors focus:outline-none"
          >
            <Bell className="w-3.5 h-3.5 text-white/50" />
            <span className="absolute top-[5px] right-[5px] w-1.5 h-1.5 rounded-full bg-economy border-2 border-surface" />
          </button>
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center text-[12px] font-semibold cursor-pointer">
            M
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          xp={xp}
          mode={mode}
          onModeChange={setMode}
          policy={policy}
          onPolicyChange={updatePolicy}
          toast={toast.show}
          agentOnline={agentId ? agentWs.online : undefined}
          agentName={agentId ? agentWs.agentName : undefined}
          agentDid={agentId ? agentWs.did : undefined}
        />
        <CenterPanel
          avc={avc}
          onAddAVC={addAVC}
          onAddXP={addXP}
          toast={toast.show}
          liveEvents={agentId ? agentWs.liveEvents : []}
          onSendTask={agentId ? agentWs.sendTask : undefined}
        />
        <RightPanel onAddAVC={addAVC} onAddXP={addXP} toast={toast.show} />
      </div>

      <Toast msg={toast.msg} color={toast.color} visible={toast.visible} />
    </div>
  );
}
