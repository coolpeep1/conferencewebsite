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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className={`fixed inset-y-0 left-0 border-r border-slate-200 bg-white px-4 py-5 md:flex md:flex-col transition-all duration-300 ${
        sidebarOpen ? "w-64" : "w-20"
      } hidden`}>
        <div className="flex items-center justify-between">
          <div className={sidebarOpen ? "block" : "hidden"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Conference
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">{roleLabel}</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1 hover:bg-slate-100 text-slate-600"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                {sidebarOpen ? item.label : item.label.charAt(0)}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          title={!sidebarOpen ? "Sign out" : undefined}
        >
          {sidebarOpen ? "Sign out" : "⎋"}
        </button>
      </aside>

      <div className={`transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
        <header className="border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <h2 className="text-2xl font-semibold text-slate-900">Hello {greetingName}!</h2>
            </div>

            <div className="flex items-center gap-2">
              <DharmaLogo size="sm" />
              <div className="flex gap-2 overflow-x-auto md:hidden">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                      pathname === item.href
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
