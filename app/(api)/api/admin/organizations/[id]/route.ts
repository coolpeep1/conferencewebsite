import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyEmail } from "@/lib/email/notify";

// Soft-delete an organization. The row stays in the DB for 5 days so the
// admin can restore it. After 5 days a background script (`scripts/purge-soft-deleted-orgs.js`)
// hard-deletes the row, and FK cascade removes form_assignments + form_responses.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleAction(params, "delete");
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleAction(params, "delete");
}

// Restore a soft-deleted org. Clears deleted_at + deleted_by.
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleAction(params, "restore");
}

type Action = "delete" | "restore";

type OrgContact = {
  id: string;
  org_name: string;
  contact_name: string;
  contact_email: string;
  status: string;
  deleted_at: string | null;
  created_by: string | null;
};

async function handleAction(
  params: Promise<{ id: string }>,
  action: Action
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Organization id is required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Load the org first so we have the contact info for the email.
  const { data: org, error: fetchError } = await supabase
    .from("organizations")
    .select("id, org_name, contact_name, contact_email, status, deleted_at, created_by")
    .eq("id", id)
    .maybeSingle<OrgContact>();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  if (action === "delete") {
    if (org.deleted_at) {
      // Already in trash — treat as a no-op success so the UI's second-click
      // doesn't fight the user.
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }
    const { error } = await supabase
      .from("organizations")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await sendOrgNotification(supabase, org, "org_deleted", "removed");
  } else {
    if (!org.deleted_at) {
      return NextResponse.json({ success: true, alreadyActive: true });
    }
    const { error } = await supabase
      .from("organizations")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await sendOrgNotification(supabase, org, "org_restored", "restored");
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/trash");

  return NextResponse.json({ success: true });
}

async function sendOrgNotification(
  supabase: ReturnType<typeof createAdminClient>,
  org: OrgContact,
  trigger: "org_deleted" | "org_restored",
  verb: "removed" | "restored"
): Promise<void> {
  if (!org.contact_email) return;
  await notifyEmail({
    recipient: {
      id: org.created_by,
      email: org.contact_email,
      full_name: org.contact_name,
      role: "attendee",
    },
    trigger,
    subject: `Your organization was ${verb} ${
      verb === "removed" ? "from" : "to"
    } the conference`,
    related_link: "/attendee",
    meta: {
      organizationId: org.id,
      orgName: org.org_name,
      fullName: org.contact_name,
    },
  });
}
