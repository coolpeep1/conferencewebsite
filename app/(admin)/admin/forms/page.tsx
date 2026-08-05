import Link from "next/link";
import { getRequiredAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminFormsPage() {
  const { supabase, user } = await getRequiredAdmin();

  const { data: forms } = await supabase
    .from("custom_forms")
    .select("id, title, description, created_at, form_assignments(count)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <span className="accent" />
          <h1>My Forms</h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            Create and send custom forms to organizations.
          </p>
        </div>
        <Link href="/admin/forms/new" className="btn-primary">
          Create Your Own Form
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {forms?.map((form: any) => (
          <article
            key={form.id}
            className="rounded-lg border border-brand-cement bg-brand-white p-5"
          >
            <h2 className="font-display text-lg font-bold text-brand-blue">
              {form.title}
            </h2>
            <p className="mt-1 text-sm text-brand-blue/70">
              {form.description || "No instructions"}
            </p>
            <p className="mt-3 text-xs text-brand-blue/60">
              Sent to {form.form_assignments[0]?.count ?? 0} organization(s) ·{" "}
              {new Date(form.created_at).toLocaleDateString()}
            </p>
          </article>
        ))}
        {!forms?.length && (
          <p className="mt-8 text-sm text-brand-blue/70">
            No custom forms created yet.
          </p>
        )}
      </div>
    </section>
  );
}
