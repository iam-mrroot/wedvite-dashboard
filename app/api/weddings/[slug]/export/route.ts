import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string } };

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function row(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

// GET /api/weddings/[slug]/export
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      select: { id: true, bride_name: true, groom_name: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const rsvps = await prisma.rsvp.findMany({
      where: { wedding_id: wedding.id },
      orderBy: { created_at: "asc" },
      include: {
        guest: {
          select: {
            side: true,
            category: { select: { name: true } },
          },
        },
        source_category: { select: { name: true } },
        event_selections: {
          where: { attending: true },
          include: {
            event: { select: { name: true } },
          },
          orderBy: { event: { sort_order: "asc" } },
        },
      },
    });

    // ── Build CSV ────────────────────────────────────────────────────────
    const headers = [
      "Name",
      "Phone",
      "Category",
      "Side",
      "Events Attending",
      "Guest Count",
      "Dietary Preference",
      "Transport Needed",
      "Accommodation Needed",
      "Message",
      "Submitted At",
    ];

    const lines: string[] = [headers.join(",")];

    for (const r of rsvps) {
      // Category: prefer guest's category, fall back to the source category
      const category =
        r.guest?.category?.name ?? r.source_category?.name ?? "";

      // Side: only available when RSVP is linked to a known guest
      const side = r.guest?.side ?? "";

      // Events: comma-separated names of events marked attending
      const eventsAttending = r.event_selections
        .map((s) => s.event.name)
        .join("; ");

      lines.push(
        row([
          r.name,
          r.phone ?? "",
          category,
          side,
          eventsAttending,
          r.guest_count,
          r.dietary_preference,
          r.transport_needed ? "Yes" : "No",
          r.accommodation_needed ? "Yes" : "No",
          r.message ?? "",
          r.created_at.toISOString(),
        ])
      );
    }

    const csv = lines.join("\n");
    const filename = `rsvp-export-${params.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Explicit charset ensures Google Sheets reads accented names correctly
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}/export]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
