import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = ["draft", "published"] as const;
type FormStatus = (typeof VALID_STATUSES)[number];

export async function DELETE(
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

  const { data: form, error: fetchError } = await supabase
    .from("custom_forms")
    .select("id, title")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("custom_forms")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: `Could not delete form: ${deleteError.message}` },
      { status: 500 }
    );
  }

  revalidatePath("/admin/forms");
  revalidatePath("/admin/responses");
  revalidatePath("/admin/dashboard");
  revalidatePath("/attendee/assigned-forms");

  return NextResponse.json({ success: true, deleted: form.title }, { status: 200 });
}

export async function PUT(
  request: Request,
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

  // Confirm the form exists and is owned by this admin.
  const { data: form, error: fetchError } = await supabase
    .from("custom_forms")
    .select("id, title, status, published_at")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }

  // If the form has any responses, edits always create a clone — the original
  // stays intact with its responses, and the new copy becomes the editable one.
  // This is the user-chosen "always clone" semantics.
  const { count: responseCount, error: countError } = await supabase
    .from("form_responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const hasResponses = (responseCount ?? 0) > 0;

  if (hasResponses) {
    // Clone: insert a new row with cloned_from pointing at the original. The
    // original keeps its existing responses unchanged.
    const { data: clone, error: cloneError } = await supabase
      .from("custom_forms")
      .insert({
        created_by: user.id,
        title,
        description,
        fields,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        cloned_from: id,
      })
      .select("id, status")
      .single();

    if (cloneError || !clone) {
      return NextResponse.json(
        { error: cloneError?.message || "Could not clone form." },
        { status: 500 }
      );
    }

    revalidatePath("/admin/forms");
    revalidatePath(`/admin/forms/${id}`);
    revalidatePath(`/admin/forms/${clone.id}`);

    return NextResponse.json({
      id: clone.id,
      status: clone.status,
      clonedFrom: id,
    });
  }

  // No responses — update in place.
  const { error: updateError } = await supabase
    .from("custom_forms")
    .update({
      title,
      description,
      fields,
      status,
      published_at:
        status === "published"
          ? form.published_at ?? new Date().toISOString()
          : null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${id}`);

  return NextResponse.json({ id, status, clonedFrom: null });
}
