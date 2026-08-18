"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Read the token synchronously on first render — searchParams is stable for
  // the lifetime of the route, so a one-shot initializer is enough.
  const initialToken = searchParams.get("token") ?? "";
  const [token] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(
    initialToken
      ? ""
      : "Invalid reset link. Please request a new password reset."
  );
  const [loading, setLoading] = useState(false);
  const isValidToken = initialToken.length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    setMessage(data.message || "Password has been reset successfully.");
    setLoading(false);
    
    // Redirect to login after successful reset
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  if (!isValidToken) {
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
              Invalid reset link
            </h1>
            <p className="mt-4 text-sm text-brand-blue/70 text-center">
              {message}
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 block text-center text-sm font-medium text-brand-blue/70 hover:text-brand-blue"
            >
              Request a new password reset
            </Link>
          </div>
        </div>
      </main>
    );
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
            Reset password
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-brand-blue">
                New password
              </span>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input"
                placeholder="Enter new password"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-brand-blue">
                Confirm password
              </span>
              <input
                required
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input"
                placeholder="Confirm new password"
              />
            </label>

            {message && <p className="text-sm text-brand-blue">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Resetting..." : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
