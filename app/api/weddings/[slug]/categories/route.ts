import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string } };

function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildInviteUrl(req: NextRequest, weddingSlug: string, categorySlug: string): string {
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  return `${origin}/invite/${weddingSlug}/${categorySlug}`;
}

// POST /api/weddings/[slug]/categories
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
    const { name, custom_greeting, whatsapp_message_template } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    // Generate unique slug within this wedding
    let baseSlug = toCategorySlug(name);
    if (!baseSlug) {
      return NextResponse.json({ error: "Invalid name: could not generate a slug" }, { status: 400 });
    }

    let slug = baseSlug;
    const existing = await prisma.category.findUnique({
      where: { wedding_id_slug: { wedding_id: wedding.id, slug } },
    });

    if (existing) {
      let counter = 2;
      while (
        await prisma.category.findUnique({
          where: { wedding_id_slug: { wedding_id: wedding.id, slug: `${baseSlug}-${counter}` } },
        })
      ) {
        counter++;
      }
      slug = `${baseSlug}-${counter}`;
    }

    const category = await prisma.category.create({
      data: {
        wedding_id: wedding.id,
        name: name.trim(),
        slug,
        custom_greeting: custom_greeting ?? null,
        whatsapp_message_template: whatsapp_message_template ?? null,
      },
    });

    return NextResponse.json(
      {
        ...category,
        invite_url: buildInviteUrl(req, params.slug, slug),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[POST /api/weddings/${params.slug}/categories]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/weddings/[slug]/categories
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { wedding_id: wedding.id },
      orderBy: { created_at: "asc" },
      include: {
        _count: {
          select: {
            link_clicks: true,
            rsvps: true,
          },
        },
      },
    });

    const result = categories.map((cat) => ({
      ...cat,
      link_click_count: cat._count.link_clicks,
      rsvp_count: cat._count.rsvps,
      invite_url: buildInviteUrl(req, params.slug, cat.slug),
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}/categories]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
