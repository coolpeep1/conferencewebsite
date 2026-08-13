"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DharmaLogo } from "./dharma-logo";

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

export default function SidebarShell({
  children,
  greetingName,
  navItems,
  roleLabel,
  showNotifications = false,
}: {
  children: React.ReactNode;
  greetingName: string;
  navItems: Array<NavItem | NavGroup>;
  roleLabel: string;
  showNotifications?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [formsOpen, setFormsOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const flatNavItems = useMemo(
    () =>
      navItems.flatMap((item) => ("items" in item ? item.items : [item])),
    [navItems]
  );

  useEffect(() => {
    if (!showNotifications) return;

    let active = true;

    async function loadNotifications() {
      const response = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      if (!active || !data) return;
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showNotifications]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markNotificationRead(id: string, href: string) {
    await fetch(`/api/admin/notifications/${id}`, { method: "POST" });
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    setNotificationsOpen(false);
    router.push(href || "/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-white text-brand-blue">
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r border-brand-blue bg-brand-blue px-4 py-5 transition-all duration-300 md:flex md:flex-col ${
          sidebarOpen ? "w-64" : "w-16 px-2"
        }`}
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

        <nav className={`mt-8 space-y-2 ${sidebarOpen ? "block" : "hidden"}`}>
          {navItems.map((item) => {
            if ("items" in item) {
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setFormsOpen((value) => !value)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-brand-white/90 hover:bg-brand-blue/60"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs">{formsOpen ? "▾" : "▸"}</span>
                  </button>
                  {formsOpen && (
                    <div className="ml-2 space-y-1 border-l border-brand-white/10 pl-2">
                      {item.items.map((child) => {
                        const active = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                              active
                                ? "border-brand-saffron bg-brand-blue/60 text-brand-white"
                                : "border-transparent text-brand-white/80 hover:bg-brand-blue/60 hover:text-brand-white"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
          Sign out
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
              {showNotifications && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((value) => !value)}
                    className="relative rounded-md border border-brand-cement bg-white p-2 text-brand-blue hover:bg-brand-cement"
                    aria-label="Notifications"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
                      />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-saffron px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-brand-cement bg-white shadow-lg">
                      <div className="border-b border-brand-cement px-4 py-3">
                        <p className="text-sm font-semibold text-brand-blue">
                          Notifications
                        </p>
                      </div>
                      <div className="max-h-96 overflow-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-brand-blue/70">
                            No notifications yet.
                          </p>
                        ) : (
                          notifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                markNotificationRead(
                                  item.id,
                                  item.link || "/admin/dashboard"
                                )
                              }
                              className={`block w-full border-b border-brand-cement px-4 py-3 text-left hover:bg-brand-cement ${
                                item.read_at ? "text-brand-blue/70" : "text-brand-blue"
                              }`}
                            >
                              <div className="text-sm font-medium">{item.title}</div>
                              <div className="mt-0.5 text-xs">{item.message}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto md:hidden">
                {flatNavItems.map((item) => (
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

        <main className="bg-brand-white px-5 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
