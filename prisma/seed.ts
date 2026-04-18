import {
  PrismaClient,
  Tier,
  Side,
  DietaryPreference,
  SourceType,
  LinkType,
} from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database…");

  // ── 0. Clean up existing demo wedding (idempotent re-runs) ───────────────
  const existing = await prisma.wedding.findUnique({
    where: { slug: "ravi-and-meera" },
    select: { id: true },
  });
  if (existing) {
    await prisma.wedding.delete({ where: { id: existing.id } });
    console.log("  ↩  Removed previous demo wedding");
  }

  // ── 1. Wedding ────────────────────────────────────────────────────────────
  const wedding = await prisma.wedding.create({
    data: {
      slug:             "ravi-and-meera",
      bride_name:       "Meera Thomas",
      groom_name:       "Ravi Menon",
      bride_family:     "Thomas Family, Kottayam",
      groom_family:     "Menon Family, Trivandrum",
      wedding_date:     new Date("2026-12-15T00:00:00.000Z"),
      tier:             Tier.PREMIUM,
      theme:            "elegant-gold",
      greeting_default: "You're warmly invited to celebrate this joyous occasion with us",
      is_active:        true,
      config_json:      {
        primaryColor:  "#C9A84C",
        coverPhoto:    null,
        showRsvpForm:  true,
        languages:     ["en", "ml"],
      },
    },
  });
  console.log(`  ✓  Wedding: ${wedding.groom_name} & ${wedding.bride_name} (${wedding.id})`);

  // ── 2. Events ─────────────────────────────────────────────────────────────
  const [eventCeremony, eventReception, eventSadhya] = await Promise.all([
    prisma.event.create({
      data: {
        wedding_id:    wedding.id,
        name:          "Wedding Ceremony",
        date:          new Date("2026-12-15T00:00:00.000Z"),
        start_time:    "10:00 AM",
        end_time:      "1:00 PM",
        venue_name:    "St. Mary's Forane Church",
        venue_address: "St. Mary's Church Rd, Palayam, Thiruvananthapuram, Kerala 695001",
        venue_lat:     8.5241,
        venue_lng:     76.9366,
        venue_map_url: "https://maps.app.goo.gl/example1",
        sort_order:    1,
      },
    }),
    prisma.event.create({
      data: {
        wedding_id:    wedding.id,
        name:          "Wedding Reception",
        date:          new Date("2026-12-15T00:00:00.000Z"),
        start_time:    "6:00 PM",
        end_time:      "10:00 PM",
        venue_name:    "Grand Hyatt Trivandrum",
        venue_address: "Vizhinjam Road, Kovalam, Thiruvananthapuram, Kerala 695527",
        venue_lat:     8.5069,
        venue_lng:     76.9581,
        venue_map_url: "https://maps.app.goo.gl/example2",
        sort_order:    2,
      },
    }),
    prisma.event.create({
      data: {
        wedding_id:    wedding.id,
        name:          "Sadhya Lunch",
        date:          new Date("2026-12-16T00:00:00.000Z"),
        start_time:    "12:00 PM",
        end_time:      "3:00 PM",
        venue_name:    "Thomas Family House",
        venue_address: "Kumarakom North P.O, Kottayam, Kerala 686563",
        venue_lat:     9.5916,
        venue_lng:     76.5222,
        venue_map_url: null,
        sort_order:    3,
      },
    }),
  ]);
  console.log("  ✓  3 events created");

  // ── 3. Categories ─────────────────────────────────────────────────────────
  const [
    catBrideFamily,
    catGroomFamily,
    catSslc,
    catCollege,
    catOffice,
    catChurch,
  ] = await Promise.all([
    prisma.category.create({
      data: {
        wedding_id:               wedding.id,
        name:                     "Bride Family",
        slug:                     "bride-family",
        custom_greeting:          "With love from the Thomas family, you are warmly invited",
        whatsapp_message_template: null,
      },
    }),
    prisma.category.create({
      data: {
        wedding_id:               wedding.id,
        name:                     "Groom Family",
        slug:                     "groom-family",
        custom_greeting:          "The Menon family joyfully invites you to celebrate with us",
        whatsapp_message_template: null,
      },
    }),
    prisma.category.create({
      data: {
        wedding_id:               wedding.id,
        name:                     "SSLC Batch",
        slug:                     "sslc-batch",
        custom_greeting:          "Hey! Your old school friends are getting married 🎉",
        whatsapp_message_template:
          "Hey {bride} & {groom} are tying the knot on {date}!\nJoin us 🎊\n{url}",
      },
    }),
    prisma.category.create({
      data: {
        wedding_id:               wedding.id,
        name:                     "College Friends",
        slug:                     "college-friends",
        custom_greeting:          "From college days to wedding bells — join us!",
        whatsapp_message_template: null,
      },
    }),
    prisma.category.create({
      data: {
        wedding_id:               wedding.id,
        name:                     "Groom Office",
        slug:                     "groom-office",
        custom_greeting:          "Ravi from the office is getting married! You're invited 🎊",
        whatsapp_message_template: null,
      },
    }),
    prisma.category.create({
      data: {
        wedding_id:               wedding.id,
        name:                     "Church Friends",
        slug:                     "church-friends",
        custom_greeting:          "With God's blessings, we joyfully invite you to witness this union",
        whatsapp_message_template: null,
      },
    }),
  ]);
  console.log("  ✓  6 categories created");

  // ── 4. VIP Guests (20) ────────────────────────────────────────────────────
  const guestData = [
    // Bride family (4) — BRIDE side
    { name: "Anitha Thomas",   phone: "9447123456", side: Side.BRIDE,  category: catBrideFamily, relation: "Sister",        slug: "anitha-thomas"   },
    { name: "George Thomas",   phone: "9447234567", side: Side.BRIDE,  category: catBrideFamily, relation: "Father",        slug: "george-thomas"   },
    { name: "Susan Thomas",    phone: null,         side: Side.BRIDE,  category: catBrideFamily, relation: "Aunt",          slug: "susan-thomas"    },
    { name: "Jose Thomas",     phone: "9447345678", side: Side.BRIDE,  category: catBrideFamily, relation: "Uncle",         slug: "jose-thomas"     },
    // Groom family (4) — GROOM side
    { name: "Priya Menon",     phone: "9447456789", side: Side.GROOM,  category: catGroomFamily, relation: "Sister",        slug: "priya-menon"     },
    { name: "Suresh Menon",    phone: "9447567890", side: Side.GROOM,  category: catGroomFamily, relation: "Father",        slug: "suresh-menon"    },
    { name: "Lakshmi Menon",   phone: null,         side: Side.GROOM,  category: catGroomFamily, relation: "Aunt",          slug: "lakshmi-menon"   },
    { name: "Vijayan Menon",   phone: "9447678901", side: Side.GROOM,  category: catGroomFamily, relation: "Uncle",         slug: "vijayan-menon"   },
    // SSLC Batch (3) — COMMON
    { name: "Biju Varghese",   phone: "9447789012", side: Side.COMMON, category: catSslc,        relation: "School Friend", slug: "biju-varghese"   },
    { name: "Reshma Nair",     phone: "9447890123", side: Side.COMMON, category: catSslc,        relation: "School Friend", slug: "reshma-nair"     },
    { name: "Arun Kumar",      phone: null,         side: Side.COMMON, category: catSslc,        relation: "School Friend", slug: "arun-kumar"      },
    // College Friends (3) — COMMON
    { name: "Deepak Pillai",   phone: "9447901234", side: Side.COMMON, category: catCollege,     relation: "College Friend", slug: "deepak-pillai"  },
    { name: "Sreeja Krishnan", phone: "9448012345", side: Side.COMMON, category: catCollege,     relation: "College Friend", slug: "sreeja-krishnan"},
    { name: "Manoj Varma",     phone: null,         side: Side.COMMON, category: catCollege,     relation: "College Friend", slug: "manoj-varma"    },
    // Groom Office (3) — GROOM side
    { name: "Praveen Nambiar", phone: "9448123456", side: Side.GROOM,  category: catOffice,      relation: "Colleague",     slug: "praveen-nambiar" },
    { name: "Divya Shenoy",    phone: "9448234567", side: Side.GROOM,  category: catOffice,      relation: "Colleague",     slug: "divya-shenoy"    },
    { name: "Sajan Pillai",    phone: null,         side: Side.GROOM,  category: catOffice,      relation: "Colleague",     slug: "sajan-pillai"    },
    // Church Friends (3) — BRIDE side
    { name: "Mary Kuriakose",  phone: "9448345678", side: Side.BRIDE,  category: catChurch,      relation: "Church Friend", slug: "mary-kuriakose"  },
    { name: "Thomas Cherian",  phone: "9448456789", side: Side.BRIDE,  category: catChurch,      relation: "Church Friend", slug: "thomas-cherian"  },
    { name: "Beena Mathew",    phone: null,         side: Side.BRIDE,  category: catChurch,      relation: "Church Friend", slug: "beena-mathew"    },
  ] as const;

  const guests = await Promise.all(
    guestData.map((g) =>
      prisma.guest.create({
        data: {
          wedding_id:  wedding.id,
          category_id: g.category.id,
          name:        g.name,
          phone:       g.phone ?? null,
          slug:        g.slug,
          side:        g.side,
          relation:    g.relation,
          is_vip:      true,
        },
      })
    )
  );
  const guestMap = new Map(guests.map((g) => [g.slug, g]));
  console.log(`  ✓  ${guests.length} VIP guests created`);

  // ── 5. RSVPs (35) ────────────────────────────────────────────────────────
  // Helper: create RSVP + event selections in one go
  async function createRsvp(opts: {
    name: string;
    phone?: string;
    guest_slug?: string;
    source_type: SourceType;
    source_category_id?: string;
    guest_count?: number;
    dietary: DietaryPreference;
    dietary_note?: string;
    transport?: boolean;
    accommodation?: boolean;
    message?: string;
    // array of [event, attending, guest_count]
    selections: [{ id: string }, boolean, number][];
    created_at: Date;
  }) {
    const linked_guest = opts.guest_slug ? guestMap.get(opts.guest_slug) : undefined;
    return prisma.rsvp.create({
      data: {
        wedding_id:           wedding.id,
        guest_id:             linked_guest?.id ?? null,
        source_category_id:   opts.source_category_id ?? null,
        name:                 opts.name,
        phone:                opts.phone ?? null,
        guest_count:          opts.guest_count ?? 1,
        dietary_preference:   opts.dietary,
        dietary_note:         opts.dietary_note ?? null,
        transport_needed:     opts.transport ?? false,
        accommodation_needed: opts.accommodation ?? false,
        source_type:          opts.source_type,
        message:              opts.message ?? null,
        created_at:           opts.created_at,
        event_selections: {
          create: opts.selections.map(([event, attending, guestCount]) => ({
            event_id:    event.id,
            attending,
            guest_count: guestCount,
          })),
        },
      },
    });
  }

  await Promise.all([
    // ── Bride Family (4 RSVPs via category link) ─────────────────────────
    createRsvp({ name: "Rajan Thomas",   phone: "9447111111", source_type: SourceType.CATEGORY_LINK, source_category_id: catBrideFamily.id, guest_count: 4, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: true,  message: "Looking forward to the big day!", created_at: daysAgo(10, 14), selections: [[eventCeremony, true, 4], [eventReception, true, 4], [eventSadhya, true, 4]] }),
    createRsvp({ name: "Liji Mathew",    phone: "9447222222", source_type: SourceType.CATEGORY_LINK, source_category_id: catBrideFamily.id, guest_count: 2, dietary: DietaryPreference.VEG,     transport: false, accommodation: false,                                             created_at: daysAgo(9,  10), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Saly Abraham",                        source_type: SourceType.CATEGORY_LINK, source_category_id: catBrideFamily.id, guest_count: 3, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: false,                                             created_at: daysAgo(8,  9),  selections: [[eventCeremony, true, 3], [eventReception, true, 3], [eventSadhya, true, 3]] }),
    createRsvp({ name: "Shiny Kurian",   phone: "9447333333", source_type: SourceType.CATEGORY_LINK, source_category_id: catBrideFamily.id, guest_count: 2, dietary: DietaryPreference.VEG,     transport: false, accommodation: true,  message: "Congratulations dear!",           created_at: daysAgo(7,  11), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),

    // ── Groom Family (4 RSVPs via category link) ─────────────────────────
    createRsvp({ name: "Gopan Menon",    phone: "9447444444", source_type: SourceType.CATEGORY_LINK, source_category_id: catGroomFamily.id, guest_count: 5, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: true,  message: "So happy for Ravi!",              created_at: daysAgo(12, 16), selections: [[eventCeremony, true, 5], [eventReception, true, 5], [eventSadhya, true, 5]] }),
    createRsvp({ name: "Sindhu Nair",    phone: "9447555555", source_type: SourceType.CATEGORY_LINK, source_category_id: catGroomFamily.id, guest_count: 2, dietary: DietaryPreference.VEG,     transport: false, accommodation: false,                                             created_at: daysAgo(11, 13), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, true, 2]] }),
    createRsvp({ name: "Rajesh Pillai",  phone: "9447666666", source_type: SourceType.CATEGORY_LINK, source_category_id: catGroomFamily.id, guest_count: 3, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: false,                                             created_at: daysAgo(10, 9),  selections: [[eventCeremony, false, 0],[eventReception, true, 3], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Ambika Menon",                        source_type: SourceType.CATEGORY_LINK, source_category_id: catGroomFamily.id, guest_count: 1, dietary: DietaryPreference.JAIN,                                          message: "Blessed occasion!",               created_at: daysAgo(9,  15), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, false, 0]] }),

    // ── SSLC Batch (3 RSVPs) ─────────────────────────────────────────────
    createRsvp({ name: "Jibin Jose",     phone: "9447777777", source_type: SourceType.CATEGORY_LINK, source_category_id: catSslc.id, guest_count: 2, dietary: DietaryPreference.NON_VEG,                                                                                             created_at: daysAgo(6,  12), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Nisha Paul",     phone: "9447888888", source_type: SourceType.CATEGORY_LINK, source_category_id: catSslc.id, guest_count: 1, dietary: DietaryPreference.VEG,                                                                                                 created_at: daysAgo(5,  10), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, true, 1]] }),
    createRsvp({ name: "Anoop Krishnan",                      source_type: SourceType.CATEGORY_LINK, source_category_id: catSslc.id, guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: false, accommodation: false,                                                     created_at: daysAgo(4,  14), selections: [[eventCeremony, false, 0],[eventReception, true, 2], [eventSadhya, false, 0]] }),

    // ── College Friends (3 RSVPs) ─────────────────────────────────────────
    createRsvp({ name: "Amal Raj",       phone: "9447999999", source_type: SourceType.CATEGORY_LINK, source_category_id: catCollege.id, guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: true,                                                                          created_at: daysAgo(7,  16), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Vinitha Suresh", phone: "9448111111", source_type: SourceType.CATEGORY_LINK, source_category_id: catCollege.id, guest_count: 1, dietary: DietaryPreference.VEG,     transport: false, accommodation: false, message: "Can't wait to celebrate!",          created_at: daysAgo(6,  11), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, true, 1]] }),
    createRsvp({ name: "Rahul Nambiar",  phone: "9448222222", source_type: SourceType.CATEGORY_LINK, source_category_id: catCollege.id, guest_count: 3, dietary: DietaryPreference.NON_VEG,                                                                                           created_at: daysAgo(5,  9),  selections: [[eventCeremony, true, 3], [eventReception, true, 3], [eventSadhya, false, 0]] }),

    // ── Groom Office (3 RSVPs) ────────────────────────────────────────────
    createRsvp({ name: "Sreekumar V",    phone: "9448333333", source_type: SourceType.CATEGORY_LINK, source_category_id: catOffice.id, guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: false,                                                                          created_at: daysAgo(4,  13), selections: [[eventCeremony, false, 0],[eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Asha Gopinath",  phone: "9448444444", source_type: SourceType.CATEGORY_LINK, source_category_id: catOffice.id, guest_count: 1, dietary: DietaryPreference.VEG,     transport: false, accommodation: false,                                                     created_at: daysAgo(3,  10), selections: [[eventCeremony, false, 0],[eventReception, true, 1], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Manu Madhu",                          source_type: SourceType.CATEGORY_LINK, source_category_id: catOffice.id, guest_count: 2, dietary: DietaryPreference.NON_VEG,                   accommodation: true,  message: "Congrats Ravi bhai!",              created_at: daysAgo(2,  15), selections: [[eventCeremony, false, 0],[eventReception, true, 2], [eventSadhya, false, 0]] }),

    // ── Church Friends (3 RSVPs) ──────────────────────────────────────────
    createRsvp({ name: "Renu Cherian",   phone: "9448555555", source_type: SourceType.CATEGORY_LINK, source_category_id: catChurch.id, guest_count: 3, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: false,                                                     created_at: daysAgo(8,  11), selections: [[eventCeremony, true, 3], [eventReception, true, 3], [eventSadhya, true, 3]] }),
    createRsvp({ name: "Jomol Mathew",   phone: "9448666666", source_type: SourceType.CATEGORY_LINK, source_category_id: catChurch.id, guest_count: 2, dietary: DietaryPreference.VEG,                       accommodation: true,  message: "Praying for you both 🙏",           created_at: daysAgo(7,  14), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Robin Samuel",   phone: "9448777777", source_type: SourceType.CATEGORY_LINK, source_category_id: catChurch.id, guest_count: 4, dietary: DietaryPreference.NON_VEG, transport: false, accommodation: false,                                                     created_at: daysAgo(6,  10), selections: [[eventCeremony, true, 4], [eventReception, true, 4], [eventSadhya, true, 4]] }),

    // ── Personal link RSVPs (10 VIP guests) ──────────────────────────────
    createRsvp({ name: "Anitha Thomas",  phone: "9447123456", guest_slug: "anitha-thomas",   source_type: SourceType.PERSONAL_LINK, source_category_id: catBrideFamily.id, guest_count: 1, dietary: DietaryPreference.VEG,     transport: false, accommodation: false, message: "So proud of you Meera chechi!",   created_at: daysAgo(11, 10), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, true, 1]] }),
    createRsvp({ name: "George Thomas",  phone: "9447234567", guest_slug: "george-thomas",   source_type: SourceType.PERSONAL_LINK, source_category_id: catBrideFamily.id, guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: false, accommodation: false,                                            created_at: daysAgo(10, 9),  selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, true, 2]] }),
    createRsvp({ name: "Priya Menon",    phone: "9447456789", guest_slug: "priya-menon",     source_type: SourceType.PERSONAL_LINK, source_category_id: catGroomFamily.id, guest_count: 1, dietary: DietaryPreference.VEG,     transport: false, accommodation: false, message: "Congratulations anna!",           created_at: daysAgo(9,  12), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, true, 1]] }),
    createRsvp({ name: "Suresh Menon",   phone: "9447567890", guest_slug: "suresh-menon",    source_type: SourceType.PERSONAL_LINK, source_category_id: catGroomFamily.id, guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: false,                                            created_at: daysAgo(8,  13), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, true, 2]] }),
    createRsvp({ name: "Biju Varghese",  phone: "9447789012", guest_slug: "biju-varghese",   source_type: SourceType.PERSONAL_LINK, source_category_id: catSslc.id,        guest_count: 2, dietary: DietaryPreference.NON_VEG,                                                        created_at: daysAgo(7,  14), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Reshma Nair",    phone: "9447890123", guest_slug: "reshma-nair",     source_type: SourceType.PERSONAL_LINK, source_category_id: catSslc.id,        guest_count: 1, dietary: DietaryPreference.VEG,                       message: "Yayyy! So excited 🎉",           created_at: daysAgo(6,  11), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, true, 1]] }),
    createRsvp({ name: "Praveen Nambiar",phone: "9448123456", guest_slug: "praveen-nambiar", source_type: SourceType.PERSONAL_LINK, source_category_id: catOffice.id,      guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: false, accommodation: false,                                            created_at: daysAgo(5,  16), selections: [[eventCeremony, false, 0],[eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Mary Kuriakose", phone: "9448345678", guest_slug: "mary-kuriakose",  source_type: SourceType.PERSONAL_LINK, source_category_id: catChurch.id,      guest_count: 2, dietary: DietaryPreference.NON_VEG,                   message: "God bless the couple!",          created_at: daysAgo(4,  9),  selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, true, 2]] }),
    createRsvp({ name: "Thomas Cherian", phone: "9448456789", guest_slug: "thomas-cherian",  source_type: SourceType.PERSONAL_LINK, source_category_id: catChurch.id,      guest_count: 3, dietary: DietaryPreference.NON_VEG,                                                        created_at: daysAgo(3,  10), selections: [[eventCeremony, true, 3], [eventReception, true, 3], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Deepak Pillai",  phone: "9447901234", guest_slug: "deepak-pillai",   source_type: SourceType.PERSONAL_LINK, source_category_id: catCollege.id,     guest_count: 1, dietary: DietaryPreference.NO_ONION_GARLIC, dietary_note: "Strictly no onion/garlic",  created_at: daysAgo(2,  15), selections: [[eventCeremony, true, 1], [eventReception, true, 1], [eventSadhya, true, 1]] }),

    // ── Universal link RSVPs (5 — no category) ───────────────────────────
    createRsvp({ name: "Vivek Chandran",  phone: "9449111111", source_type: SourceType.UNIVERSAL_LINK, guest_count: 2, dietary: DietaryPreference.NON_VEG, transport: true,  message: "Ravi told me about this. Congrats!", created_at: daysAgo(5, 10), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Parvathy Das",    phone: "9449222222", source_type: SourceType.UNIVERSAL_LINK, guest_count: 1, dietary: DietaryPreference.VEG,                                                                           created_at: daysAgo(4, 13), selections: [[eventCeremony, false, 0],[eventReception, true, 1], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Shyam Mohan",                          source_type: SourceType.UNIVERSAL_LINK, guest_count: 4, dietary: DietaryPreference.NON_VEG, transport: true,  accommodation: true,                                 created_at: daysAgo(3, 11), selections: [[eventCeremony, true, 4], [eventReception, true, 4], [eventSadhya, true, 4]] }),
    createRsvp({ name: "Leena Francis",   phone: "9449333333", source_type: SourceType.UNIVERSAL_LINK, guest_count: 2, dietary: DietaryPreference.VEG,     transport: false, message: "Wish you a happy married life!",        created_at: daysAgo(2, 14), selections: [[eventCeremony, true, 2], [eventReception, true, 2], [eventSadhya, false, 0]] }),
    createRsvp({ name: "Nikhil Raj",      phone: "9449444444", source_type: SourceType.UNIVERSAL_LINK, guest_count: 1, dietary: DietaryPreference.OTHER,   dietary_note: "Nut allergy",                                          created_at: daysAgo(1, 10), selections: [[eventCeremony, false, 0],[eventReception, true, 1], [eventSadhya, false, 0]] }),
  ]);
  console.log("  ✓  35 RSVPs created");

  // ── 6. Link Clicks (80) ───────────────────────────────────────────────────
  const mobileUA  = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const androidUA = "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36";

  const ips = Array.from({ length: 30 }, (_, i) => `103.${21 + i}.${44 + i}.${10 + i}`);

  const categoryClickDist: [typeof catBrideFamily, number][] = [
    [catBrideFamily, 18],
    [catGroomFamily, 16],
    [catSslc,        12],
    [catCollege,     11],
    [catOffice,       9],
    [catChurch,       8],
  ]; // total: 74 category clicks + 6 universal = 80

  const clickRecords: {
    wedding_id:  string;
    category_id: string | null;
    guest_id:    string | null;
    link_type:   LinkType;
    ip_address:  string;
    user_agent:  string;
    device_type: string;
    clicked_at:  Date;
  }[] = [];

  // Category clicks spread over 14 days
  for (const [cat, count] of categoryClickDist) {
    for (let i = 0; i < count; i++) {
      const daysBack = Math.floor((i / count) * 14);
      const ua = pick([mobileUA, mobileUA, androidUA, desktopUA]); // skew mobile
      clickRecords.push({
        wedding_id:  wedding.id,
        category_id: cat.id,
        guest_id:    null,
        link_type:   LinkType.CATEGORY_LINK,
        ip_address:  pick(ips),
        user_agent:  ua,
        device_type: ua.includes("Mobile") || ua.includes("Android") ? "mobile" : "desktop",
        clicked_at:  daysAgo(daysBack, 8 + (i % 12)),
      });
    }
  }

  // 6 universal link clicks
  for (let i = 0; i < 6; i++) {
    const ua = pick([mobileUA, desktopUA]);
    clickRecords.push({
      wedding_id:  wedding.id,
      category_id: null,
      guest_id:    null,
      link_type:   LinkType.UNIVERSAL_LINK,
      ip_address:  pick(ips),
      user_agent:  ua,
      device_type: ua.includes("Mobile") ? "mobile" : "desktop",
      clicked_at:  daysAgo(Math.floor(Math.random() * 7), 9 + i),
    });
  }

  await prisma.linkClick.createMany({ data: clickRecords });
  console.log(`  ✓  ${clickRecords.length} link clicks created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const [rsvpCount, clickCount] = await Promise.all([
    prisma.rsvp.count({ where: { wedding_id: wedding.id } }),
    prisma.linkClick.count({ where: { wedding_id: wedding.id } }),
  ]);

  console.log("\n✅ Seed complete!");
  console.log(`   Wedding slug : ravi-and-meera`);
  console.log(`   RSVPs        : ${rsvpCount}`);
  console.log(`   Link clicks  : ${clickCount}`);
  console.log(`   VIP guests   : ${guests.length} (${guests.filter((g) => !guestMap.get(g.slug)?.id).length === 0 ? "all linked" : ""})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
