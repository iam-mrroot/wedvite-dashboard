import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LinkType } from "@prisma/client";

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  const u = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(u)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(u)) return "mobile";
  return "desktop";
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wedding_id, category_id, guest_id, link_type, user_agent } = body;

    if (!wedding_id || typeof wedding_id !== "string") {
      return NextResponse.json({ error: "Missing required field: wedding_id" }, { status: 400 });
    }
    if (!link_type || !Object.values(LinkType).includes(link_type)) {
      return NextResponse.json(
        { error: `Invalid link_type. Must be one of: ${Object.values(LinkType).join(", ")}` },
        { status: 400 }
      );
    }

    // Verify wedding exists without blocking on a 404 — fire-and-forget tracking
    // is acceptable, but we still want to prevent orphaned rows
    const wedding = await prisma.wedding.findUnique({
      where: { id: wedding_id },
      select: { id: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const ua: string = typeof user_agent === "string" ? user_agent : (req.headers.get("user-agent") ?? "");
    const ip = getClientIp(req);

    await prisma.linkClick.create({
      data: {
        wedding_id,
        category_id:  category_id  ?? null,
        guest_id:     guest_id     ?? null,
        link_type,
        ip_address:   ip,
        user_agent:   ua || null,
        device_type:  ua ? detectDevice(ua) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/track/click]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
