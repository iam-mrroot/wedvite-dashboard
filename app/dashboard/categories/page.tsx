"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Copy, Check, Pencil, Trash2,
  MessageCircle, Globe, FolderOpen, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  slug: string;
  custom_greeting: string | null;
  whatsapp_message_template: string | null;
  created_at: string;
  link_click_count: number;
  rsvp_count: number;
  invite_url: string;
};

type FormState = {
  name: string;
  custom_greeting: string;
  whatsapp_message_template: string;
};

const WEDDING_SLUG = "ravi-and-meera";

const DEFAULT_TEMPLATE =
  `🎉 {groom} & {bride} cordially invite you!\n📅 {date}\n\nSee all details & RSVP here 👇\n{url}\n\nPlease confirm your attendance 🙏`;

const EMPTY_FORM: FormState = {
  name: "",
  custom_greeting: "",
  whatsapp_message_template: DEFAULT_TEMPLATE,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-100", className)} />;
}

function CategoryCardSkeleton() {
  return (
    <Card className="border-zinc-200 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Sk className="h-5 w-36" />
          <div className="flex gap-1"><Sk className="h-7 w-7 rounded" /><Sk className="h-7 w-7 rounded" /></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2"><Sk className="h-4 flex-1" /><Sk className="h-7 w-7 rounded" /></div>
        <div className="flex gap-3"><Sk className="h-8 w-20 rounded-lg" /><Sk className="h-8 w-20 rounded-lg" /><Sk className="h-8 w-20 rounded-lg" /></div>
        <Sk className="h-8 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100 min-w-0">
      <span className="text-base font-bold text-zinc-900 tabular-nums leading-none">{value}</span>
      <span className="text-[10px] text-zinc-400 font-medium mt-0.5">{label}</span>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy invite link"
      className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-600" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  onEdit,
  onDelete,
  deleting,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const displayUrl = category.invite_url.replace(/^https?:\/\/[^/]+/, "");

  const waMessage = encodeURIComponent(
    (category.whatsapp_message_template?.trim() ||
      `🎉 You're invited!\nSee details & RSVP: ${category.invite_url}`)
  );
  const waUrl = `https://wa.me/?text=${waMessage}`;

  return (
    <Card className="border-zinc-200 shadow-none hover:border-zinc-300 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-zinc-900 leading-snug">
            {category.name}
          </CardTitle>

          <div className="flex items-center gap-1 shrink-0">
            {confirmingDelete ? (
              <>
                <button
                  onClick={() => { onDelete(category.id); setConfirmingDelete(false); }}
                  disabled={deleting}
                  className="px-2 py-1 rounded text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="px-2 py-1 rounded text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit(category)}
                  title="Edit category"
                  className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  title="Delete category"
                  className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Invite link */}
        <div className="flex items-center gap-1 rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-1.5">
          <span className="text-xs text-zinc-400 font-mono truncate min-w-0" title={category.invite_url}>
            {displayUrl}
          </span>
          <CopyUrlButton url={category.invite_url} />
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <StatChip label="Opens"    value={category.link_click_count} />
          <StatChip label="RSVPs"    value={category.rsvp_count}       />
          <StatChip label="Attending" value={category.rsvp_count}      />
        </div>

        {/* WhatsApp share */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Share via WhatsApp
        </a>
      </CardContent>
    </Card>
  );
}

// ─── Universal link card ──────────────────────────────────────────────────────

function UniversalLinkCard({
  origin, universalRsvps,
}: {
  origin: string; universalRsvps: number;
}) {
  const url = `${origin}/invite/${WEDDING_SLUG}`;
  const displayUrl = `/invite/${WEDDING_SLUG}`;
  const waMsg = encodeURIComponent(
    `🎉 You're invited to Ravi & Meera's wedding!\nSee all details & RSVP here: ${url} 🙏`
  );

  return (
    <Card className="border-zinc-200 shadow-none border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-zinc-100 flex items-center justify-center">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <CardTitle className="text-sm font-semibold text-zinc-900">Universal Link</CardTitle>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
            Open
          </Badge>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Sharable to anyone — no category assigned. All RSVPs are untagged.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1 rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-1.5">
          <span className="text-xs text-zinc-400 font-mono truncate min-w-0">{displayUrl}</span>
          <CopyUrlButton url={url} />
        </div>
        <div className="flex gap-2">
          <StatChip label="RSVPs" value={universalRsvps} />
        </div>
        <a
          href={`https://wa.me/?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Share via WhatsApp
        </a>
      </CardContent>
    </Card>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function CategoryDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
  onSubmit: (data: FormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const nameRef = useRef<HTMLInputElement>(null);

  // Sync form when the dialog opens or editing target changes
  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name:                     editing.name,
              custom_greeting:          editing.custom_greeting         ?? "",
              whatsapp_message_template: editing.whatsapp_message_template ?? DEFAULT_TEMPLATE,
            }
          : EMPTY_FORM
      );
      // Focus name input after animation frame
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, editing]);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Category Name <span className="text-red-500">*</span>
            </label>
            <Input
              ref={nameRef}
              value={form.name}
              onChange={set("name")}
              placeholder='e.g. "College Friends"'
              required
            />
          </div>

          {/* Custom greeting */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Custom Greeting <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.custom_greeting}
              onChange={set("custom_greeting")}
              placeholder='e.g. "With love from the Thomas family, you are warmly invited"'
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* WhatsApp template */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              WhatsApp Message Template{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.whatsapp_message_template}
              onChange={set("whatsapp_message_template")}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className="text-[11px] text-zinc-400 leading-snug">
              Variables: <code className="bg-zinc-100 px-1 rounded">{"{bride}"}</code>{" "}
              <code className="bg-zinc-100 px-1 rounded">{"{groom}"}</code>{" "}
              <code className="bg-zinc-100 px-1 rounded">{"{date}"}</code>{" "}
              <code className="bg-zinc-100 px-1 rounded">{"{url}"}</code>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editing ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [editing,        setEditing]        = useState<Category | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [universalRsvps, setUniversalRsvps] = useState(0);
  const [origin,         setOrigin]         = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, rsvpRes] = await Promise.all([
        fetch(`/api/weddings/${WEDDING_SLUG}/categories`),
        fetch(`/api/weddings/${WEDDING_SLUG}/rsvps?source_type=UNIVERSAL_LINK`),
      ]);

      if (!catRes.ok) throw new Error("Failed to load categories");
      setCategories(await catRes.json());

      if (rsvpRes.ok) {
        const rsvpData = await rsvpRes.json();
        setUniversalRsvps(rsvpData.total ?? 0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async (form: FormState) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${WEDDING_SLUG}/categories`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:                      form.name.trim(),
          custom_greeting:           form.custom_greeting.trim()           || null,
          whatsapp_message_template: form.whatsapp_message_template.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Create failed");
      }
      toast.success(`Category "${form.name.trim()}" created!`);
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = async (form: FormState) => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${editing.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:                      form.name.trim(),
          custom_greeting:           form.custom_greeting.trim()           || null,
          whatsapp_message_template: form.whatsapp_message_template.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Update failed");
      }
      toast.success("Category updated!");
      setDialogOpen(false);
      setEditing(null);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const target = categories.find((c) => c.id === id);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Delete failed");
      }
      toast.success(`"${target?.name}" deleted`);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit   = (c: Category) => { setEditing(c); setDialogOpen(true); };

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Categories</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage guest groups and their invite links.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Category
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white py-16 text-center">
          <FolderOpen className="h-8 w-8 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No categories yet</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Create your first category to generate group invite links.
          </p>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingId === cat.id}
            />
          ))}
        </div>
      )}

      {/* Universal link */}
      {!loading && (
        <div className="mt-6">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
            Universal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <UniversalLinkCard origin={origin} universalRsvps={universalRsvps} />
          </div>
        </div>
      )}

      {/* Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        editing={editing}
        onSubmit={editing ? handleEdit : handleCreate}
        saving={saving}
      />
    </div>
  );
}
