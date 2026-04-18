"use client";

import {
  useState, useEffect, useCallback, useRef, useLayoutEffect,
} from "react";
import {
  Plus, Upload, Download, Search, Star, StarOff, Copy, Check,
  MessageCircle, Trash2, ChevronLeft, ChevronRight,
  Loader2, Users, AlertCircle, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button }           from "@/components/ui/button";
import { Input }            from "@/components/ui/input";
import { Badge }            from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string };

type Guest = {
  id:          string;
  name:        string;
  phone:       string | null;
  slug:        string;
  relation:    string | null;
  side:        "BRIDE" | "GROOM" | "COMMON";
  is_vip:      boolean;
  rsvp_count:  number;
  click_count: number;
  has_rsvp:    boolean;
  has_opened:  boolean;
  invite_url:  string;
  category:    { id: string; name: string; slug: string } | null;
};

type Pagination = { total: number; page: number; limit: number; total_pages: number };

type AddGuestForm = {
  name: string; phone: string; relation: string;
  side: string; is_vip: boolean; category_id: string;
};

type ParsedRow = {
  name: string; phone: string; relation: string;
  side: string; category_name: string;
  _error?: string;
};

const WEDDING_SLUG = "ravi-and-meera";
const PAGE_SIZE    = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const a   = document.createElement("a");
  a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Very small CSV parser — handles quoted fields. */
function parseCSVText(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const cells: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cells.push(cur.trim());
      return cells;
    });
}

