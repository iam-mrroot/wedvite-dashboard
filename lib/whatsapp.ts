import type { Wedding, Category, Guest } from "@prisma/client";

// ─── URL builders ────────────────────────────────────────────────────────────

/**
 * Generic share link — user picks the recipient themselves.
 * Use for category group links where you copy and paste.
 */
export function generateWhatsAppShareURL(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Direct send link — opens a chat with a specific phone number.
 * Prefixes India country code (+91). Strips any non-digit characters from phone.
 */
export function generateWhatsAppDirectURL(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  // If already has country code (starts with 91 and is 12 digits), use as-is
  const normalized = digits.length === 12 && digits.startsWith("91")
    ? digits
    : `91${digits}`;
  return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
}

// ─── Message generators ───────────────────────────────────────────────────────

/**
 * Formats the wedding date as a readable string, e.g. "Saturday, 14 Feb 2026".
 */
function formatWeddingDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Generates the WhatsApp message for a category group link.
 * Uses the category's custom template if set, otherwise falls back to the default.
 *
 * baseURL should be the full invite URL for the category,
 * e.g. "https://wedvite.in/invite/ravi-and-meera/sslc-friends"
 */
export function generateCategoryShareMessage(
  wedding: Wedding,
  category: Category,
  baseURL: string
): string {
  if (category.whatsapp_message_template) {
    // Allow template variables: {bride}, {groom}, {date}, {url}
    return category.whatsapp_message_template
      .replace(/\{bride\}/g, wedding.bride_name)
      .replace(/\{groom\}/g, wedding.groom_name)
      .replace(/\{date\}/g, formatWeddingDate(wedding.wedding_date))
      .replace(/\{url\}/g, baseURL);
  }

  const greeting = category.custom_greeting ?? wedding.greeting_default;

  return [
    `🎉 ${wedding.groom_name} & ${wedding.bride_name} cordially invite you!`,
    ``,
    greeting,
    ``,
    `📅 ${formatWeddingDate(wedding.wedding_date)}`,
    ``,
    `See all event details & RSVP here 👇`,
    baseURL,
    ``,
    `Please confirm your attendance 🙏`,
  ].join("\n");
}

/**
 * Generates a personalised WhatsApp message for a VIP/known guest.
 *
 * baseURL should be the full personal invite URL,
 * e.g. "https://wedvite.in/invite/ravi-and-meera/guest/anitha-jose"
 */
export function generatePersonalShareMessage(
  wedding: Wedding,
  guest: Guest,
  baseURL: string
): string {
  return [
    `Dear ${guest.name},`,
    ``,
    `You are warmly invited to ${wedding.groom_name} & ${wedding.bride_name}'s wedding.`,
    ``,
    `📅 ${formatWeddingDate(wedding.wedding_date)}`,
    ``,
    `Please find all event details & RSVP here:`,
    `${baseURL} 🙏`,
  ].join("\n");
}
