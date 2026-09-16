import { useState, type ReactNode } from "react";
import { Activity, AlertTriangle, ArrowRight, Check, CircleDot, Clock3, Cloud, FileCheck2, Gauge, Layers3, Menu, Plus, RefreshCw, Server, ShieldCheck, Siren, X, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";

export const navItems = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/services", label: "Services", icon: Server },
  { href: "/checks", label: "API checks", icon: FileCheck2 },
  { href: "/incidents", label: "Incidents", icon: Siren },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-[74px] items-center border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck size={18} strokeWidth={2.5} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#f1bd54]" />
            </div>
            <span className="text-[15px] font-extrabold tracking-[-.02em] text-white">ContractLens</span>
          </Link>
        </div>
        <div className="px-4 pt-7">
          <p className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-slate-500">Workspace</p>
          <div className="mb-8 flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#b8d9cf] text-xs font-extrabold text-[#224940]">AC</div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-slate-100">Atlas Core</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">Production workspace</p>
            </div>
            <CircleDot size={13} className="ml-auto text-sidebar-primary" />
          </div>
          <p className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-slate-500">Control room</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link href={item.href} key={item.href} data-testid={`link-nav-${item.label.toLowerCase().replace(" ", "-")}`} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-slate-400 hover:bg-sidebar-accent hover:text-white"}`}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                  <span>{item.label}</span>
                  {item.href === "/incidents" && <span className="ml-auto rounded-full bg-[#3c3024] px-1.5 py-0.5 font-mono text-[9px] text-[#efbf68]">2</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-sidebar-border p-5">
          <div className="mb-4 flex items-center gap-2 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse-line" /> All systems operational</div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent font-mono text-[10px] text-slate-300">RS</div>
            <div><p className="text-[11px] font-bold text-slate-200">Sushant</p><p className="text-[10px] text-slate-500">Platform engineering</p></div>
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2" data-testid="link-mobile-brand"><ShieldCheck size={20} className="text-primary" /><span className="font-extrabold">ContractLens</span></Link>
        <button onClick={() => setMobileNavOpen((open) => !open)} className="rounded-md p-2 hover:bg-muted" data-testid="button-mobile-menu" aria-label="Open navigation"><Menu size={19} /></button>
      </header>
      {mobileNavOpen && <div className="fixed inset-x-0 top-[62px] z-20 border-b border-border bg-card p-3 shadow-lg lg:hidden"><nav className="space-y-1">{navItems.map((item) => { const Icon = item.icon; const active = item.href === "/" ? location === "/" : location.startsWith(item.href); return <Link onClick={() => setMobileNavOpen(false)} href={item.href} key={item.href} className={`flex items-center gap-3 rounded-md px-3 py-3 text-[12px] font-bold ${active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted"}`} data-testid={`link-mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}><Icon size={16} />{item.label}</Link>; })}</nav></div>}
      <main className="min-h-[100dvh] lg:pl-[238px]">
        <div className="mx-auto max-w-[1520px] px-5 py-7 sm:px-8 sm:py-9">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end animate-rise-in">
    <div><p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[.2em] text-primary">{eyebrow}</p><h1 className="text-[28px] font-extrabold tracking-[-.04em] text-foreground sm:text-[34px]">{title}</h1>{detail && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{detail}</p>}</div>
    {action}
  </div>;
}

