import { getRequiredAdmin } from "@/lib/auth";
import FormBuilder from "./form-builder";

export default async function NewAdminFormPage() {
  await getRequiredAdmin();
  return (
    <section className="max-w-2xl">
      <div className="page-header">
        <span className="accent" />
        <h1>Create Your Own Form</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Build a custom form. Save as a draft to edit before publishing, or
          publish directly to assign to attendees.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-brand-cement bg-brand-white p-5">
        <FormBuilder />
      </div>
    </section>
  );
}
