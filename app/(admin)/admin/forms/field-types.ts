// Shared types for the form-builder subsystem. Used by the create, edit,
// preview, and detail pages. Keep this in sync with the
// `field.type` strings rendered by the attendee form.

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "select"
  | "radio"
  | "checkbox";

export type Field = {
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

export type FormStatus = "draft" | "published";
