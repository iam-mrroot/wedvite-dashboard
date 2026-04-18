import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DietaryPreference } from "@prisma/client";

type Params = { params: { slug: string } };

type DailyTrendRow = { date: Date; count: bigint };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }
    const wid = wedding.id;

    // ── Run independent queries in parallel ───────────────────────────────
    const [
      total_clicks,
      uniqueIpGroups,
      total_rsvps,
      attending_rsvps,
      guestCountAgg,
      categories,
      rsvpByCategory,
      clicksByCategory,
      attendingSelections,
      vipNotResponded,
      dailyTrend,
    ] = await Promise.all([
      // 1. Total link clicks
      prisma.linkClick.count({ where: { wedding_id: wid } }),

      // 2. Unique IPs
      prisma.linkClick.groupBy({
        by: ["ip_address"],
        where: { wedding_id: wid, ip_address: { not: null } },
      }),

      // 3. Total RSVP submissions
      prisma.rsvp.count({ where: { wedding_id: wid } }),

      // 4. RSVPs where at least one event was confirmed attending
      prisma.rsvp.count({
        where: { wedding_id: wid, event_selections: { some: { attending: true } } },
      }),

      // 5. Sum of all guest_counts
      prisma.rsvp.aggregate({
        where: { wedding_id: wid },
        _sum: { guest_count: true },
      }),

      // 6. All categories
      prisma.category.findMany({
        where: { wedding_id: wid },
        select: { id: true, name: true, slug: true },
        orderBy: { created_at: "asc" },
      }),

      // 7. RSVPs grouped by source category
      prisma.rsvp.groupBy({
        by: ["source_category_id"],
        where: { wedding_id: wid },
        _count: { id: true },
        _sum: { guest_count: true },
      }),

      // 8. Clicks grouped by category
      prisma.linkClick.groupBy({
        by: ["category_id"],
        where: { wedding_id: wid },
        _count: { id: true },
      }),

      // 9. All attending event selections with RSVP dietary info
      prisma.rsvpEventSelection.findMany({
        where: {
          attending: true,
          event: { wedding_id: wid },
        },
        select: {
          event_id: true,
          guest_count: true,
          rsvp: { select: { dietary_preference: true } },
        },
      }),

      // 10. VIP guests with no linked RSVP
      prisma.guest.findMany({
        where: {
          wedding_id: wid,
          is_vip: true,
          rsvps: { none: {} },
        },
        select: {
          name: true,
          phone: true,
          category: { select: { name: true } },
          link_clicks: { take: 1, select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),

      // 11. Daily RSVP trend (raw SQL for DATE() grouping)
      prisma.$queryRaw<DailyTrendRow[]>`
        SELECT DATE("created_at") AS date, COUNT(*)::int AS count
        FROM "Rsvp"
        WHERE "wedding_id" = ${wid}
        GROUP BY DATE("created_at")
        ORDER BY date ASC
      `,
    ]);

    // ── Assemble category breakdown ───────────────────────────────────────
    const rsvpByCatMap = new Map(
      rsvpByCategory.map((r) => [r.source_category_id ?? "__none__", r])
    );
    const clicksByCatMap = new Map(
      clicksByCategory.map((c) => [c.category_id ?? "__none__", c])
    );

    const category_breakdown = categories.map((cat) => {
      const rsvpRow  = rsvpByCatMap.get(cat.id);
      const clickRow = clicksByCatMap.get(cat.id);
      return {
        category_name: cat.name,
        slug:          cat.slug,
        clicks:        clickRow?._count.id ?? 0,
        rsvps:         rsvpRow?._count.id ?? 0,
        guest_count:   rsvpRow?._sum.guest_count ?? 0,
      };
    });

    // ── Assemble event breakdown ──────────────────────────────────────────
    const events = await prisma.event.findMany({
      where: { wedding_id: wid },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true },
    });

    // Group attending selections by event_id
    const selsByEvent = new Map<string, typeof attendingSelections>();
    for (const sel of attendingSelections) {
      if (!selsByEvent.has(sel.event_id)) selsByEvent.set(sel.event_id, []);
      selsByEvent.get(sel.event_id)!.push(sel);
    }

    const dietaryKeys = Object.values(DietaryPreference);

    const event_breakdown = events.map((event) => {
      const sels = selsByEvent.get(event.id) ?? [];
      const confirmed_count = sels.length;
      const total_guests    = sels.reduce((sum, s) => sum + s.guest_count, 0);

      // Count dietary preferences across RSVPs attending this event
      const dietary = Object.fromEntries(dietaryKeys.map((k) => [k.toLowerCase(), 0])) as Record<string, number>;
      for (const sel of sels) {
        const key = sel.rsvp.dietary_preference.toLowerCase();
        dietary[key] = (dietary[key] ?? 0) + 1;
      }

      return { event_name: event.name, confirmed_count, total_guests, dietary };
    });

    // ── VIP not responded ─────────────────────────────────────────────────
    const not_responded_vip = vipNotResponded.map((g) => ({
      guest_name: g.name,
      phone:      g.phone ?? null,
      category:   g.category?.name ?? null,
      opened:     g.link_clicks.length > 0,
    }));

    // ── Daily trend ───────────────────────────────────────────────────────
    const daily_rsvp_trend = dailyTrend.map((row) => ({
      date:  row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10),
      count: Number(row.count),
    }));

    return NextResponse.json({
      total_clicks,
      unique_clicks:      uniqueIpGroups.length,
      total_rsvps,
      total_attending:    attending_rsvps,
      total_guest_count:  guestCountAgg._sum.guest_count ?? 0,
      category_breakdown,
      event_breakdown,
      not_responded_vip,
      daily_rsvp_trend,
    });
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}/analytics]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
