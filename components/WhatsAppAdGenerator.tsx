"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { whatsappShareLink } from "@/lib/whatsapp-ad";

export function WhatsAppAdGenerator({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function loadAd() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/whatsapp-ad`);
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "WhatsApp ad ban nahi paya");
      setMessage(json.message ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "WhatsApp ad ban nahi paya");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    void loadAd();
  }

  function closeModal() {
    setOpen(false);
    setMessage("");
    setCopied(false);
    setError("");
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setError("Copy nahi ho paya – manually select karke copy karein");
    }
  }

  function share() {
    window.open(whatsappShareLink(message), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        📱 WhatsApp Ad Banao
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="WhatsApp Ad"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-stone-900">WhatsApp Ad</h3>
                <p className="text-xs text-stone-500">Is car ka ready-to-send WhatsApp Ad</p>
              </div>
              <button onClick={closeModal} aria-label="Close" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading && !message ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
                  <Spinner label="Ad taiyar ho raha hai…" />
                </div>
              ) : (
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setCopied(false);
                  }}
                  rows={Math.min(24, Math.max(10, message.split("\n").length + 2))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label="Generated WhatsApp message"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-5 py-4">
              <Button variant="outline" size="sm" onClick={copyMessage} disabled={!message || loading}>
                {copied ? "Copy Ho Gaya!" : "Copy Karo"}
              </Button>
              <Button variant="success" size="sm" onClick={share} disabled={!message || loading}>
                WhatsApp par Share Karo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}