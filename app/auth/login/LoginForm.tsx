"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "../AuthShell";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next = "", roleHint = "" }: { next?: string; roleHint?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      router.push(next || "/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg.includes("Supabase is not configured") ? msg : "Wrong email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Login" subtitle="Welcome back! Apne account se judein.">
      {roleHint === "dealer" && (
        <p className="mb-4 rounded-lg bg-brand-light px-3 py-2 text-sm font-medium text-brand-dark">
          Dealer login – apni cars aur enquiries yahan karein.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <FieldError message={error} />
        <Button type="submit" loading={loading} className="w-full">
          Login
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500">
        New here?{" "}
        <Link
          href={roleHint === "dealer" ? "/auth/signup?role=dealer" : "/auth/signup"}
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}