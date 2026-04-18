"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye, ClipboardList, CheckCircle2, Users,
  Copy, Check, MessageCircle, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DietaryCounts = {
  veg: number; non_veg: number; jain: number;
  no_onion_garlic: number; other: number;
};

type Analytics = {
  total_clicks:      number;
  unique_clicks:     number;
  total_rsvps:       number;
  total_attending:   number;
  total_guest_count: number;
  category_breakdown: {
    category_name: string;
    slug:          string;
    clicks:        number;
    rsvps:         number;
    guest_count:   number;
  }[];
  event_breakdown: {
    event_name:      string;
    confirmed_count: number;
    total_guests:    number;
    dietary:         DietaryCounts;
  }[];
  not_responded_vip: {
    guest_name: string;
    phone:      string | null;
    category:   string | null;
    opened:     boolean;
  }[];
};

const WEDDING_SLUG = "ravi-and-meera";

// ─── Dietary config ───────────────────────────────────────────────────────────

const DIETARY: { key: keyof DietaryCounts; label: string; className: string }[] = [
  { key: "veg",             label: "Veg",     className: "bg-green-50  text-green-700  border-green-200"  },
  { key: "non_veg",         label: "Non-Veg", className: "bg-red-50    text-red-700    border-red-200"    },
  { key: "jain",            label: "Jain",    className: "bg-blue-50   text-blue-700   border-blue-200"   },
  { key: "no_onion_garlic", label: "No O/G",  className: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "other",           label: "Other",   className: "bg-zinc-100  text-zinc-600   border-zinc-200"   },
];

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-100", className)} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, loading,
}: {
  label: string; value: number; icon: React.ElementType; loading: boolean;
}) {
  return (
    <Card className="border-zinc-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            {loading ? (
              <>
                <Sk className="h-8 w-20 mb-2" />
                <Sk className="h-3.5 w-24" />
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-zinc-900 tabular-nums">{value.toLocaleString()}</p>
                <p className="text-xs text-zinc-500 mt-1 font-medium">{label}</p>
              </>
            )}
          </div>
          <div className="h-8 w-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 ml-3">
            <Icon className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-1.5 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0"
      title="Copy link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── WhatsApp button ──────────────────────────────────────────────────────────

function WAButton({ url, title }: { url: string; title: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="p-1.5 rounded text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors"
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  );
}

// ─── Category table ───────────────────────────────────────────────────────────

function CategoryTable({ data, origin, loading }: {
  data: Analytics["category_breakdown"];
  origin: string;
  loading: boolean;
}) {
  const totals = data.reduce(
    (acc, r) => ({ clicks: acc.clicks + r.clicks, rsvps: acc.rsvps + r.rsvps, guests: acc.guests + r.guest_count }),
    { clicks: 0, rsvps: 0, guests: 0 }
  );

  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">Category Breakdown</h2>
      <Card className="border-zinc-200 shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-zinc-500 w-36">Category</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500">Invite Link</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 text-right w-20">Opens</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 text-right w-20">RSVPs</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 text-right w-24">Attending</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 text-right w-20">Guests</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-zinc-100">
                      <TableCell><Sk className="h-4 w-28" /></TableCell>
                      <TableCell><Sk className="h-4 w-48" /></TableCell>
                      <TableCell><Sk className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell><Sk className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell><Sk className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell><Sk className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : data.map((row) => {
                    const inviteUrl    = `${origin}/invite/${WEDDING_SLUG}/${row.slug}`;
                    const displayUrl   = `/invite/${WEDDING_SLUG}/${row.slug}`;
                    const conversion   = row.clicks > 0 ? row.rsvps / row.clicks : 1;
                    const needsFollowUp = row.clicks >= 3 && conversion < 0.4;
                    const waMsg  = encodeURIComponent(
                      `🎉 You're invited to Ravi & Meera's wedding!\nSee details & RSVP: ${inviteUrl}`
                    );
                    const waUrl  = `https://wa.me/?text=${waMsg}`;

                    return (
                      <TableRow
                        key={row.slug}
                        className={cn(
                          "border-zinc-100",
                          needsFollowUp && "bg-amber-50/50 hover:bg-amber-50"
                        )}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-zinc-800">{row.category_name}</span>
                            {needsFollowUp && (
                              <span title="Low conversion — needs follow-up">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center max-w-[220px]">
                            <span className="text-xs text-zinc-400 truncate font-mono" title={inviteUrl}>
                              {displayUrl}
                            </span>
                            <CopyButton text={inviteUrl} />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm tabular-nums text-zinc-700">{row.clicks}</TableCell>
                        <TableCell className="py-3 text-right text-sm tabular-nums text-zinc-700">{row.rsvps}</TableCell>
                        <TableCell className="py-3 text-right text-sm tabular-nums text-zinc-700">{row.rsvps}</TableCell>
                        <TableCell className="py-3 text-right text-sm tabular-nums text-zinc-700 font-medium">{row.guest_count}</TableCell>
                        <TableCell className="py-3 text-right">
                          <WAButton url={waUrl} title={`Share ${row.category_name} link via WhatsApp`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}

              {/* Totals row */}
              {!loading && data.length > 0 && (
                <TableRow className="border-t-2 border-zinc-200 bg-zinc-50 hover:bg-zinc-50 font-medium">
                  <TableCell className="py-2.5 text-xs text-zinc-500 uppercase tracking-wide" colSpan={2}>Total</TableCell>
                  <TableCell className="py-2.5 text-right text-sm tabular-nums text-zinc-900 font-semibold">{totals.clicks}</TableCell>
                  <TableCell className="py-2.5 text-right text-sm tabular-nums text-zinc-900 font-semibold">{totals.rsvps}</TableCell>
                  <TableCell className="py-2.5 text-right text-sm tabular-nums text-zinc-900 font-semibold">{totals.rsvps}</TableCell>
                  <TableCell className="py-2.5 text-right text-sm tabular-nums text-zinc-900 font-semibold">{totals.guests}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      {!loading && data.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-8">No categories yet.</p>
      )}
    </section>
  );
}

// ─── Event cards ──────────────────────────────────────────────────────────────

function EventCards({ data, loading }: {
  data: Analytics["event_breakdown"]; loading: boolean;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">Event Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-zinc-200 shadow-none">
                <CardContent className="p-4 space-y-3">
                  <Sk className="h-4 w-36" />
                  <div className="flex gap-4">
                    <Sk className="h-8 w-20" />
                    <Sk className="h-8 w-20" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: 3 }).map((_, j) => <Sk key={j} className="h-5 w-16" />)}
                  </div>
                </CardContent>
              </Card>
            ))
          : data.map((event) => (
              <Card key={event.event_name} className="border-zinc-200 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-zinc-900 mb-3 leading-tight">{event.event_name}</p>
                  <div className="flex items-baseline gap-4 mb-3">
                    <div>
                      <p className="text-2xl font-bold text-zinc-900 tabular-nums">{event.confirmed_count}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Responses</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-zinc-900 tabular-nums">{event.total_guests}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Guests</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DIETARY.map(({ key, label, className }) =>
                      event.dietary[key] > 0 ? (
                        <span
                          key={key}
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium",
                            className
                          )}
                        >
                          {label}: {event.dietary[key]}
                        </span>
                      ) : null
                    )}
                    {Object.values(event.dietary).every((v) => v === 0) && (
                      <span className="text-xs text-zinc-400">No dietary data</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </section>
  );
}

