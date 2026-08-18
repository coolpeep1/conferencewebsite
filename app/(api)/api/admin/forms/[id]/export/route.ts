import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";
import type { Field } from "@/app/(admin)/admin/forms/field-types";

type AnswerValue = string | string[] | boolean | number | null | undefined;

type AssignmentRow = {
  id: string;
  assigned_at: string;
  recipient_user_id: string | null;
  app_users: { full_name: string; email: string } | null;
  form_responses:
    | {
        answers: Record<string, unknown> | null;
        submitted_at: string;
      }
    | Array<{
        answers: Record<string, unknown> | null;
        submitted_at: string;
      }>
    | null;
};

function formatValue(value: AnswerValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.filter((x) => x != null).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

// Quote per RFC 4180. Defensive against leftover newlines inside multi-line
// answer text (e.g. multiple-line answers joined by `\n`).
function escapeCsv(value: AnswerValue): string {
  const str = formatValue(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function answersForField(
  answers: Record<string, unknown> | null,
  label: string,
): string {
  if (!answers) return "";
  return formatValue(answers[label] as AnswerValue);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Form id is required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: form, error: formError } = await supabase
    .from("custom_forms")
    .select("id, title, description, fields")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (formError) {
    return NextResponse.json({ error: formError.message }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const fields = (form.fields ?? []) as Field[];

  // Pull every assignment with the recipient + the submitted response.
  const { data: assignments, error } = await supabase
    .from("form_assignments")
    .select(
      "id, assigned_at, recipient_user_id, app_users(full_name, email), form_responses(answers, submitted_at)"
    )
    .eq("form_id", id)
    .order("assigned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (assignments ?? []) as unknown as AssignmentRow[];

  const header = [
    "Recipient Name",
    "Recipient Email",
    "Assigned At",
    "Submitted At",
    "Status",
    ...fields.map((f) => f.label),
  ];

  const lines: string[] = [header.map(escapeCsv).join(",")];

  for (const assignment of rows) {
    const response = Array.isArray(assignment.form_responses)
      ? assignment.form_responses[0]
      : assignment.form_responses;

    const answers = (response?.answers ?? {}) as Record<string, unknown>;
    const row = [
      assignment.app_users?.full_name ?? "",
      assignment.app_users?.email ?? "",
      assignment.assigned_at,
      response?.submitted_at ?? "",
      response ? "Submitted" : "Pending",
      ...fields.map((f) => answersForField(answers, f.label)),
    ];
    lines.push(row.map(escapeCsv).join(","));
  }

  const csv = lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${slugify(form.title)}-responses-${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
