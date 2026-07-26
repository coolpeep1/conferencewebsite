"use client";

import { useState } from "react";

type FormState = {
  org_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  num_attendees: number;
  dietary_notes: string;
};

const initialState: FormState = {
  org_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  num_attendees: 1,
  dietary_notes: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setForm(initialState);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">You&apos;re registered!</h1>
        <p className="mt-3 text-gray-600">
          Thanks for registering your organization. We&apos;ll follow up by email with next steps.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Register another organization
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold">Conference Registration</h1>
      <p className="mt-2 text-gray-600">
        Register your organization to attend. All fields marked * are required.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Organization name *">
          <input
            required
            type="text"
            value={form.org_name}
            onChange={(e) => setForm({ ...form, org_name: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Contact name *">
          <input
            required
            type="text"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Contact email *">
          <input
            required
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Contact phone">
          <input
            type="tel"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Number of attendees *">
          <input
            required
            type="number"
            min={1}
            value={form.num_attendees}
            onChange={(e) => setForm({ ...form, num_attendees: Number(e.target.value) })}
            className="input"
          />
        </Field>

        <Field label="Dietary restrictions / notes">
          <textarea
            value={form.dietary_notes}
            onChange={(e) => setForm({ ...form, dietary_notes: e.target.value })}
            className="input"
            rows={3}
          />
        </Field>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting..." : "Register"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
