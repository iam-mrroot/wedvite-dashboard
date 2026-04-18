import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// DELETE /api/guests/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Delete RSVPs explicitly — schema uses onDelete: SetNull on guest_id,
    // which would orphan them. We want hard deletion here.
    await prisma.rsvp.deleteMany({ where: { guest_id: params.id } });

    await prisma.guest.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    console.error(`[DELETE /api/guests/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
