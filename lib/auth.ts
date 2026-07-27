import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, type SessionUser } from "@/lib/session";

export function getDisplayName(user: SessionUser) {
  if (user.full_name.trim()) {
    return user.full_name.trim();
  }

  return user.email.split("@")[0] || "there";
}

export async function getRequiredUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createAdminClient();
  return { supabase, user };
}

export async function getRequiredAdmin() {
  const { supabase, user } = await getRequiredUser();

  if (user.role !== "admin") {
    redirect("/attendee/forms");
  }

  return { supabase, user };
}

export async function getRequiredAttendee() {
  const { supabase, user } = await getRequiredUser();

  if (user.role !== "attendee") {
    redirect("/admin/dashboard");
  }

  return { supabase, user };
}
