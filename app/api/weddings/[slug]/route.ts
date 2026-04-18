import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string } };

// GET /api/weddings/[slug]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
      include: {
        events: { orderBy: { sort_order: "asc" } },
        categories: { orderBy: { created_at: "asc" } },
      },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    return NextResponse.json(wedding);
  } catch (error) {
    console.error(`[GET /api/weddings/${params.slug}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/weddings/[slug]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();

    // Disallow changing the slug or id via this endpoint
    const { id: _id, slug: _slug, created_at: _ca, updated_at: _ua, ...updateData } = body;

    // Convert wedding_date string to Date if present
    if (updateData.wedding_date) {
      updateData.wedding_date = new Date(updateData.wedding_date);
    }

    const wedding = await prisma.wedding.update({
      where: { slug: params.slug },
      data: updateData,
    });

    return NextResponse.json(wedding);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }
    console.error(`[PUT /api/weddings/${params.slug}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
