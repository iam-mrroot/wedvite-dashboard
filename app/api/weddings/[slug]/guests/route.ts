import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Side, Prisma } from "@prisma/client";

type Params = { params: { slug: string } };

function toGuestSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildPersonalUrl(req: NextRequest, weddingSlug: string, guestSlug: string): string {
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  return `${origin}/invite/${weddingSlug}/guest/${guestSlug}`;
}

// POST /api/weddings/[slug]/guests
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
    const { name, phone, email, relation, side, is_vip, category_id } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }
    if (!side || !Object.values(Side).includes(side)) {
      return NextResponse.json(
        { error: `Missing or invalid field: side. Must be one of: ${Object.values(Side).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate category belongs to this wedding if provided
    if (category_id) {
      const cat = await prisma.category.findFirst({
        where: { id: category_id, wedding_id: wedding.id },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Category not found for this wedding" }, { status: 400 });
      }
    }

    // Generate unique slug within this wedding
    const baseSlug = toGuestSlug(name);
    if (!baseSlug) {
      return NextResponse.json({ error: "Invalid name: could not generate a slug" }, { status: 400 });
    }

    let slug = baseSlug;
    const taken = await prisma.guest.findUnique({
      where: { wedding_id_slug: { wedding_id: wedding.id, slug } },
    });
    if (taken) {
      let counter = 2;
      while (
        await prisma.guest.findUnique({
          where: { wedding_id_slug: { wedding_id: wedding.id, slug: `${baseSlug}-${counter}` } },
        })
      ) {
        counter++;
      }
      slug = `${baseSlug}-${counter}`;
    }

    const guest = await prisma.guest.create({
      data: {
        wedding_id: wedding.id,
        name: name.trim(),
        slug,
        phone: phone ?? null,
        email: email ?? null,
        relation: relation ?? null,
        side,
        is_vip: is_vip ?? false,
        category_id: category_id ?? null,
      },
    });

    return NextResponse.json(
      { ...guest, invite_url: buildPersonalUrl(req, params.slug, slug) },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[POST /api/weddings/${params.slug}/guests]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/weddings/[slug]/guests
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
    const category_id  = searchParams.get("category_id") ?? undefined;
    const side         = searchParams.get("side") as Side | null;
    const is_vip       = searchParams.get("is_vip");
    const has_rsvp     = searchParams.get("has_rsvp");
    const has_opened   = searchParams.get("has_opened");
    const search       = searchParams.get("search")?.trim();
    const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit        = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip         = (page - 1) * limit;

    const where: Prisma.GuestWhereInput = {
      wedding_id: wedding.id,
      ...(category_id  && { category_id }),
      ...(side && Object.values(Side).includes(side) && { side }),
      ...(is_vip    === "true"  && { is_vip: true }),
      ...(is_vip    === "false" && { is_vip: false }),
      ...(has_rsvp  === "true"  && { rsvps: { some: {} } }),
      ...(has_rsvp  === "false" && { rsvps: { none: {} } }),
      ...(has_opened === "true"  && { link_clicks: { some: {} } }),
      ...(has_opened === "false" && { link_clicks: { none: {} } }),
      ...(search && {
        name: { contains: search, mode: Prisma.QueryMode.insensitive },
      }),
    };

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { rsvps: true, link_clicks: true } },
        },
      }),
      prisma.guest.count({ where }),
    ]);

    const result = guests.map((g) => ({
      ...g,
      rsvp_count:   g._count.rsvps,
      click_count:  g._count.link_clicks,
      has_rsvp:     g._count.rsvps > 0,
      has_opened:   g._count.link_clicks > 0,
      invite_url:   buildPersonalUrl(req, params.slug, g.slug),
      _count:       undefined,
    }));

    return NextResponse.json({
      data: result,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}/guests]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
