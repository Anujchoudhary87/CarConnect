"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { Vehicle } from "@/lib/types";
import {
  buildVehicleShareText,
  facebookShareUrl,
  publicVehicleUrl,
  telegramShareUrl,
  vehicleShareTitle,
  whatsappShareUrl,
} from "@/lib/share";

// "↗ Share" popover for the car detail page. Copy Link copies the public car
// URL and flips to "✓ Link Copied" briefly; the social options open the standard
// platform share flows; "More..." uses the Web Share API when supported and
// falls back to Copy Link otherwise. No heavy dependencies.
export function ShareButton({ vehicle }: { vehicle: Vehicle }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  function showCopied() {
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  async function copyLink() {
    const url = publicVehicleUrl(vehicle.id);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // Copy is best-effort; nothing to recover from here.
      }
      ta.remove();
    }
    showCopied();
  }

  async function nativeShare() {
    const url = publicVehicleUrl(vehicle.id);
    const title = vehicleShareTitle(vehicle) || "Car Connect";
    const text = buildVehicleShareText(vehicle);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        setOpen(false);
      } catch {
        // User dismissed the sheet — keep the menu open.
      }
    } else {
      await copyLink();
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ↗ Share
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-1 shadow-lg"
        >
          <button
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            {copied ? "✓ Link Copied" : "🔗 Copy Link"}
          </button>
          <a
            role="menuitem"
            href={whatsappShareUrl(vehicle)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            💬 WhatsApp
          </a>
          <a
            role="menuitem"
            href={telegramShareUrl(vehicle)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            📱 Telegram
          </a>
          <a
            role="menuitem"
            href={facebookShareUrl(vehicle)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            📘 Facebook
          </a>
          <div className="my-1 border-t border-stone-100" />
          <button
            role="menuitem"
            onClick={nativeShare}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            More...
          </button>
        </div>
      )}
    </div>
  );
}