function normalizeSide(raw: string): string {
  const v = raw.trim().toUpperCase();
  if (["BRIDE", "B", "BRIDE SIDE"].includes(v)) return "BRIDE";
  if (["GROOM", "G", "GROOM SIDE"].includes(v)) return "GROOM";
  if (["COMMON", "C", "BOTH", "MUTUAL"].includes(v)) return "COMMON";
  return v; // let API validate
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ guest }: { guest: Guest }) {
  if (guest.has_rsvp)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
        ✓ RSVPed
      </span>
    );
  if (guest.has_opened)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Opened
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
      Not Opened
    </span>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url); setDone(true); toast.success("Copied!"); setTimeout(() => setDone(false), 2000); }}
      title="Copy personal invite link"
      className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
    >
      {done ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Guest row ────────────────────────────────────────────────────────────────

function GuestRow({ guest, onDelete, deleting }: {
  guest: Guest;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  const waMsg = encodeURIComponent(
    `Dear ${guest.name}, you are warmly invited to Ravi & Meera's wedding!\nDetails & RSVP: ${guest.invite_url} 🙏`
  );
  const waUrl = guest.phone
    ? `https://api.whatsapp.com/send?phone=91${guest.phone.replace(/\D/g, "")}&text=${waMsg}`
    : `https://wa.me/?text=${waMsg}`;

  const sidePill: Record<string, string> = {
    BRIDE:  "bg-pink-50 text-pink-700",
    GROOM:  "bg-blue-50 text-blue-700",
    COMMON: "bg-zinc-100 text-zinc-600",
  };

  return (
    <TableRow className="border-zinc-100 group">
      {/* Name */}
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-800">{guest.name}</span>
          {guest.is_vip && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
        </div>
        {guest.relation && (
          <p className="text-[11px] text-zinc-400 mt-0.5">{guest.relation}</p>
        )}
      </TableCell>
      {/* Phone */}
      <TableCell className="py-2.5 text-sm text-zinc-500 tabular-nums hidden md:table-cell">
        {guest.phone ?? <span className="text-zinc-300">—</span>}
      </TableCell>
      {/* Category */}
      <TableCell className="py-2.5 hidden lg:table-cell">
        {guest.category
          ? <span className="text-sm text-zinc-600">{guest.category.name}</span>
          : <span className="text-xs text-zinc-300">Uncategorized</span>}
      </TableCell>
      {/* Side */}
      <TableCell className="py-2.5 hidden md:table-cell">
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", sidePill[guest.side] ?? "bg-zinc-100 text-zinc-600")}>
          {guest.side === "COMMON" ? "Common" : guest.side === "BRIDE" ? "Bride" : "Groom"}
        </span>
      </TableCell>
      {/* VIP */}
      <TableCell className="py-2.5 hidden lg:table-cell text-center">
        {guest.is_vip
          ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mx-auto" />
          : <StarOff className="h-3.5 w-3.5 text-zinc-200 mx-auto" />}
      </TableCell>
      {/* Status */}
      <TableCell className="py-2.5"><StatusBadge guest={guest} /></TableCell>
      {/* Actions */}
      <TableCell className="py-2.5">
        <div className="flex items-center gap-0.5">
          <CopyBtn url={guest.invite_url} />
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            title={`Send WhatsApp to ${guest.name}`}
            className="p-1.5 rounded text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors">
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
          {confirming ? (
            <>
              <button onClick={() => { onDelete(guest.id); setConfirming(false); }} disabled={deleting}
                className="px-2 py-1 rounded text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50">
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
              </button>
              <button onClick={() => setConfirming(false)}
                className="px-2 py-1 rounded text-[11px] font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} title="Delete guest"
              className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Add guest dialog ─────────────────────────────────────────────────────────

function AddGuestDialog({ open, onOpenChange, categories, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  onCreated: () => void;
}) {
  const EMPTY: AddGuestForm = { name: "", phone: "", relation: "", side: "COMMON", is_vip: false, category_id: "" };
  const [form, setForm]     = useState<AddGuestForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const nameRef             = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setForm(EMPTY); setTimeout(() => nameRef.current?.focus(), 50); } }, [open]); // eslint-disable-line

  const set = (k: keyof AddGuestForm) => (v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        form.name.trim(),
          phone:       form.phone.trim()    || null,
          relation:    form.relation.trim() || null,
          side:        form.side,
          is_vip:      form.is_vip,
          category_id: form.category_id    || null,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Failed"); }
      toast.success(`Guest "${form.name.trim()}" added!`);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add guest");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Add Guest</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Name <span className="text-red-500">*</span></label>
            <Input ref={nameRef} value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder='e.g. "Anitha Jose"' required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Phone</label>
            <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="9876543210" inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Relation</label>
            <Input value={form.relation} onChange={(e) => set("relation")(e.target.value)} placeholder='e.g. "Uncle", "College Friend"' />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Side <span className="text-red-500">*</span></label>
              <Select value={form.side} onValueChange={(v) => set("side")(v ?? "COMMON")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRIDE">Bride</SelectItem>
                  <SelectItem value="GROOM">Groom</SelectItem>
                  <SelectItem value="COMMON">Common</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Category</label>
              <Select value={form.category_id || "__none__"} onValueChange={(v) => set("category_id")((v ?? "__none__") === "__none__" ? "" : (v ?? ""))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_vip} onChange={(e) => set("is_vip")(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
            <span className="text-sm text-zinc-700 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Mark as VIP
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Add Guest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk upload dialog ───────────────────────────────────────────────────────

function BulkUploadDialog({ open, onOpenChange, onUploaded }: {
  open: boolean; onOpenChange: (v: boolean) => void; onUploaded: () => void;
}) {
  const [rows,     setRows]     = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result,   setResult]   = useState<{ created: number; duplicates: number; errors: unknown[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setRows([]); setResult(null); } }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVText(text);
      if (!parsed.length) { toast.error("Empty file"); return; }

      // Detect header row
      const first = parsed[0].map((c) => c.toLowerCase());
      const hasHeader = first.some((c) => ["name", "phone", "side", "relation"].includes(c));
      const dataRows  = hasHeader ? parsed.slice(1) : parsed;

      const mapped: ParsedRow[] = dataRows.map((cols) => {
        const [nameRaw = "", phoneRaw = "", relationRaw = "", sideRaw = "", catRaw = ""] = cols;
        const name  = nameRaw.trim();
        const side  = normalizeSide(sideRaw || "COMMON");
        const valid = ["BRIDE", "GROOM", "COMMON"].includes(side);
        return {
          name, phone: phoneRaw.trim(), relation: relationRaw.trim(),
          side, category_name: catRaw.trim(),
          _error: !name ? "Missing name" : !valid ? `Invalid side: "${sideRaw}"` : undefined,
        };
      }).filter((r) => r.name || r._error);

      setRows(mapped);
    };
    reader.readAsText(file);
  };

  const upload = async () => {
    const valid = rows.filter((r) => !r._error);
    if (!valid.length) { toast.error("No valid rows to upload"); return; }
    setUploading(true);
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/guests/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: valid.map(({ _error: _, ...r }) => r) }),
      });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) { toast.success(`${data.created} guests added!`); onUploaded(); }
      else toast.warning("No new guests added.");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const validCount   = rows.filter((r) => !r._error).length;
  const invalidCount = rows.filter((r) => r._error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader><DialogTitle>Bulk Upload Guests</DialogTitle></DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-1">
          {/* Format hint */}
          <div className="rounded-md bg-zinc-50 border border-zinc-100 p-3">
            <p className="text-xs font-medium text-zinc-700 mb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Expected CSV format
            </p>
            <code className="text-[11px] text-zinc-500 font-mono">
              Name, Phone, Relation, Side, Category
            </code>
            <p className="text-[11px] text-zinc-400 mt-1">
              Side values: <code className="bg-zinc-100 px-1 rounded">BRIDE</code>{" "}
              <code className="bg-zinc-100 px-1 rounded">GROOM</code>{" "}
              <code className="bg-zinc-100 px-1 rounded">COMMON</code> — header row is optional.
            </p>
          </div>

          {/* File input */}
          {!rows.length && !result && (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 py-10 cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-7 w-7 text-zinc-300 mb-2" />
              <p className="text-sm font-medium text-zinc-500">Click to select a CSV file</p>
              <p className="text-xs text-zinc-400 mt-0.5">.csv files only</p>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !result && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{rows.length} rows</Badge>
                {validCount > 0 && <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">{validCount} valid</Badge>}
                {invalidCount > 0 && <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">{invalidCount} errors</Badge>}
                <button onClick={() => { setRows([]); if (inputRef.current) inputRef.current.value = ""; }}
                  className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 underline">
                  Clear
                </button>
              </div>
              <div className="rounded-md border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-zinc-100">
                        {["Name","Phone","Relation","Side","Category"].map((h) => (
                          <TableHead key={h} className="text-xs text-zinc-500 py-2">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i} className={cn("border-zinc-100 text-xs", r._error && "bg-red-50")}>
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1">
                              {r._error && <span title={r._error}><AlertCircle className="h-3 w-3 text-red-500 shrink-0" /></span>}
                              <span className={r._error ? "text-red-700" : ""}>{r.name || <span className="text-zinc-300">—</span>}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 text-zinc-500">{r.phone  || <span className="text-zinc-300">—</span>}</TableCell>
                          <TableCell className="py-1.5 text-zinc-500">{r.relation || <span className="text-zinc-300">—</span>}</TableCell>
                          <TableCell className="py-1.5">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded font-medium",
                              r.side === "BRIDE" ? "bg-pink-50 text-pink-700" : r.side === "GROOM" ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-600"
                            )}>{r.side}</span>
                          </TableCell>
                          <TableCell className="py-1.5 text-zinc-500">{r.category_name || <span className="text-zinc-300">—</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100">
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Upload complete</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {result.created} created · {result.duplicates} duplicates skipped
                    {result.errors.length > 0 && ` · ${result.errors.length} errors`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-zinc-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && rows.length > 0 && (
            <Button onClick={upload} disabled={uploading || validCount === 0}>
              {uploading
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading…</>
                : `Upload ${validCount} Guest${validCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-100", className)} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const [guests,      setGuests]      = useState<Guest[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [pagination,  setPagination]  = useState<Pagination>({ total: 0, page: 1, limit: PAGE_SIZE, total_pages: 0 });
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [addOpen,     setAddOpen]     = useState(false);
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [exporting,   setExporting]   = useState(false);

  // Filters
  const [search,     setSearch]     = useState("");
  const [debSearch,  setDebSearch]  = useState("");
  const [categoryF,  setCategoryF]  = useState("__all__");
  const [sideF,      setSideF]      = useState("__all__");
  const [vipF,       setVipF]       = useState("__all__");
  const [statusF,    setStatusF]    = useState("__all__");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useLayoutEffect(() => { setPage(1); }, [categoryF, sideF, vipF, statusF]);

  // ── Build query params ───────────────────────────────────────────────────
  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page",  String(page));
    p.set("limit", String(PAGE_SIZE));
    if (debSearch)                p.set("search",      debSearch);
    if (categoryF !== "__all__") {
      if (categoryF === "__none__") {
        // "Uncategorized" — API doesn't support this filter natively; filter client-side
      } else {
        p.set("category_id", categoryF);
      }
    }
    if (sideF !== "__all__")    p.set("side",      sideF);
    if (vipF === "vip")         p.set("is_vip",    "true");
    if (statusF === "not_opened")     { p.set("has_opened", "false"); }
    else if (statusF === "opened_norsvp") { p.set("has_opened", "true"); p.set("has_rsvp", "false"); }
    else if (statusF === "rsvped")        { p.set("has_rsvp", "true"); }
    return p.toString();
  }, [page, debSearch, categoryF, sideF, vipF, statusF]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/guests?${buildParams()}`);
      if (!res.ok) throw new Error("Failed to load guests");
      const json = await res.json();
      let data: Guest[] = json.data ?? [];
      // Client-side "uncategorized" filter
      if (categoryF === "__none__") data = data.filter((g) => !g.category);
      setGuests(data);
      setPagination(json.pagination ?? { total: 0, page: 1, limit: PAGE_SIZE, total_pages: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load guests");
    } finally { setLoading(false); }
  }, [buildParams, categoryF]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/categories`);
      if (res.ok) setCategories(await res.json());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      toast.success("Guest deleted");
      fetchGuests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally { setDeletingId(null); }
  };

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams(buildParams());
      p.set("limit", "1000"); p.set("page", "1");
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/guests?${p}`);
      if (!res.ok) throw new Error("Export failed");
      const json = await res.json();
      const all: Guest[] = json.data ?? [];
      const rows = [
        ["Name","Phone","Category","Side","VIP","Relation","Status","Invite URL"],
        ...all.map((g) => [
          g.name, g.phone ?? "", g.category?.name ?? "", g.side,
          g.is_vip ? "Yes" : "No", g.relation ?? "",
          g.has_rsvp ? "RSVPed" : g.has_opened ? "Opened" : "Not Opened",
          g.invite_url,
        ]),
      ];
      downloadCSV(rows, `guests-${WEDDING_SLUG}-${new Date().toISOString().slice(0,10)}.csv`);
      toast.success(`Exported ${all.length} guests`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setExporting(false); }
  };

  const from = pagination.total ? (pagination.page - 1) * PAGE_SIZE + 1 : 0;
  const to   = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Guests</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {loading ? "Loading…" : `${pagination.total} guest${pagination.total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Bulk Upload
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Guest
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Category */}
        <Select value={categoryF} onValueChange={(v) => { setCategoryF(v ?? "__all__"); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[155px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            <SelectItem value="__none__">Uncategorized</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Side */}
        <Select value={sideF} onValueChange={(v) => { setSideF(v ?? "__all__"); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[120px]"><SelectValue placeholder="Side" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Sides</SelectItem>
            <SelectItem value="BRIDE">Bride Side</SelectItem>
            <SelectItem value="GROOM">Groom Side</SelectItem>
            <SelectItem value="COMMON">Common</SelectItem>
          </SelectContent>
        </Select>

        {/* VIP */}
        <Select value={vipF} onValueChange={(v) => { setVipF(v ?? "__all__"); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[110px]"><SelectValue placeholder="VIP" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Guests</SelectItem>
            <SelectItem value="vip">VIP Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={statusF} onValueChange={(v) => { setStatusF(v ?? "__all__"); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[165px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="not_opened">Not Opened</SelectItem>
            <SelectItem value="opened_norsvp">Opened, No RSVP</SelectItem>
            <SelectItem value="rsvped">RSVPed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-zinc-200 shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-zinc-500">Name</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 hidden lg:table-cell">Category</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 hidden md:table-cell">Side</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 hidden lg:table-cell text-center">VIP</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500">Status</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-zinc-100">
                      <TableCell><div className="space-y-1"><Sk className="h-4 w-32" /><Sk className="h-3 w-20" /></div></TableCell>
                      <TableCell className="hidden md:table-cell"><Sk className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Sk className="h-4 w-28" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Sk className="h-5 w-14 rounded-full" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Sk className="h-4 w-4 mx-auto" /></TableCell>
                      <TableCell><Sk className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><div className="flex gap-1"><Sk className="h-7 w-7 rounded" /><Sk className="h-7 w-7 rounded" /><Sk className="h-7 w-7 rounded" /></div></TableCell>
                    </TableRow>
                  ))
                : guests.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <Users className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">No guests found</p>
                        {(debSearch || categoryF !== "__all__" || sideF !== "__all__" || vipF !== "__all__" || statusF !== "__all__") && (
                          <button onClick={() => { setSearch(""); setDebSearch(""); setCategoryF("__all__"); setSideF("__all__"); setVipF("__all__"); setStatusF("__all__"); }}
                            className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 underline">
                            Clear filters
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                : guests.map((g) => (
                    <GuestRow key={g.id} guest={g} onDelete={handleDelete} deleting={deletingId === g.id} />
                  ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {!loading && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span className="text-xs">
            Showing <strong className="text-zinc-700">{from}–{to}</strong> of{" "}
            <strong className="text-zinc-700">{pagination.total}</strong> guests
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs tabular-nums text-zinc-600">
              {page} / {pagination.total_pages}
            </span>
            <Button size="sm" variant="outline" disabled={page === pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddGuestDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        onCreated={fetchGuests}
      />
      <BulkUploadDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onUploaded={fetchGuests}
      />
    </div>
  );
}
