import Link from "next/link";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Cars Dhoondho" },
  { href: "/sell", label: "Apni Car Becho" },
  { href: "/auth/login?role=dealer", label: "Dealer Login" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com",
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 8h3v3h-3v8h-3v-8H9V8h2V6.5C11 4.9 11.9 4 13.6 4H15v3h-1.2c-.4 0-.8.4-.8 1V8z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com",
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4l6.6 8.8L4.3 20h2.5l4.9-5.4L16.4 20H20l-6.9-9.2L19.5 4H17l-4.4 4.9L8.7 4H4z" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://whatsapp.com",
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1012 2zm5.4 14.2c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.5-.1h-.1c-.5-.2-1.4-.5-3.6-2.2-1.2-1-2.1-2.1-2.8-3.3-.4-.8-.7-1.5-.9-2.2-.1-.6-.1-1.1 0-1.5.1-.4.4-.9.9-1.2.2-.2.4-.3.6-.3h.5c.2 0 .4-.1.7.6l.4 1.1c.2.4.2.6 0 1-.1.6-.7 1.6-.8 1.7-.1.2-.2.3-.1.5.2.6.9 1.4 1.8 2.1 1.1.9 2 1.2 2.4 1.4.3.1.5.1.7-.1.3-.2 1-1.1 1.3-1.5.3-.4.4-.3.7-.2l1.6.8c.3.1.6.3.6.4.1.2.1.8-.1 1.1z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-stone-950 text-stone-300">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">🚘</span>
              <span className="text-lg font-extrabold text-white">
                Car <span className="text-brand">Connect</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-stone-400">
              AI-powered used-car marketplace — verified local dealers ko customers se jodta hai.
            </p>
            <p className="mt-2 text-sm font-semibold text-stone-100">Drive Your Next Story</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-stone-300 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-stone-300 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Follow us</h4>
            <div className="mt-3 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-lg border border-stone-700 text-stone-300 transition-colors hover:border-brand hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-500">
              Local cars, sachhe prices, asli dealers.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-stone-800 pt-6 text-xs text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Car Connect. All rights reserved.</p>
          <p>Made in India 🇮🇳 for local used-car dealers</p>
        </div>
      </div>
    </footer>
  );
}