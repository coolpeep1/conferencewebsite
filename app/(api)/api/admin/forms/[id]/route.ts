import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Confirm the form exists and is owned by this admin before deleting.
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

  // Delete the form. The DB schema cascades to form_assignments and
  // form_responses, so removing the form cleans up everything attached to it.
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

  // Invalidate everything that lists forms or reads their responses.
  revalidatePath("/admin/forms");
  revalidatePath("/admin/responses");
  revalidatePath("/admin/dashboard");
  revalidatePath("/attendee/assigned-forms");

  return NextResponse.json({ success: true, deleted: form.title }, { status: 200 });
}
