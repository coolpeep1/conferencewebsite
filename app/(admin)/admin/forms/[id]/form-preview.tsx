"use client";

import type { Field } from "../field-types";

// Read-only render of a form's fields, mirroring exactly what an assigned
// attendee sees when they open it. Inputs are intentionally disabled so the
// admin can preview layout without submitting anything.
export default function FormPreview({ fields }: { fields: Field[] }) {
  return (
    <div className="mt-3 space-y-3 rounded-md border border-brand-cement bg-brand-cement p-4">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`}>
          <label className="block text-sm font-medium text-brand-blue">
            {field.label}
            {field.required && <span className="ml-1 text-brand-saffron">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              disabled
              className="input mt-1 cursor-not-allowed bg-brand-cement/40 text-brand-blue/70"
              rows={3}
            />
          ) : field.type === "select" && field.options?.length ? (
            <select
              disabled
              className="input mt-1 cursor-not-allowed bg-brand-cement/40 text-brand-blue/70"
              defaultValue=""
            >
              <option value="">Select…</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === "radio" && field.options?.length ? (
            <div className="mt-1 space-y-1">
              {field.options.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 text-sm text-brand-blue/70"
                >
                  <input type="radio" name={field.label} disabled />
                  {option}
                </label>
              ))}
            </div>
          ) : field.type === "checkbox" ? (
            <input
              type="checkbox"
              disabled
              className="mt-1 cursor-not-allowed"
            />
          ) : (
            <input
              type={field.type === "number" ? "number" : field.type}
              disabled
              className="input mt-1 cursor-not-allowed bg-brand-cement/40 text-brand-blue/70"
            />
          )}
        </div>
      ))}
    </div>
  );
}
