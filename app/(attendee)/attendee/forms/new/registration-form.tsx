"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function RegistrationForm({ returnPath = "/attendee/forms" }: { returnPath?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus("error");
      setErrorMsg(data.error || "Could not submit registration.");
      return;
    }

    router.push(returnPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Organization name">
        <input
          required
          value={form.org_name}
          onChange={(event) => setForm({ ...form, org_name: event.target.value })}
          className="input"
        />
      </Field>

      <Field label="Contact name">
        <input
          required
          value={form.contact_name}
          onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
          className="input"
        />
      </Field>

      <Field label="Contact email">
        <input
          required
          type="email"
          value={form.contact_email}
          onChange={(event) => setForm({ ...form, contact_email: event.target.value })}
          className="input"
        />
      </Field>

      <Field label="Contact phone">
        <input
          type="tel"
          value={form.contact_phone}
          onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}
          className="input"
        />
      </Field>

      <Field label="Number of attendees">
        <input
          required
          type="number"
          min={1}
          value={form.num_attendees}
          onChange={(event) =>
            setForm({ ...form, num_attendees: Number(event.target.value) })
          }
          className="input"
        />
      </Field>

      <Field label="Dietary restrictions or notes">
        <textarea
          value={form.dietary_notes}
          onChange={(event) => setForm({ ...form, dietary_notes: event.target.value })}
          className="input"
          rows={4}
        />
      </Field>

      {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting..." : "Submit Form"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
