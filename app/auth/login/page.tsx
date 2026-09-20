import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={null}>
      <LoginForm next={sp.next} roleHint={sp.role} />
    </Suspense>
  );
}