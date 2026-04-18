import { PrismaClient, Tier } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.wedding.findUnique({ where: { slug: "sajin-and-keerthan" } });
  if (existing) {
    console.log("Wedding already exists:", existing.id);
    return;
  }

  const wedding = await prisma.wedding.create({
    data: {
      slug:             "sajin-and-keerthan",
      bride_name:       "Keerthan",
      groom_name:       "Sajin",
      bride_family:     "",
      groom_family:     "",
      wedding_date:     new Date("2026-12-01T00:00:00.000Z"),
      tier:             Tier.PREMIUM,
      theme:            "elegant-gold",
      greeting_default: "You're warmly invited to celebrate with us",
      is_active:        true,
      config_json:      { primaryColor: "#C9A84C", coverPhoto: null, showRsvpForm: true },
    },
  });

  console.log("✅ Wedding created:", wedding.slug, "(id:", wedding.id + ")");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