export function Button({ children, onClick, variant = "primary", disabled = false, type = "button", testId, className = "" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "quiet" | "danger"; disabled?: boolean; type?: "button" | "submit"; testId?: string; className?: string }) {
  const styles = { primary: "bg-primary text-primary-foreground shadow-sm hover:brightness-95", secondary: "border border-border bg-card text-foreground hover:bg-muted", quiet: "text-muted-foreground hover:bg-muted hover:text-foreground", danger: "bg-destructive text-destructive-foreground hover:brightness-95" };
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2.5 text-[12px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}

export function StatusBadge({ status, kind = "service" }: { status: string; kind?: "service" | "check" | "incident" | "run" }) {
  const map: Record<string, { label: string; tone: string; dot: string }> = {
    healthy: { label: "Healthy", tone: "bg-[#e5f5ee] text-[#147152]", dot: "bg-[#28a477]" },
    passing: { label: "Passing", tone: "bg-[#e5f5ee] text-[#147152]", dot: "bg-[#28a477]" },
    passed: { label: "Passed", tone: "bg-[#e5f5ee] text-[#147152]", dot: "bg-[#28a477]" },
    degraded: { label: "Degraded", tone: "bg-[#fff3dc] text-[#98651d]", dot: "bg-[#e1a62e]" },
    investigating: { label: "Investigating", tone: "bg-[#eaf0fb] text-[#416ca1]", dot: "bg-[#5786c4]" },
    open: { label: "Open", tone: "bg-[#fde9e6] text-[#a33e32]", dot: "bg-[#df6656]" },
    failing: { label: "Failing", tone: "bg-[#fde9e6] text-[#a33e32]", dot: "bg-[#df6656]" },
    failed: { label: "Failed", tone: "bg-[#fde9e6] text-[#a33e32]", dot: "bg-[#df6656]" },
    down: { label: "Down", tone: "bg-[#f8e4e3] text-[#a32f2a]", dot: "bg-[#c95048]" },
    paused: { label: "Paused", tone: "bg-muted text-muted-foreground", dot: "bg-slate-400" },
    resolved: { label: "Resolved", tone: "bg-[#e8f0ee] text-[#52736b]", dot: "bg-[#83a69c]" },
    critical: { label: "Critical", tone: "bg-[#fbe4e1] text-[#a1342a]", dot: "bg-[#d7584d]" },
    high: { label: "High", tone: "bg-[#fff0d7] text-[#95611b]", dot: "bg-[#d79a36]" },
    medium: { label: "Medium", tone: "bg-[#eaf0fb] text-[#426795]", dot: "bg-[#5786c4]" },
    low: { label: "Low", tone: "bg-muted text-muted-foreground", dot: "bg-slate-400" },
  };
  const value = map[status] || map.low;
  return <span data-testid={`status-${kind}-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ${value.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${value.dot}`} />{value.label}</span>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string; detail?: string; icon: typeof Activity; tone?: "green" | "amber" | "red" | "blue" }) {
  const tones = { green: "text-primary bg-accent", amber: "text-[#ad7521] bg-[#fff4df]", red: "text-destructive bg-[#fbedeb]", blue: "text-[#4f78ac] bg-[#eaf1fb]" };
  return <div className="rounded-lg border border-card-border bg-card p-4 shadow-xs transition-transform hover:-translate-y-0.5 sm:p-5" data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}><div className="flex items-start justify-between"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{label}</p><span className={`rounded-md p-2 ${tones[tone]}`}><Icon size={15} /></span></div><p className="mt-4 text-[27px] font-extrabold tracking-[-.05em]">{value}</p>{detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}</div>;
}

export function Sparkline({ points, color = "#22966d", height = 70 }: { points: { label: string; value: number }[]; color?: string; height?: number }) {
  if (!points?.length) return <div className="h-[70px] rounded-md bg-muted" />;
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value), 0);
  const range = max - min || 1;
  const path = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${height - 8 - ((point.value - min) / range) * (height - 18)}`).join(" ");
  return <div className="relative" data-testid="chart-sparkline"><svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-[70px] w-full overflow-visible"><polyline points={path} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /><polyline points={`0,${height} ${path} 100,${height}`} fill={color} opacity=".07" stroke="none" /></svg><div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div></div>;
}

export function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse rounded-md bg-muted ${className}`} />; }

export function ErrorState({ message = "We couldn't load this view.", retry }: { message?: string; retry?: () => void }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-destructive/30 bg-[#fffaf9] p-8 text-center"><AlertTriangle size={22} className="mb-3 text-destructive" /><p className="text-sm font-bold">{message}</p><p className="mt-1 text-xs text-muted-foreground">The API may be unavailable. Try again in a moment.</p>{retry && <Button onClick={retry} variant="secondary" testId="button-retry"><RefreshCw size={13} /> Retry</Button>}</div>;
}

export function EmptyState({ icon: Icon = Cloud, title, detail, action }: { icon?: typeof Cloud; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-[245px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 p-8 text-center"><div className="mb-4 rounded-xl bg-accent p-3 text-primary"><Icon size={21} /></div><p className="text-sm font-bold">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function Dialog({ title, detail, onClose, children }: { title: string; detail?: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#16211d]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className="max-h-[92dvh] w-full overflow-auto rounded-t-xl border border-border bg-card shadow-2xl sm:max-w-[520px] sm:rounded-xl"><div className="flex items-start justify-between border-b border-border px-5 py-4"><div><h2 className="text-[16px] font-extrabold tracking-[-.02em]">{title}</h2>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div><button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-close-dialog" aria-label="Close dialog"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-foreground">{label}</span>{children}{hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}</label>; }
export const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-[12px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
export function formatTime(value?: string | null) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date); }
export function formatRelative(value?: string | null) { if (!value) return "—"; const diff = Date.now() - new Date(value).getTime(); const mins = Math.max(1, Math.round(diff / 60000)); return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`; }
export function ServiceMark({ name }: { name: string }) { return <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e0eee9] font-mono text-[11px] font-medium text-[#27715d]">{name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</div>; }
export const icons = { Activity, ArrowRight, Check, Clock3, Layers3, Plus, RefreshCw, Zap };