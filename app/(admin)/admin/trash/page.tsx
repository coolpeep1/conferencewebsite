import Link from "next/link";
import { getRequiredAdmin } from "@/lib/auth";
import RestoreOrganizationButton from "../_components/restore-organization-button";

type DeletedOrg = {
  id: string;
  org_name: string;
  contact_name: string;
  contact_email: string;
  num_attendees: number;
  deleted_at: string | null;
};

// "X days ago" / "X hours ago" for the soft-delete timestamp.
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(ms / (60 * 1000));
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

export const dynamic = "force-dynamic";

export default async function AdminTrashPage() {
  const { supabase } = await getRequiredAdmin();

  const { data: rows, error } = await supabase
    .from("organizations")
    .select("id, org_name, contact_name, contact_email, num_attendees, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const deletedOrgs: DeletedOrg[] = (rows ?? []) as DeletedOrg[];

  return (
    <section>
      <div className="page-header">
        <span className="accent" />
        <h1>Trash</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Soft-deleted organizations. Restorable within 5 days of being moved here.
        </p>
      </div>

      <div className="mt-4 rounded-md border border-brand-cement bg-brand-cement p-3 text-sm text-brand-blue/70">
        Organization rows are permanently deleted 5 days after being moved to
        the trash. Restore any row before then to bring it back to the active
        registrations list.
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-brand-saffron bg-brand-cement p-3 text-sm text-brand-blue">
          Could not load trash: {error.message}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {deletedOrgs.map((org) => (
          <article
            key={org.id}
            className="rounded-lg border border-brand-cement bg-brand-white p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-blue">
                  {org.org_name}
                </h2>
                <p className="mt-1 text-sm text-brand-blue/70">
                  {org.contact_name} · {org.contact_email}
                </p>
                <p className="mt-1 text-xs text-brand-blue/60">
                  {org.num_attendees} attendee{org.num_attendees === 1 ? "" : "s"}
                  {org.deleted_at ? ` · deleted ${relativeTime(org.deleted_at)}` : ""}
                </p>
              </div>
              <RestoreOrganizationButton orgId={org.id} orgName={org.org_name} />
            </div>
          </article>
        ))}

        {deletedOrgs.length === 0 && (
          <div className="mt-8 rounded-lg border-2 border-dashed border-brand-saffron bg-brand-cement p-8 text-center">
            <h2 className="font-display text-lg font-bold text-brand-blue">
              Trash is empty
            </h2>
            <p className="mt-2 text-sm text-brand-blue/70">
              Deleted organizations will appear here for 5 days before being
              permanently removed.
            </p>
            <Link
              href="/admin/dashboard"
              className="mt-4 inline-block rounded-md border border-brand-cement bg-brand-white px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-cement"
            >
              Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
