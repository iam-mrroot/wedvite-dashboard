"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download, ChevronUp, ChevronDown, ChevronsUpDown,
  Loader2, ClipboardList, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Card }      from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventSel = { attending: boolean; guest_count: number; event: { id: string; name: string } };

type Rsvp = {
  id:                   string;
  name:                 string;
  phone:                string | null;
  guest_count:          number;
  dietary_preference:   string;
  dietary_note:         string | null;
  transport_needed:     boolean;
  accommodation_needed: boolean;
  source_type:          "CATEGORY_LINK" | "PERSONAL_LINK" | "UNIVERSAL_LINK";
  message:              string | null;
  created_at:           string;
  source_category:      { id: string; name: string } | null;
  guest:                { id: string; name: string } | null;
  event_selections:     EventSel[];
};

type Category = { id: string; name: string };
type Event    = { id: string; name: string };

type SortCol = "date" | "guest_count";
type SortDir = "asc" | "desc";

const WEDDING_SLUG = "ravi-and-meera";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(rsvps: Rsvp[]) {
  const headers = [
    "Name","Phone","Source","Category","Events Attending","Guest Count",
    "Dietary","Dietary Note","Transport","Accommodation","Message","Submitted At",
  ];
  const rows = rsvps.map((r) => [
    r.name,
    r.phone ?? "",
    r.source_type,
    r.source_category?.name ?? "",
    r.event_selections.filter((s) => s.attending).map((s) => s.event.name).join("; "),
    r.guest_count,
    r.dietary_preference,
    r.dietary_note ?? "",
    r.transport_needed     ? "Yes" : "No",
    r.accommodation_needed ? "Yes" : "No",
    r.message ?? "",
    new Date(r.created_at).toISOString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const a   = document.createElement("a");
  a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `rsvps-${WEDDING_SLUG}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Badge components ─────────────────────────────────────────────────────────

const SOURCE_STYLE: Record<string, string> = {
  CATEGORY_LINK:  "bg-blue-50   text-blue-700   border-blue-200",
  PERSONAL_LINK:  "bg-purple-50 text-purple-700 border-purple-200",
  UNIVERSAL_LINK: "bg-zinc-100  text-zinc-600   border-zinc-200",
};
const SOURCE_LABEL: Record<string, string> = {
  CATEGORY_LINK:  "Category",
  PERSONAL_LINK:  "Personal",
  UNIVERSAL_LINK: "Universal",
};

const DIETARY_STYLE: Record<string, string> = {
  VEG:             "bg-green-50  text-green-700  border-green-200",
  NON_VEG:         "bg-red-50    text-red-700    border-red-200",
  JAIN:            "bg-blue-50   text-blue-700   border-blue-200",
  NO_ONION_GARLIC: "bg-purple-50 text-purple-700 border-purple-200",
  OTHER:           "bg-zinc-100  text-zinc-600   border-zinc-200",
};
const DIETARY_LABEL: Record<string, string> = {
  VEG: "Veg", NON_VEG: "Non-Veg", JAIN: "Jain",
  NO_ONION_GARLIC: "No O/G", OTHER: "Other",
};

function SmallBadge({ text, style }: { text: string; style: string }) {
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap", style)}>
      {text}
    </span>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────

function SortHead({
  label, col, sort, onSort, className,
}: {
  label: string; col: SortCol;
  sort: { col: SortCol; dir: SortDir };
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const active = sort.col === col;
  return (
    <TableHead
      className={cn("text-xs font-medium text-zinc-500 cursor-pointer select-none group", className)}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? sort.dir === "desc"
            ? <ChevronDown className="h-3 w-3 text-zinc-600" />
            : <ChevronUp   className="h-3 w-3 text-zinc-600" />
          : <ChevronsUpDown className="h-3 w-3 text-zinc-300 group-hover:text-zinc-400" />}
      </span>
    </TableHead>
  );
}

// ─── Message cell ─────────────────────────────────────────────────────────────

function MessageCell({ id, message, expanded, onToggle }: {
  id: string; message: string | null; expanded: boolean; onToggle: () => void;
}) {
  if (!message) return <span className="text-zinc-300">—</span>;
  const short = message.length > 55;
  return (
    <span
      className={cn("text-sm text-zinc-600", short && "cursor-pointer")}
      onClick={short ? onToggle : undefined}
      title={message}
    >
      {expanded || !short ? message : `${message.slice(0, 55)}…`}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-100", className)} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RsvpsPage() {
  const [rsvps,      setRsvps]      = useState<Rsvp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events,     setEvents]     = useState<Event[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  // Server-side filters
  const [sourceF,   setSourceF]   = useState("__all__");
  const [categoryF, setCategoryF] = useState("__all__");
  const [eventF,    setEventF]    = useState("__all__");

  // Client-side filters
  const [dietaryF, setDietaryF] = useState("__all__");

  // Sort
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "date", dir: "desc" });

  // Expanded messages (Record to avoid Set spread issues)
  const [expanded, setExpanded] = useState<Record<string, true>>({});
  const toggleExpand = (id: string) =>
    setExpanded((p) => p[id] ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== id)) : { ...p, [id]: true });

  // ── Build server params ────────────────────────────────────────────────────
  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (sourceF   !== "__all__") p.set("source_type", sourceF);
    if (categoryF !== "__all__") p.set("category_id", categoryF);
    if (eventF    !== "__all__") p.set("event_id",    eventF);
    return p.toString();
  }, [sourceF, categoryF, eventF]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRsvps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/rsvps?${buildParams()}`);
      if (!res.ok) throw new Error("Failed to load RSVPs");
      const json = await res.json();
      setRsvps(json.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load RSVPs");
    } finally { setLoading(false); }
  }, [buildParams]);

  const fetchMeta = useCallback(async () => {
    const [catRes, evtRes] = await Promise.all([
      fetch(`/api/weddings/${WEDDING_SLUG}/categories`),
      fetch(`/api/weddings/${WEDDING_SLUG}/events`),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
    if (evtRes.ok) setEvents(await evtRes.json());
  }, []);

  useEffect(() => { fetchRsvps(); }, [fetchRsvps]);
  useEffect(() => { fetchMeta();  }, [fetchMeta]);

  // ── Toggle sort ────────────────────────────────────────────────────────────
  const toggleSort = (col: SortCol) =>
    setSort((p) => p.col === col ? { col, dir: p.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" });

  // ── Client-side filter + sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = rsvps;
    if (dietaryF !== "__all__") rows = rows.filter((r) => r.dietary_preference === dietaryF);
    return [...rows].sort((a, b) => {
      const mult = sort.dir === "asc" ? 1 : -1;
      if (sort.col === "date")
        return mult * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (sort.col === "guest_count")
        return mult * (a.guest_count - b.guest_count);
      return 0;
    });
  }, [rsvps, dietaryF, sort]);

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total_rsvps:       filtered.length,
    total_guests:      filtered.reduce((s, r) => s + r.guest_count, 0),
    need_transport:    filtered.filter((r) => r.transport_needed).length,
    need_accommodation:filtered.filter((r) => r.accommodation_needed).length,
  }), [filtered]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    setExporting(true);
    try { downloadCSV(filtered); toast.success(`Exported ${filtered.length} RSVPs`); }
    catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 pb-4 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">RSVP Responses</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {loading ? "Loading…" : `${filtered.length} response${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting || loading}>
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Export CSV
            </Button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <Select value={sourceF} onValueChange={(v) => setSourceF(v ?? "__all__")}>
              <SelectTrigger className="h-9 text-sm w-[155px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sources</SelectItem>
                <SelectItem value="CATEGORY_LINK">Category Link</SelectItem>
                <SelectItem value="PERSONAL_LINK">Personal Link</SelectItem>
                <SelectItem value="UNIVERSAL_LINK">Universal Link</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryF} onValueChange={(v) => setCategoryF(v ?? "__all__")}>
              <SelectTrigger className="h-9 text-sm w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={eventF} onValueChange={(v) => setEventF(v ?? "__all__")}>
              <SelectTrigger className="h-9 text-sm w-[155px]"><SelectValue placeholder="Event" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Events</SelectItem>
                {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={dietaryF} onValueChange={(v) => setDietaryF(v ?? "__all__")}>
              <SelectTrigger className="h-9 text-sm w-[130px]"><SelectValue placeholder="Dietary" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Dietary</SelectItem>
                <SelectItem value="VEG">Veg</SelectItem>
                <SelectItem value="NON_VEG">Non-Veg</SelectItem>
                <SelectItem value="JAIN">Jain</SelectItem>
                <SelectItem value="NO_ONION_GARLIC">No Onion/Garlic</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="border-zinc-200 shadow-none">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[130px]">Name</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[110px] hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[90px]">Source</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[110px] hidden lg:table-cell">Category</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[160px] hidden lg:table-cell">Events</TableHead>
                    <SortHead label="Guests" col="guest_count" sort={sort} onSort={toggleSort} className="min-w-[70px]" />
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[90px]">Dietary</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[70px] hidden xl:table-cell">Transport</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[90px] hidden xl:table-cell">Accom.</TableHead>
                    <TableHead className="text-xs font-medium text-zinc-500 min-w-[160px] hidden md:table-cell">Message</TableHead>
                    <SortHead label="Date" col="date" sort={sort} onSort={toggleSort} className="min-w-[90px]" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading
                    ? Array.from({ length: 7 }).map((_, i) => (
                        <TableRow key={i} className="border-zinc-100">
                          <TableCell><Sk className="h-4 w-28" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Sk className="h-4 w-24" /></TableCell>
                          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Sk className="h-4 w-20" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Sk className="h-4 w-32" /></TableCell>
                          <TableCell><Sk className="h-4 w-8" /></TableCell>
                          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell className="hidden xl:table-cell"><Sk className="h-4 w-8 mx-auto" /></TableCell>
                          <TableCell className="hidden xl:table-cell"><Sk className="h-4 w-8 mx-auto" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Sk className="h-4 w-40" /></TableCell>
                          <TableCell><Sk className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    : filtered.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={11} className="py-16 text-center">
                            <ClipboardList className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
                            <p className="text-sm text-zinc-400">No RSVPs match the current filters.</p>
                          </TableCell>
                        </TableRow>
                      )
                    : filtered.map((r) => {
                        const attendingEvents = r.event_selections
                          .filter((s) => s.attending)
                          .map((s) => s.event.name);

                        return (
                          <TableRow key={r.id} className="border-zinc-100 align-top">
                            {/* Name */}
                            <TableCell className="py-3">
                              <p className="text-sm font-medium text-zinc-800 leading-snug">{r.name}</p>
                              {r.guest && r.guest.name !== r.name && (
                                <p className="text-[11px] text-zinc-400 mt-0.5">via {r.guest.name}</p>
                              )}
                            </TableCell>

                            {/* Phone */}
                            <TableCell className="py-3 text-sm text-zinc-500 tabular-nums hidden md:table-cell">
                              {r.phone ?? <span className="text-zinc-300">—</span>}
                            </TableCell>

                            {/* Source */}
                            <TableCell className="py-3">
                              <SmallBadge
                                text={SOURCE_LABEL[r.source_type] ?? r.source_type}
                                style={SOURCE_STYLE[r.source_type] ?? ""}
                              />
                            </TableCell>

                            {/* Category */}
                            <TableCell className="py-3 text-sm text-zinc-600 hidden lg:table-cell">
                              {r.source_category?.name ?? <span className="text-zinc-300">—</span>}
                            </TableCell>

                            {/* Events */}
                            <TableCell className="py-3 hidden lg:table-cell">
                              {attendingEvents.length > 0
                                ? <span className="text-xs text-zinc-600 leading-relaxed">{attendingEvents.join(", ")}</span>
                                : <span className="text-zinc-300 text-xs">None</span>}
                            </TableCell>

                            {/* Guest count */}
                            <TableCell className="py-3 text-sm font-semibold text-zinc-800 tabular-nums">
                              {r.guest_count}
                            </TableCell>

                            {/* Dietary */}
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1">
                                <SmallBadge
                                  text={DIETARY_LABEL[r.dietary_preference] ?? r.dietary_preference}
                                  style={DIETARY_STYLE[r.dietary_preference] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}
                                />
                                {r.dietary_note && (
                                  <span className="text-[11px] text-zinc-400 leading-snug max-w-[100px]">{r.dietary_note}</span>
                                )}
                              </div>
                            </TableCell>

                            {/* Transport */}
                            <TableCell className="py-3 text-center hidden xl:table-cell">
                              {r.transport_needed
                                ? <span className="text-green-600 font-semibold text-sm">✓</span>
                                : <span className="text-zinc-200 text-sm">—</span>}
                            </TableCell>

                            {/* Accommodation */}
                            <TableCell className="py-3 text-center hidden xl:table-cell">
                              {r.accommodation_needed
                                ? <span className="text-green-600 font-semibold text-sm">✓</span>
                                : <span className="text-zinc-200 text-sm">—</span>}
                            </TableCell>

                            {/* Message */}
                            <TableCell className="py-3 max-w-[180px] hidden md:table-cell">
                              <MessageCell
                                id={r.id}
                                message={r.message}
                                expanded={!!expanded[r.id]}
                                onToggle={() => toggleExpand(r.id)}
                              />
                            </TableCell>

                            {/* Date */}
                            <TableCell className="py-3">
                              <span className="text-xs text-zinc-500 whitespace-nowrap">
                                {relativeTime(r.created_at)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Sticky summary bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-200 bg-white px-6 md:px-8 py-3 mb-16 md:mb-0">
        {loading ? (
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-4 w-28" />)}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-zinc-500">
              Total RSVPs:{" "}
              <strong className="text-zinc-900 font-semibold">{summary.total_rsvps}</strong>
            </span>
            <span className="text-zinc-300 hidden sm:inline">|</span>
            <span className="text-zinc-500">
              Total Guests:{" "}
              <strong className="text-zinc-900 font-semibold">{summary.total_guests}</strong>
            </span>
            <span className="text-zinc-300 hidden sm:inline">|</span>
            <span className={cn("text-zinc-500", summary.need_transport > 0 && "text-amber-600")}>
              Need Transport:{" "}
              <strong className={cn("font-semibold", summary.need_transport > 0 ? "text-amber-700" : "text-zinc-900")}>
                {summary.need_transport}
              </strong>
            </span>
            <span className="text-zinc-300 hidden sm:inline">|</span>
            <span className={cn("text-zinc-500", summary.need_accommodation > 0 && "text-amber-600")}>
              Need Accommodation:{" "}
              <strong className={cn("font-semibold", summary.need_accommodation > 0 ? "text-amber-700" : "text-zinc-900")}>
                {summary.need_accommodation}
              </strong>
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
