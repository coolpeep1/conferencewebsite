"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Field, FieldType, FormStatus } from "../field-types";

const NEEDS_OPTIONS: FieldType[] = ["select", "radio", "checkbox"];

function parseOptions(raw: string | undefined): string[] {
  return (raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function optionsToText(options: string[] | undefined): string {
  return (options ?? []).join("\n");
}

export default function FormBuilder({
  initialForm,
}: {
  initialForm?: {
    id: string;
    title: string;
    description: string;
    fields: Field[];
    status: FormStatus;
  };
}) {
  const router = useRouter();
  const isEdit = Boolean(initialForm);

  const [title, setTitle] = useState(initialForm?.title ?? "");
  const [description, setDescription] = useState(initialForm?.description ?? "");
  const [fields, setFields] = useState<Field[]>(
    initialForm?.fields?.length
      ? initialForm.fields
      : [{ label: "", type: "text", required: true }]
  );
  const [status, setStatus] = useState<FormStatus>(initialForm?.status ?? "draft");
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

    const invalidOptionField = fields.find(
      (f) => NEEDS_OPTIONS.includes(f.type) && (f.options?.length ?? 0) === 0
    );
    if (invalidOptionField) {
      setError(
        `"${invalidOptionField.label || "Question"}" needs at least one option.`
      );
      setSaving(false);
      return;
    }

    const url = isEdit ? `/api/admin/forms/${initialForm!.id}` : "/api/admin/forms";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        fields,
        status,
      }),
    });

    if (!response.ok) {
      setError(
        (await response.json().catch(() => ({}))).error ||
          (isEdit ? "Could not save form." : "Could not create form.")
      );
      setSaving(false);
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { id: string };
    const targetId = data.id ?? initialForm?.id;
    if (targetId) {
      router.push(`/admin/forms/${targetId}`);
    } else {
      router.push("/admin/forms");
    }
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
                  onChange={(e) => {
                    const newType = e.target.value as FieldType;
                    const patch: Partial<Field> = { type: newType };
                    if (NEEDS_OPTIONS.includes(newType) && !field.options) {
                      patch.options = [];
                    }
                    if (!NEEDS_OPTIONS.includes(newType)) {
                      patch.options = undefined;
                    }
                    update(index, patch);
                  }}
                  className="rounded border border-brand-cement px-2 py-1 text-brand-blue"
                >
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="select">Dropdown (pick one)</option>
                  <option value="radio">Radio buttons (pick one)</option>
                  <option value="checkbox">Checkboxes (pick many)</option>
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
              {NEEDS_OPTIONS.includes(field.type) && (
                <label className="mt-2 block text-xs text-brand-blue/70">
                  Options (one per line)
                  <textarea
                    value={optionsToText(field.options)}
                    onChange={(e) =>
                      update(index, { options: parseOptions(e.target.value) })
                    }
                    className="input mt-1"
                    rows={3}
                    placeholder={"Yes\nNo\nMaybe"}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="font-display text-lg font-bold text-brand-blue">
          Status
        </legend>
        <p className="mt-1 text-sm text-brand-blue/70">
          Drafts are admin-only and can be edited freely. Publishing makes the
          form available for sending to attendees.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-brand-cement p-1 text-sm">
          <button
            type="button"
            onClick={() => setStatus("draft")}
            className={`rounded px-3 py-2 font-medium ${
              status === "draft"
                ? "bg-brand-white text-brand-blue border border-brand-cement"
                : "text-brand-blue/70"
            }`}
          >
            Draft
          </button>
          <button
            type="button"
            onClick={() => setStatus("published")}
            className={`rounded px-3 py-2 font-medium ${
              status === "published"
                ? "bg-brand-white text-brand-blue border border-brand-cement"
                : "text-brand-blue/70"
            }`}
          >
            Published
          </button>
        </div>
      </fieldset>

      {error && <p className="text-sm text-brand-saffron">{error}</p>}

      <button disabled={saving} className="btn-primary">
        {saving
          ? "Saving..."
          : isEdit
            ? "Save changes"
            : status === "published"
              ? "Save and publish"
              : "Save draft"}
      </button>
    </form>
  );
}
