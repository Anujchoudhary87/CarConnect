"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/use-user";

// Header entry point for in-app demand notifications. Shows the unread count
// when logged in; renders nothing otherwise.
export function NotificationBell({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { user } = useUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setUnread(Number(data.unread ?? 0));
      })
      .catch(() => {});
    return () => {
      active = false;
      setUnread(0);
    };
  }, [user?.id]);

  if (!user) return null;

  if (variant === "row") {
    return (
      <Link
        href="/notifications"
        className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
      >
        🔔 Notifications{unread > 0 ? ` (${unread})` : ""}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      className="relative flex size-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50"
      aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
    >
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}