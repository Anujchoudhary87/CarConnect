import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">Get in touch</p>
      <h1 className="mt-1 text-3xl font-extrabold text-stone-900 sm:text-4xl">Contact Car Connect</h1>
      <p className="mt-4 text-stone-600">
        Questions about buying, selling, or becoming a dealer? Drop us a note and we&apos;ll get back
        to you.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Email", value: "support@carconnect.in" },
          { label: "WhatsApp", value: "+91 98290 00000" },
          { label: "Hours", value: "Mon–Sat, 9am–7pm" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{c.label}</p>
            <p className="mt-1 font-semibold text-stone-900">{c.value}</p>
          </div>
        ))}
      </div>

      <form className="mt-8 space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700">Your name</label>
            <input
              id="name"
              required
              placeholder="Rajesh Kumar"
              className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="msg" className="block text-sm font-medium text-stone-700">Message</label>
          <textarea
            id="msg"
            required
            rows={5}
            placeholder="How can we help?"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Send Message
        </button>
        <p className="text-xs text-stone-400">
          This demo form does not send email yet — for a real dealership, use the WhatsApp / call
          buttons on any car, or reach Car Connect support through the channels above.
        </p>
      </form>
    </div>
  );
}