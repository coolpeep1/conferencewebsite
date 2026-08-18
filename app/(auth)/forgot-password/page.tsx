"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    setMessage(data.message || "If an account exists with this email, you will receive a password reset link.");
    setLoading(false);
    setEmail("");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-brand-white px-5"
      style={{ paddingTop: "2rem", paddingBottom: "8rem" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-0">
          <Image
            src="/image__6_-removebg-preview.png"
            alt="Dharma Forward Foundation"
            width={280}
            height={280}
            className="w-70 h-70 object-contain flex-shrink-0"
            priority
            style={{ margin: 0, padding: 0 }}
          />
        </div>
        <div className="rounded-lg border border-brand-cement bg-brand-white p-6 -mt-8">
          <p className="text-sm font-medium text-brand-blue/70 text-center">
            Conference portal
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-brand-blue text-center">
            Forgot password
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-brand-blue">
                Email
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input"
                placeholder="Enter your email"
              />
            </label>

            {message && <p className="text-sm text-brand-blue">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <Link
            href="/login"
            className="mt-4 block text-center text-sm font-medium text-brand-blue/70 hover:text-brand-blue"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