// ─── VIP follow-up table ──────────────────────────────────────────────────────

function VipTable({ data, origin, loading }: {
  data: Analytics["not_responded_vip"]; origin: string; loading: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-zinc-900">VIP Guests — Needs Follow-up</h2>
        {!loading && data.length > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
            {data.length}
          </Badge>
        )}
      </div>

      {!loading && data.length === 0 ? (
        <Card className="border-zinc-200 shadow-none">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">All VIP guests have responded. 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-200 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-zinc-500">Name</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Phone</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Category</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-zinc-100">
                        <TableCell><Sk className="h-4 w-32" /></TableCell>
                        <TableCell><Sk className="h-4 w-24" /></TableCell>
                        <TableCell><Sk className="h-4 w-24" /></TableCell>
                        <TableCell><Sk className="h-5 w-28" /></TableCell>
                        <TableCell />
                      </TableRow>
                    ))
                  : data.map((guest) => {
                      const guestSlug = guest.guest_name.toLowerCase().replace(/\s+/g, "-");
                      const inviteUrl = `${origin}/invite/${WEDDING_SLUG}/guest/${guestSlug}`;
                      const msg = encodeURIComponent(
                        `Dear ${guest.guest_name}, you are warmly invited to Ravi & Meera's wedding!\n\nDetails & RSVP: ${inviteUrl} 🙏`
                      );
                      const waUrl = guest.phone
                        ? `https://api.whatsapp.com/send?phone=91${guest.phone.replace(/\D/g, "")}&text=${msg}`
                        : `https://wa.me/?text=${msg}`;

                      return (
                        <TableRow key={guest.guest_name} className="border-zinc-100">
                          <TableCell className="py-3 text-sm font-medium text-zinc-800">{guest.guest_name}</TableCell>
                          <TableCell className="py-3 text-sm text-zinc-500 tabular-nums">
                            {guest.phone ?? <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-zinc-500">
                            {guest.category ?? <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="py-3">
                            {guest.opened ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Eye className="h-3 w-3" /> Opened, No RSVP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <AlertCircle className="h-3 w-3" /> Not Opened
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <WAButton url={waUrl} title={`Send WhatsApp to ${guest.guest_name}`} />
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [origin,  setOrigin]  = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/analytics`);
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Failed to load analytics</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Opens",          value: data?.unique_clicks     ?? 0, icon: Eye            },
    { label: "Total RSVPs",          value: data?.total_rsvps       ?? 0, icon: ClipboardList  },
    { label: "Confirmed Attending",  value: data?.total_attending   ?? 0, icon: CheckCircle2   },
    { label: "Total Guest Count",    value: data?.total_guest_count ?? 0, icon: Users          },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 pb-24 md:pb-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Live summary for Ravi &amp; Meera's wedding.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      {/* Category table */}
      <CategoryTable
        data={data?.category_breakdown ?? []}
        origin={origin}
        loading={loading}
      />

      {/* Event cards */}
      <EventCards data={data?.event_breakdown ?? []} loading={loading} />

      {/* VIP follow-up */}
      <VipTable
        data={data?.not_responded_vip ?? []}
        origin={origin}
        loading={loading}
      />
    </div>
  );
}
