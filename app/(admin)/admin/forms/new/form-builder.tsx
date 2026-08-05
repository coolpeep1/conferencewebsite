"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Attendee = { id: string; full_name: string; email: string };
type Organization = {
  id: string;
  org_name: string;
  contact_name: string;
  created_by: string | null;
};
type Field = {
  label: string;
  type: "text" | "textarea" | "email" | "number";
  required: boolean;
};

export default function FormBuilder({
  attendees,
  organizations,
}: {
  attendees: Attendee[];
  organizations: Organization[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([
    { label: "", type: "text", required: true },
  ]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(index: number, patch: Partial<Field>) {
    setFields(
      fields.map((field, i) =>
        i === index ? { ...field, ...patch } : field
      )
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        fields,
        attendeeIds: selected,
      }),
    });
    if (!response.ok) {
      setError(
        (await response.json().catch(() => ({}))).error ||
          "Could not create form."
      );
      setSaving(false);
      return;
    }
    router.push("/admin/forms");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <div>
        <label className="block text-sm font-medium text-brand-blue">
          Form title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1"
            placeholder="Volunteer availability"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-brand-blue">
          Instructions
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input mt-1"
            rows={3}
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-brand-blue">
            Questions
          </h2>
          <button
            type="button"
            onClick={() =>
              setFields([
                ...fields,
                { label: "", type: "text", required: false },
              ])
            }
            className="btn-secondary"
          >
            Add question
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="rounded border border-brand-cement p-3">
              <input
                required
                value={field.label}
                onChange={(e) => update(index, { label: e.target.value })}
                className="input"
                placeholder="Question"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <select
                  value={field.type}
                  onChange={(e) =>
                    update(index, { type: e.target.value as Field["type"] })
                  }
                  className="rounded border border-brand-cement px-2 py-1 text-brand-blue"
                >
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-brand-blue">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      update(index, { required: e.target.checked })
                    }
                  />
                  Required
                </label>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFields(fields.filter((_, i) => i !== index))
                    }
                    className="ml-auto text-sm text-brand-saffron hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="font-display text-lg font-bold text-brand-blue">
          Send to attendees
        </legend>
        <p className="mt-1 text-sm text-brand-blue/70">
          Selected attendees see the form in their assigned forms list.
        </p>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto rounded border border-brand-cement p-3">
          {attendees.map((attendee) => (
            <label
              key={attendee.id}
              className="flex gap-2 text-sm text-brand-blue"
            >
              <input
                type="checkbox"
                checked={selected.includes(attendee.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, attendee.id]
                      : selected.filter((id) => id !== attendee.id)
                  )
                }
              />
              <span>
                {attendee.full_name}{" "}
                <span className="text-brand-blue/60">({attendee.email})</span>
              </span>
            </label>
          ))}
          {!attendees.length && (
            <p className="text-sm text-brand-blue/60">
              No attendees are available yet.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-lg font-bold text-brand-blue">
          Or organization recipients
        </legend>
        <p className="mt-1 text-sm text-brand-blue/70">
          Selecting an organization sends the form to the attendee account that
          submitted it.
        </p>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto rounded border border-brand-cement p-3">
          {organizations.map((org) => (
            <label
              key={org.id}
              className={`flex gap-2 text-sm ${
                !org.created_by ? "text-brand-blue/40" : "text-brand-blue"
              }`}
            >
              <input
                type="checkbox"
                disabled={!org.created_by}
                checked={!!org.created_by && selected.includes(org.created_by)}
                onChange={(e) =>
                  org.created_by &&
                  setSelected(
                    e.target.checked
                      ? [...selected, org.created_by]
                      : selected.filter((id) => id !== org.created_by)
                  )
                }
              />
              <span>
                {org.org_name}{" "}
                <span className="text-brand-blue/60">
                  ({org.contact_name}
                  {org.created_by ? "" : ", no linked attendee"})
                </span>
              </span>
            </label>
          ))}
          {!organizations.length && (
            <p className="text-sm text-brand-blue/60">
              No organizations are available yet.
            </p>
          )}
        </div>
      </fieldset>

      {error && <p className="text-sm text-brand-saffron">{error}</p>}

      <button disabled={saving} className="btn-primary">
        {saving ? "Creating..." : "Create and send form"}
      </button>
    </form>
  );
}
