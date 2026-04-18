"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Copy, Check, Star, RotateCcw, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button }           from "@/components/ui/button";
import { Badge }            from "@/components/ui/badge";
import { Card }             from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEDDING_SLUG = "ravi-and-meera";
const LS_KEY       = `whatsapp-sent-${WEDDING_SLUG}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryLink = {
  id:                  string;
  name:                string;
  slug:                string;
  invite_url:          string;
  share_url:           string;
  direct_copy_message: string;
};

type VipGuest = {
  id:              string;
  name:            string;
  phone:           string;
  category:        string | null;
  invite_url:      string;
  direct_send_url: string;
  message_preview: string;
};

type AnalyticsCategory = {
  category_name: string;
  slug:          string;
  clicks:        number;
  rsvps:         number;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-100", className)} />;
}

// ─── WhatsApp button styles ───────────────────────────────────────────────────

const WA_BTN = "bg-[#25D366] hover:bg-[#1ebe59] text-white border-0 shadow-none";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [categories, setCategories] = useState<CategoryLink[]>([]);
  const [vipGuests,  setVipGuests]  = useState<VipGuest[]>([]);
  const [analytics,  setAnalytics]  = useState<AnalyticsCategory[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Per-category editable message text
  const [messages, setMessages] = useState<Record<string, string>>({});

  // Copy-button feedback (catId → true for 2 s)
  const [copied, setCopied] = useState<Record<string, true>>({});

  // Sent status stored in localStorage
  const [sentGuests, setSentGuests] = useState<Record<string, true>>({});

  // ── Load localStorage on mount ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setSentGuests(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persistSent = (next: Record<string, true>) => {
    setSentGuests(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, analyticsRes] = await Promise.all([
        fetch(`/api/weddings/${WEDDING_SLUG}/whatsapp-links`, { method: "POST" }),
        fetch(`/api/weddings/${WEDDING_SLUG}/analytics`),
      ]);

      if (!linksRes.ok) throw new Error("Failed to load WhatsApp links");
      const linksData = await linksRes.json();

      const cats: CategoryLink[] = linksData.categories ?? [];
      const vips: VipGuest[]     = linksData.vip_guests  ?? [];

      setCategories(cats);
      setVipGuests(vips);

      // Initialise editable messages from API
      const msgMap: Record<string, string> = {};
      cats.forEach((c) => { msgMap[c.id] = c.direct_copy_message; });
      setMessages(msgMap);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.category_breakdown ?? []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCopy = async (catId: string) => {
    const msg = messages[catId] ?? "";
    try {
      await navigator.clipboard.writeText(msg);
      setCopied((p) => ({ ...p, [catId]: true }));
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied((p) => {
        const n = { ...p }; delete n[catId]; return n;
      }), 2000);
    } catch {
      toast.error("Failed to copy — please copy manually");
    }
  };

  const handleOpenWhatsApp = (catId: string) => {
    const msg = messages[catId] ?? "";
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const handleSendGuest = (guest: VipGuest) => {
    window.open(guest.direct_send_url, "_blank", "noopener");
    persistSent({ ...sentGuests, [guest.id]: true });
  };

  const handleMarkAllSent = () => {
    const next: Record<string, true> = {};
    vipGuests.forEach((g) => { next[g.id] = true; });
    persistSent(next);
    toast.success("All guests marked as sent");
  };

  const handleReset = () => {
    persistSent({});
    toast.success("All statuses reset");
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const analyticsMap = new Map(analytics.map((a) => [a.slug, a]));
  const sentCount    = vipGuests.filter((g) => sentGuests[g.id]).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">WhatsApp Share</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Send invitations to groups and personalised links to VIP guests.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Share to Groups
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <MessageCircle className="h-3.5 w-3.5 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-zinc-900">Share to Groups</h2>
          <span className="text-xs text-zinc-400">— Category Links</span>
        </div>

        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5 gap-0 shadow-none ring-1 ring-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Sk className="h-5 w-32" />
                  <Sk className="h-4 w-16 rounded-full" />
                </div>
                <Sk className="h-36 w-full rounded-md" />
                <div className="flex gap-2">
                  <Sk className="h-8 w-32 rounded-lg" />
                  <Sk className="h-8 w-36 rounded-lg" />
                </div>
                <Sk className="h-4 w-56" />
              </Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-12 text-center">
            <MessageCircle className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No categories found. Create categories first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const stats    = analyticsMap.get(cat.slug);
              const isCopied = !!copied[cat.id];

              return (
                <Card
                  key={cat.id}
                  className="p-5 gap-0 shadow-none ring-1 ring-zinc-200 flex flex-col"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-900">{cat.name}</h3>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 h-4 font-normal text-zinc-500"
                    >
                      {cat.slug}
                    </Badge>
                  </div>

                  {/* Editable message */}
                  <textarea
                    className={cn(
                      "w-full rounded-lg border border-zinc-200 bg-zinc-50",
                      "p-3 text-sm text-zinc-700 leading-relaxed resize-none",
                      "focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300",
                      "min-h-[148px] font-[inherit]",
                    )}
                    value={messages[cat.id] ?? ""}
                    onChange={(e) =>
                      setMessages((p) => ({ ...p, [cat.id]: e.target.value }))
                    }
                    spellCheck={false}
                  />

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(cat.id)}
                    >
                      {isCopied
                        ? <Check className="h-3.5 w-3.5 text-green-600" />
                        : <Copy  className="h-3.5 w-3.5" />}
                      {isCopied ? "Copied!" : "Copy Message"}
                    </Button>
                    <Button
                      size="sm"
                      className={WA_BTN}
                      onClick={() => handleOpenWhatsApp(cat.id)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Open WhatsApp
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    {stats ? (
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Sent to group
                        <span className="mx-1.5 text-zinc-200">→</span>
                        <span className="font-semibold text-zinc-600">{stats.clicks}</span>
                        <span className="mx-1"> opened</span>
                        <span className="mx-1.5 text-zinc-200">→</span>
                        <span className="font-semibold text-zinc-600">{stats.rsvps}</span>
                        <span className="mx-1"> RSVPed</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-300">No engagement data yet</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — Send to VIP Guests
      ════════════════════════════════════════════════════════════════════ */}
      <section className="pb-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900">Send to VIP Guests</h2>
            <span className="text-xs text-zinc-400">— Personal Links</span>
            {!loading && vipGuests.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal text-zinc-500">
                {sentCount}/{vipGuests.length} sent
              </Badge>
            )}
          </div>

          {!loading && vipGuests.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="text-zinc-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllSent}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark All Sent
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          /* Skeletons */
          <Card className="shadow-none ring-1 ring-zinc-200 gap-0 p-0">
            <div className="divide-y divide-zinc-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <Sk className="h-4 w-28" />
                  <Sk className="h-4 w-24" />
                  <Sk className="h-4 w-48 flex-1" />
                  <Sk className="h-5 w-16 rounded-full" />
                  <Sk className="h-8 w-36 rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        ) : vipGuests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-12 text-center">
            <Star className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No VIP guests with phone numbers found.</p>
            <p className="text-xs text-zinc-300 mt-1">
              Mark guests as VIP and add their phone numbers in the Guests page.
            </p>
          </div>
        ) : (
          <Card className="shadow-none ring-1 ring-zinc-200 gap-0 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[150px] pl-4">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[120px]">
                      Phone
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[220px]">
                      Personal Link
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[90px]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[170px] pr-4">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {vipGuests.map((guest) => {
                    const sent = !!sentGuests[guest.id];
                    return (
                      <TableRow key={guest.id} className="border-zinc-100 align-middle">

                        {/* Name */}
                        <TableCell className="py-3 pl-4">
                          <p className="text-sm font-medium text-zinc-800 leading-snug">
                            {guest.name}
                          </p>
                          {guest.category && (
                            <p className="text-[11px] text-zinc-400 mt-0.5">{guest.category}</p>
                          )}
                        </TableCell>

                        {/* Phone */}
                        <TableCell className="py-3 text-sm text-zinc-500 tabular-nums">
                          {guest.phone}
                        </TableCell>

                        {/* Personal link */}
                        <TableCell className="py-3 max-w-[240px]">
                          <a
                            href={guest.invite_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline break-all leading-relaxed"
                          >
                            {guest.invite_url}
                          </a>
                        </TableCell>

                        {/* Status badge */}
                        <TableCell className="py-3">
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded border",
                            "text-[11px] font-semibold whitespace-nowrap",
                            sent
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-zinc-50  text-zinc-400  border-zinc-200",
                          )}>
                            {sent ? "Sent" : "Not Sent"}
                          </span>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3 pr-4">
                          <Button
                            size="sm"
                            variant={sent ? "outline" : "default"}
                            onClick={() => handleSendGuest(guest)}
                            className={cn(!sent && WA_BTN)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {sent ? "Send Again" : "Send via WhatsApp"}
                          </Button>
                        </TableCell>

                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </section>

    </div>
  );
}
