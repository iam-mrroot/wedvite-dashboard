import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// PUT /api/categories/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();

    // Only these fields are updatable
    const { name, custom_greeting, whatsapp_message_template } = body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (custom_greeting !== undefined) updateData.custom_greeting = custom_greeting ?? null;
    if (whatsapp_message_template !== undefined)
      updateData.whatsapp_message_template = whatsapp_message_template ?? null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(category);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    console.error(`[PUT /api/categories/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    // Guests with this category_id are automatically set to null
    // via onDelete: SetNull defined in the Prisma schema
    await prisma.category.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    console.error(`[DELETE /api/categories/${params.id}]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
