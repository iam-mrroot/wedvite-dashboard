import { SidebarNav, MobileNav } from "@/components/dashboard/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Heart } from "lucide-react";

const WEDDING = {
  brideFirst:  "Meera",
  groomFirst:  "Ravi",
  date:        "Dec 15, 2026",
  tier:        "Premium",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-56 lg:w-60 shrink-0 border-r border-zinc-200 bg-white">

        {/* Logo / app name */}
        <div className="flex items-center gap-2 h-14 px-4 border-b border-zinc-100">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-zinc-900">
            <Heart className="h-3.5 w-3.5 text-white fill-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-900 tracking-tight">
            Wedvite
          </span>
        </div>

        {/* Wedding context pill */}
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">
            Active wedding
          </p>
          <p className="text-sm font-semibold text-zinc-900 leading-tight">
            {WEDDING.groomFirst} &amp; {WEDDING.brideFirst}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <CalendarDays className="h-3 w-3 text-zinc-400" />
            <span className="text-xs text-zinc-400">{WEDDING.date}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4">
              {WEDDING.tier}
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-300 leading-tight">
            Wedvite Dashboard v1.0
          </p>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-zinc-200 bg-white shrink-0">
          {/* On mobile: show branding; on desktop: show page context */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center justify-center h-7 w-7 rounded-md bg-zinc-900">
              <Heart className="h-3.5 w-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-900">Wedvite</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              {WEDDING.groomFirst} &amp; {WEDDING.brideFirst}
            </span>
            <span className="text-zinc-300">—</span>
            <span className="text-sm text-zinc-500">{WEDDING.date}</span>
          </div>

          {/* Right side slot (future: avatar, notifications) */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-zinc-200 flex items-center justify-center">
              <span className="text-xs font-semibold text-zinc-600">R</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 z-50">
        <MobileNav />
      </div>
    </div>
  );
}
