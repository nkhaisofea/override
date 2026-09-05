"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/claims", label: "Claims log" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/faq", label: "FAQ" },
];

export default function AdminProtectedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState("checking"); // checking | ok
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setEmail(data.email);
        setStatus("ok");
      })
      .catch(() => {
        if (cancelled) return;
        router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (status !== "ok") {
    return (
      <main className="mx-auto max-w-md px-5 pt-20 text-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Checking admin session…
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Logo />
          <button
            onClick={handleLogout}
            className="label-tracked text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {email} · Sign out
          </button>
        </div>
        <nav className="mx-auto max-w-4xl px-5 flex gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className="label-tracked text-[11px] rounded-full px-4 py-2 whitespace-nowrap transition"
                style={
                  active
                    ? { background: "var(--accent-soft)", color: "var(--accent)" }
                    : { color: "var(--muted)" }
                }
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto max-w-4xl w-full px-5 py-6 flex-1">{children}</div>
    </div>
  );
}
