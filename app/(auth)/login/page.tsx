"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { DharmaLogo } from "@/app/_components/dharma-logo";

type Role = "attendee" | "admin";
type Mode = "sign-in" | "sign-up";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "attendee";
  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const credentialsRef = useRef({ fullName: "", email: "", password: "" });

  function switchRole(nextRole: Role) {
    const draft = credentialsRef.current;
    setRole(nextRole);
    setMode("sign-in");
    setFullName(draft.fullName);
    setEmail(draft.email);
    setPassword(draft.password);
    setMessage("");
  }

  const title = useMemo(() => {
    if (mode === "sign-up") {
      return "Create attendee account";
    }

    return role === "admin" ? "Admin login" : "Attendee login";
  }, [mode, role]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const endpoint = mode === "sign-up" ? "/api/auth/signup" : "/api/auth/login";
    const body =
      mode === "sign-up"
        ? { full_name: fullName.trim(), organization_name: organizationName.trim(), email, password }
        : { email, password, role };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push(data.redirectTo || (role === "admin" ? "/admin/dashboard" : "/attendee/forms"));
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5" style={{ paddingTop: '2rem', paddingBottom: '8rem' }}>
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
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm -mt-8">
          <p className="text-sm font-medium text-slate-500 text-center">Conference portal</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 text-center">{title}</h1>

        <div className="mt-6 grid grid-cols-2 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchRole("attendee")}
            className={`rounded px-3 py-2 text-sm font-medium ${
              role === "attendee" && mode === "sign-in"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Attendee
          </button>
          <button
            type="button"
            onClick={() => switchRole("admin")}
            className={`rounded px-3 py-2 text-sm font-medium ${
              role === "admin" && mode === "sign-in"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "sign-up" && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
                <input
                  required
                  value={fullName}
                  onChange={(event) => { credentialsRef.current.fullName = event.target.value; setFullName(event.target.value); }}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Organization name</span>
                <input
                  required
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="input"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => { credentialsRef.current.email = event.target.value; setEmail(event.target.value); }}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => { credentialsRef.current.password = event.target.value; setPassword(event.target.value); }}
              className="input"
            />
          </label>

          {message && <p className="text-sm text-red-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Working..." : mode === "sign-up" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setRole("attendee");
            setMode(mode === "sign-up" ? "sign-in" : "sign-up");
            setMessage("");
          }}
          className="mt-4 w-full text-center text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Need an attendee account? Create one"}
        </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
          <p className="text-sm text-slate-600">Loading login...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
