import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DietaryPreference, SourceType } from "@prisma/client";

type Params = { params: { slug: string } };

type EventSelectionInput = {
  event_id: string;
  attending: boolean;
  guest_count: number;
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      guest_count,
      dietary_preference,
      dietary_note,
      transport_needed,
      accommodation_needed,
      message,
      source_type,
      source_category_id,
      guest_id,
      event_selections,
    } = body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }
    if (!source_type || !Object.values(SourceType).includes(source_type)) {
      return NextResponse.json(
        { error: `Invalid source_type. Must be one of: ${Object.values(SourceType).join(", ")}` },
        { status: 400 }
      );
    }
    if (!dietary_preference || !Object.values(DietaryPreference).includes(dietary_preference)) {
      return NextResponse.json(
        { error: `Invalid dietary_preference. Must be one of: ${Object.values(DietaryPreference).join(", ")}` },
        { status: 400 }
      );
    }

    // ── Validate foreign keys belong to this wedding ──────────────────────
    if (guest_id) {
      const guest = await prisma.guest.findFirst({
        where: { id: guest_id, wedding_id: wedding.id },
        select: { id: true },
      });
      if (!guest) {
        return NextResponse.json({ error: "Guest not found for this wedding" }, { status: 400 });
      }
    }

    if (source_category_id) {
      const cat = await prisma.category.findFirst({
        where: { id: source_category_id, wedding_id: wedding.id },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Category not found for this wedding" }, { status: 400 });
      }
    }

    // ── Validate event selections ─────────────────────────────────────────
    const selections: EventSelectionInput[] = Array.isArray(event_selections) ? event_selections : [];
    if (selections.length > 0) {
      const eventIds = selections.map((s) => s.event_id);
      const validEvents = await prisma.event.findMany({
        where: { id: { in: eventIds }, wedding_id: wedding.id },
        select: { id: true },
      });
      const validIds = new Set(validEvents.map((e) => e.id));
      const invalid = eventIds.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid event_ids for this wedding: ${invalid.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // ── Create RSVP with nested event selections ──────────────────────────
    const rsvp = await prisma.rsvp.create({
      data: {
        wedding_id:            wedding.id,
        guest_id:              guest_id              ?? null,
        source_category_id:    source_category_id    ?? null,
        name:                  name.trim(),
        phone:                 phone                 ?? null,
        guest_count:           Number(guest_count)   || 1,
        dietary_preference,
        dietary_note:          dietary_note          ?? null,
        transport_needed:      transport_needed      ?? false,
        accommodation_needed:  accommodation_needed  ?? false,
        source_type,
        message:               message               ?? null,
        event_selections: {
          create: selections.map((s) => ({
            event_id:    s.event_id,
            attending:   Boolean(s.attending),
            guest_count: Number(s.guest_count) || 1,
          })),
        },
      },
      include: {
        event_selections: {
          include: { event: { select: { id: true, name: true } } },
        },
        source_category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        rsvp: {
          id:                   rsvp.id,
          name:                 rsvp.name,
          guest_count:          rsvp.guest_count,
          dietary_preference:   rsvp.dietary_preference,
          transport_needed:     rsvp.transport_needed,
          accommodation_needed: rsvp.accommodation_needed,
          source_type:          rsvp.source_type,
          source_category:      rsvp.source_category,
          events_attending:     rsvp.event_selections
            .filter((s) => s.attending)
            .map((s) => ({ event_id: s.event_id, name: s.event.name, guest_count: s.guest_count })),
          created_at:           rsvp.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[POST /api/weddings/${params.slug}/rsvp]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
