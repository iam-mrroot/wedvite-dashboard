import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SourceType, Prisma } from "@prisma/client";

type Params = { params: { slug: string } };

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const { searchParams } = req.nextUrl;
    const source_type   = searchParams.get("source_type") as SourceType | null;
    const category_id   = searchParams.get("category_id");
    const event_id      = searchParams.get("event_id");
    const format        = searchParams.get("format"); // "csv"

    const where: Prisma.RsvpWhereInput = {
      wedding_id: wedding.id,
      ...(source_type && Object.values(SourceType).includes(source_type) && { source_type }),
      ...(category_id  && { source_category_id: category_id }),
      ...(event_id     && { event_selections: { some: { event_id } } }),
    };

    const rsvps = await prisma.rsvp.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        source_category: { select: { id: true, name: true, slug: true } },
        guest:           { select: { id: true, name: true, phone: true, is_vip: true } },
        event_selections: {
          include: {
            event: { select: { id: true, name: true, date: true } },
          },
        },
      },
    });

    // ── CSV export ────────────────────────────────────────────────────────
    if (format === "csv") {
      const headers = [
        "RSVP ID", "Submitted At", "Name", "Phone",
        "Guest Count", "Dietary Preference", "Dietary Note",
        "Transport Needed", "Accommodation Needed",
        "Source Type", "Source Category",
        "VIP Guest", "Events Attending", "Message",
      ];

      const rows = rsvps.map((r) => {
        const attendingEvents = r.event_selections
          .filter((s) => s.attending)
          .map((s) => `${s.event.name} (${s.guest_count})`)
          .join("; ");

        return [
          r.id,
          r.created_at.toISOString(),
          r.name,
          r.phone ?? "",
          r.guest_count,
          r.dietary_preference,
          r.dietary_note ?? "",
          r.transport_needed ? "Yes" : "No",
          r.accommodation_needed ? "Yes" : "No",
          r.source_type,
          r.source_category?.name ?? "",
          r.guest?.is_vip ? "Yes" : "No",
          attendingEvents,
          r.message ?? "",
        ].map(csvEscape).join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const filename = `rsvps-${params.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── JSON response ─────────────────────────────────────────────────────
    return NextResponse.json({ data: rsvps, total: rsvps.length });
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}/rsvps]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
