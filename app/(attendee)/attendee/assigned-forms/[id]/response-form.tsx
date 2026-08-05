"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Field = {
  label: string;
  type: "text" | "textarea" | "email" | "number";
  required: boolean;
};

export default function ResponseForm({
  assignmentId,
  fields,
  submittedAt,
}: {
  assignmentId: string;
  fields: Field[];
  submittedAt: string | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch("/api/forms/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, answers }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error || "Could not submit form.");
      return;
    }
    router.push("/attendee/assigned-forms");
    router.refresh();
  }

  if (submittedAt) {
    return (
      <div className="mt-6 rounded-lg border border-brand-cement bg-brand-cement p-5">
        <p className="font-display text-lg font-bold text-brand-blue">
          You submitted this form on {new Date(submittedAt).toLocaleString()}.
        </p>
        <p className="mt-1 text-sm text-brand-blue/70">
          Your response has been recorded. Contact the administrator if you need to update it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      {fields.map((field, i) => (
        <label key={i} className="block text-sm font-medium text-brand-blue">
          {field.label}
          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              className="input mt-1"
              rows={4}
              onChange={(e) =>
                setAnswers({ ...answers, [field.label]: e.target.value })
              }
            />
          ) : (
            <input
              required={field.required}
              type={field.type}
              className="input mt-1"
              onChange={(e) =>
                setAnswers({ ...answers, [field.label]: e.target.value })
              }
            />
          )}
        </label>
      ))}
      {error && <p className="text-sm text-brand-saffron">{error}</p>}
      <button className="btn-primary">Submit form</button>
    </form>
  );
}