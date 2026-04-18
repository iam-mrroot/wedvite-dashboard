import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string } };

// GET /api/weddings/[slug]/events
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const events = await prisma.event.findMany({
      where: { wedding_id: wedding.id },
      orderBy: { sort_order: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}/events]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/weddings/[slug]/events
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
      date,
      start_time,
      venue_name,
      venue_address,
      venue_lat,
      venue_lng,
      sort_order,
      end_time,
      venue_map_url,
    } = body;

    if (!name || !date || !start_time || !venue_name || !venue_address ||
        venue_lat == null || venue_lng == null || sort_order == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, date, start_time, venue_name, venue_address, venue_lat, venue_lng, sort_order" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        wedding_id: wedding.id,
        name,
        date: new Date(date),
        start_time,
        end_time: end_time ?? null,
        venue_name,
        venue_address,
        venue_lat: Number(venue_lat),
        venue_lng: Number(venue_lng),
        venue_map_url: venue_map_url ?? null,
        sort_order: Number(sort_order),
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error(`[POST /api/weddings/${params.slug}/events]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
