import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// PUT /api/events/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();

    // Strip immutable fields
    const { id: _id, wedding_id: _wid, created_at: _ca, ...updateData } = body;

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    if (updateData.venue_lat != null) updateData.venue_lat = Number(updateData.venue_lat);
    if (updateData.venue_lng != null) updateData.venue_lng = Number(updateData.venue_lng);
    if (updateData.sort_order != null) updateData.sort_order = Number(updateData.sort_order);

    const event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(event);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error(`[PUT /api/events/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/events/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.event.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    console.error(`[DELETE /api/events/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
