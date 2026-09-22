"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "../AuthShell";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SignupForm({ roleHint = "customer" }: { roleHint?: string }) {
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "dealer">(
    roleHint === "dealer" ? "dealer" : "customer",
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, role },
        },
      });
      if (error) throw new Error(error.message);

      if (data.session) {
        // Email confirmation disabled — signed in immediately.
        router.push(role === "dealer" ? "/become-dealer" : "/marketplace");
        router.refresh();
      } else {
        // Email confirmation enabled — user must verify first.
        setMessage(
          "Almost done! Aapke email pe confirmation link bhej diya hai. Confirm karke login karo.",
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up fail hua. Dobara try karo.";
      if (msg.includes("Supabase is not configured")) {
        setError(msg);
      } else {
        setError("Account nahi ban paaya: " + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Apna Account Banao"
      subtitle="Register karein – free, no hidden charges."
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setRole("customer")}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            role === "customer" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setRole("dealer")}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            role === "dealer" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
          }`}
        >
          🏪 Dealer
        </button>
      </div>

      {role === "dealer" && (
        <p className="mb-4 rounded-lg bg-brand-light px-3 py-2 text-sm font-medium text-brand-dark">
          Dealers: signup ke baad apna dealership profile setup karo.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            required
            autoComplete="name"
            placeholder={role === "dealer" ? "Dealership owner ka naam" : "Aapka naam"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone / WhatsApp</Label>
          <Input
            id="phone"
            type="tel"
            required
            pattern="[0-9+ ]{10,15}"
            autoComplete="tel"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Kam se kam 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <FieldError message={error} />
        {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        <Button type="submit" loading={loading} className="w-full">
          {role === "dealer" ? "Dealer Account Banao" : "Account Banao"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-stone-500">
        Pehle se account hai?{" "}
        <Link
          href={role === "dealer" ? "/auth/login?role=dealer" : "/auth/login"}
          className="font-semibold text-brand hover:underline"
        >
          Login
        </Link>
      </p>
    </AuthShell>
  );
}