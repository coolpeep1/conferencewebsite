"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DevLoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("Dev Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const isProduction = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (isProduction) {
      router.replace("/login");
    }
  }, [isProduction, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/dev/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
      }),
    });

    setSaving(false);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Could not create admin.");
      return;
    }

    router.push(data.redirectTo || "/admin/dashboard");
    router.refresh();
  }

  if (isProduction) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-white px-5 py-10">
        <div className="w-full max-w-md rounded-lg border border-brand-cement bg-white p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-blue">
            Development Mode Only
          </h1>
          <p className="mt-4 text-brand-blue/70">
            This page is only available in development mode. In production, use the command-line tool:
          </p>
          <code className="mt-4 block bg-brand-cement p-3 text-sm">
            npm run admin:create
          </code>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-white px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg border border-brand-cement bg-white p-6">
        <div>
          <p className="text-sm font-medium text-brand-blue/70">Development only</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-brand-blue">
            Create or sign in as admin
          </h1>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-blue">Full name</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-blue">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-blue">Password</span>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>
        {message && <p className="text-sm text-brand-saffron">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full rounded-md border border-[#f58700] bg-[#f58700] px-4 py-3 text-sm font-bold text-brand-white transition-colors hover:bg-[#d97500] disabled:opacity-50"
        >
          {saving ? "Working..." : "Create admin and sign in"}
        </button>
      </form>
    </main>
  );
}
