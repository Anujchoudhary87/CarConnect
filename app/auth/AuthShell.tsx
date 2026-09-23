import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Link href="/" className="mx-auto mb-6 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo.png"
          alt="Car Connect"
          className="h-10 w-auto object-contain"
        />
        <span className="text-xl font-extrabold tracking-tight text-stone-900">
          Car <span className="text-brand">Connect</span>
        </span>
      </Link>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-stone-900">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}