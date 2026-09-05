"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        // Carry where they were trying to go, so signing in again lands them
        // back there instead of always dumping them on the dashboard.
        const next = encodeURIComponent(pathname || "/admin/dashboard");
        router.replace(`/admin/login?expired=1&next=${next}`);
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    // replace so the back button can't return to a dashboard the session no
    // longer authorises.
    router.replace("/admin/login");
  }

  // This is a convenience gate, not the security boundary — every /api/admin
  // route independently verifies the JWT via requireAdmin. Hiding the UI
  // without that would be theatre.
  if (status !== "ok") {
    return (
      <main className="mx-auto max-w-md px-5 pt-20 text-center">
        <p className="text-sm text-muted">Checking admin session…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo href="/" />
            <span className="label-tracked hidden rounded-full bg-accent-soft px-2.5 py-1 text-[9px] text-accent sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted md:inline">{email}</span>
            <button
              onClick={handleLogout}
              className="label-tracked rounded-full border border-border px-3 py-1.5 text-[10px] text-muted transition-colors hover:border-danger hover:text-danger"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-5 sm:px-8">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto pb-2">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`label-tracked block rounded-full px-4 py-2 text-[11px] whitespace-nowrap transition-colors ${
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:px-8 lg:py-10">{children}</div>
    </div>
  );
}
