import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Side, Prisma } from "@prisma/client";

type Params = { params: { slug: string } };

type BulkGuestInput = {
  name?: unknown;
  phone?: string;
  email?: string;
  relation?: string;
  side?: unknown;
  is_vip?: boolean;
  category_name?: string;
};

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// POST /api/weddings/[slug]/guests/bulk
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
    const inputs: BulkGuestInput[] = body?.guests;

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json({ error: "Body must be { guests: [...] } with at least one entry" }, { status: 400 });
    }

    // ── 1. Resolve / create categories by name ────────────────────────────
    const categoryNameSet: string[] = [];
    for (const g of inputs) {
      const n = g.category_name?.trim();
      if (n && !categoryNameSet.includes(n)) categoryNameSet.push(n);
    }
    const categoryNames = categoryNameSet;

    const categoryMap = new Map<string, string>(); // name → id

    if (categoryNames.length > 0) {
      const existing = await prisma.category.findMany({
        where: {
          wedding_id: wedding.id,
          name: { in: categoryNames },
        },
        select: { id: true, name: true, slug: true },
      });
      for (const c of existing) categoryMap.set(c.name, c.id);

      // Create missing categories
      const missing = categoryNames.filter((n) => !categoryMap.has(n));
      for (const name of missing) {
        const baseSlug = toSlug(name);
        let slug = baseSlug;
        let counter = 2;
        while (
          await prisma.category.findUnique({
            where: { wedding_id_slug: { wedding_id: wedding.id, slug } },
          })
        ) {
          slug = `${baseSlug}-${counter++}`;
        }
        const created = await prisma.category.create({
          data: { wedding_id: wedding.id, name, slug },
          select: { id: true, name: true },
        });
        categoryMap.set(created.name, created.id);
      }
    }

    // ── 2. Fetch all existing guest slugs for this wedding ────────────────
    const existingSlugRows = await prisma.guest.findMany({
      where: { wedding_id: wedding.id },
      select: { slug: true },
    });
    const existingSlugs: Record<string, true> = {};
    for (const row of existingSlugRows) existingSlugs[row.slug] = true;

    // ── 3. Process each guest ─────────────────────────────────────────────
    const toCreate: Prisma.GuestCreateManyInput[] = [];
    let duplicates = 0;
    const errors: { index: number; name: unknown; error: string }[] = [];
    // Track slugs allocated in this batch to avoid in-batch collisions
    const batchSlugs: Record<string, true> = {};

    for (let i = 0; i < inputs.length; i++) {
      const g = inputs[i];

      // Validate
      if (!g.name || typeof g.name !== "string" || !g.name.trim()) {
        errors.push({ index: i, name: g.name, error: "Missing or invalid name" });
        continue;
      }
      if (!g.side || !Object.values(Side).includes(g.side as Side)) {
        errors.push({
          index: i,
          name: g.name,
          error: `Missing or invalid side. Must be one of: ${Object.values(Side).join(", ")}`,
        });
        continue;
      }

      const baseSlug = toSlug(g.name as string);
      if (!baseSlug) {
        errors.push({ index: i, name: g.name, error: "Could not generate slug from name" });
        continue;
      }

      // Check if base slug already exists in DB (true duplicate — not a collision within the batch)
      if (existingSlugs[baseSlug] && !batchSlugs[baseSlug]) {
        duplicates++;
        continue;
      }

      // Find an available slug (checking both DB and in-batch)
      let slug = baseSlug;
      if (existingSlugs[slug] || batchSlugs[slug]) {
        let counter = 2;
        while (existingSlugs[`${baseSlug}-${counter}`] || batchSlugs[`${baseSlug}-${counter}`]) {
          counter++;
        }
        slug = `${baseSlug}-${counter}`;
      }

      batchSlugs[slug] = true;
      existingSlugs[slug] = true; // reserve for subsequent iterations

      toCreate.push({
        wedding_id:  wedding.id,
        name:        (g.name as string).trim(),
        slug,
        phone:       g.phone       ?? null,
        email:       g.email       ?? null,
        relation:    g.relation    ?? null,
        side:        g.side        as Side,
        is_vip:      g.is_vip      ?? false,
        category_id: g.category_name
          ? (categoryMap.get(g.category_name.trim()) ?? null)
          : null,
      });
    }

    // ── 4. Bulk insert ────────────────────────────────────────────────────
    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.guest.createMany({ data: toCreate });
      created = result.count;
    }

    return NextResponse.json(
      { created, duplicates, errors },
      { status: errors.length > 0 && created === 0 ? 422 : 201 }
    );
  } catch (error) {
    console.error(`[POST /api/weddings/${params.slug}/guests/bulk]`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
