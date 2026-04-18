import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Tier } from "@prisma/client";

function toSlug(bride: string, groom: string): string {
  const clean = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${clean(groom)}-and-${clean(bride)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      bride_name,
      groom_name,
      bride_family,
      groom_family,
      wedding_date,
      tier,
      greeting_default,
      partner_id,
      theme,
      custom_domain,
      config_json,
    } = body;

    // Validate required fields
    if (!bride_name || !groom_name || !bride_family || !groom_family || !wedding_date || !tier) {
      return NextResponse.json(
        { error: "Missing required fields: bride_name, groom_name, bride_family, groom_family, wedding_date, tier" },
        { status: 400 }
      );
    }

    if (!Object.values(Tier).includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${Object.values(Tier).join(", ")}` },
        { status: 400 }
      );
    }

    // Generate slug from names if not provided
    let slug: string = body.slug ?? toSlug(bride_name, groom_name);

    // Ensure slug uniqueness by appending a counter if needed
    const existing = await prisma.wedding.findUnique({ where: { slug } });
    if (existing) {
      let counter = 2;
      while (await prisma.wedding.findUnique({ where: { slug: `${slug}-${counter}` } })) {
        counter++;
      }
      slug = `${slug}-${counter}`;
    }

    const wedding = await prisma.wedding.create({
      data: {
        bride_name,
        groom_name,
        bride_family,
        groom_family,
        wedding_date: new Date(wedding_date),
        slug,
        tier,
        greeting_default: greeting_default ?? "You're warmly invited to celebrate with us",
        theme: theme ?? "elegant-gold",
        custom_domain: custom_domain ?? null,
        partner_id: partner_id ?? null,
        config_json: config_json ?? {},
      },
    });

    return NextResponse.json(wedding, { status: 201 });
  } catch (error) {
    console.error("[POST /api/weddings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
