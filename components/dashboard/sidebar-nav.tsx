"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  ClipboardList,
  MessageCircle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/dashboard",           label: "Overview",        icon: LayoutDashboard },
  { href: "/dashboard/categories",label: "Categories",      icon: FolderOpen      },
  { href: "/dashboard/guests",    label: "Guests",          icon: Users           },
  { href: "/dashboard/rsvps",     label: "RSVP Responses",  icon: ClipboardList   },
  { href: "/dashboard/whatsapp",  label: "WhatsApp Share",  icon: MessageCircle   },
  { href: "/dashboard/export",    label: "Export",          icon: Download        },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-zinc-900" : "text-zinc-400")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Icon-only bottom navigation for mobile */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around px-2 py-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors",
              active ? "text-zinc-900" : "text-zinc-400"
            )}
          >
            <Icon className={cn("h-5 w-5", active ? "text-zinc-900" : "text-zinc-400")} />
            <span className="leading-none">{label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
