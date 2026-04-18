import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateWhatsAppShareURL,
  generateWhatsAppDirectURL,
  generateCategoryShareMessage,
  generatePersonalShareMessage,
} from "@/lib/whatsapp";

type Params = { params: { slug: string } };

// POST /api/weddings/[slug]/whatsapp-links
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: params.slug },
    });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    // Optional override base URL from body (e.g. custom domain)
    let body: { base_url?: string } = {};
    try { body = await req.json(); } catch { /* body is optional */ }

    const origin = body.base_url?.replace(/\/$/, "")
      ?? req.headers.get("origin")
      ?? req.nextUrl.origin;

    const inviteBase = `${origin}/invite/${wedding.slug}`;

    // ── Fetch categories and VIP guests in parallel ───────────────────────
    const [categories, vipGuests] = await Promise.all([
      prisma.category.findMany({
        where: { wedding_id: wedding.id },
        orderBy: { created_at: "asc" },
      }),
      prisma.guest.findMany({
        where: {
          wedding_id: wedding.id,
          is_vip: true,
          phone: { not: null },
        },
        include: {
          category: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // ── Category share links ──────────────────────────────────────────────
    const categoryLinks = categories.map((cat) => {
      const catInviteURL = `${inviteBase}/${cat.slug}`;
      const message = generateCategoryShareMessage(wedding, cat, catInviteURL);
      return {
        id:                   cat.id,
        name:                 cat.name,
        slug:                 cat.slug,
        invite_url:           catInviteURL,
        share_url:            generateWhatsAppShareURL(message),
        direct_copy_message:  message,
      };
    });

    // ── VIP guest direct-send links ───────────────────────────────────────
    const vipLinks = vipGuests
      .filter((g) => g.phone)
      .map((g) => {
        const guestInviteURL = `${inviteBase}/guest/${g.slug}`;
        const message = generatePersonalShareMessage(wedding, g, guestInviteURL);
        return {
          id:               g.id,
          name:             g.name,
          phone:            g.phone!,
          category:         g.category?.name ?? null,
          invite_url:       guestInviteURL,
          direct_send_url:  generateWhatsAppDirectURL(g.phone!, message),
          message_preview:  message,
        };
      });

    return NextResponse.json({
      categories:  categoryLinks,
      vip_guests:  vipLinks,
    });
  } catch (error) {
    console.error(`[POST /api/weddings/${params.slug}/whatsapp-links]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
