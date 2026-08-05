"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DharmaLogo } from "./dharma-logo";

type NavItem = {
  href: string;
  label: string;
};

export default function SidebarShell({
  children,
  greetingName,
  navItems,
  roleLabel,
}: {
  children: React.ReactNode;
  greetingName: string;
  navItems: NavItem[];
  roleLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-white text-brand-blue">
      <aside
        className={`fixed inset-y-0 left-0 border-r border-brand-blue bg-brand-blue px-4 py-5 md:flex md:flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16 px-2"
        } hidden`}
      >
        <div className="flex items-center justify-between">
          <div className={sidebarOpen ? "block" : "hidden"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-white/60">
              DFF&apos;s Sangam
            </p>
            <h1 className="mt-1 font-display text-lg font-bold text-brand-white">
              {roleLabel}
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-brand-white/70 hover:bg-brand-blue/60"
            title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <nav className={`mt-8 space-y-1 ${sidebarOpen ? "block" : "hidden"}`}>
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-saffron bg-brand-blue/60 text-brand-white"
                    : "border-transparent text-brand-white/80 hover:bg-brand-blue/60 hover:text-brand-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className={`mt-auto rounded-md border border-brand-saffron bg-brand-saffron px-3 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-[#d97500] ${
            sidebarOpen ? "block" : "hidden"
          }`}
        >
          {sidebarOpen ? "Sign out" : "⎋"}
        </button>
      </aside>

      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        <header className="border-b bg-white px-5 py-4 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-brand-blue/70">Welcome back</p>
              <h2 className="font-display text-2xl font-bold text-brand-blue">
                Hello {greetingName}!
              </h2>
            </div>

            <div className="flex items-center gap-2">
                        <DharmaLogo size="sm" />
              <div className="flex gap-2 overflow-x-auto md:hidden">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-md border-l-2 px-3 py-2 text-sm font-medium ${
                      pathname === item.href
                        ? "border-brand-saffron bg-brand-cement text-brand-blue"
                        : "border-transparent text-brand-blue hover:bg-brand-cement"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap btn-secondary"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 md:px-8 bg-brand-white">{children}</main>
      </div>
    </div>
  );
}
