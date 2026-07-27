import RegistrationForm from "./registration-form";

export default function NewAttendeeFormPage() {
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Create New Form</h1>
      <p className="mt-1 text-sm text-slate-600">
        Submit a conference registration for your organization.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <RegistrationForm />
      </div>
    </section>
  );
}
