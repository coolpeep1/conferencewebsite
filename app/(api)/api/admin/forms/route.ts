import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = ["draft", "published"] as const;
type FormStatus = (typeof VALID_STATUSES)[number];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const fields = Array.isArray(body?.fields) ? body.fields : [];
  const status: FormStatus =
    typeof body?.status === "string" && (VALID_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as FormStatus)
      : "draft";

  if (!title) {
    return NextResponse.json({ error: "Add a form title." }, { status: 400 });
  }
  if (!fields.length) {
    return NextResponse.json({ error: "Add at least one question." }, { status: 400 });
  }
  if (
    fields.some(
      (field: unknown) =>
        !field ||
        typeof (field as { label?: unknown }).label !== "string" ||
        !(field as { label: string }).label.trim()
    )
  ) {
    return NextResponse.json({ error: "Every question needs a label." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: form, error } = await supabase
    .from("custom_forms")
    .insert({
      created_by: user.id,
      title,
      description,
      fields,
      status,
      // The published_at timestamp is the moment the form went live. Drafts
      // stay null until they're first published.
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id, status")
    .single();

  if (error || !form) {
    return NextResponse.json({ error: "Could not create the form." }, { status: 500 });
  }

  revalidatePath("/admin/forms");
  return NextResponse.json({ id: form.id, status: form.status }, { status: 201 });
}
