import CreateAttendeeForm from "./create-attendee-form";

export default function CreateAttendeePage() {
  return (
    <section className="max-w-2xl">
      <div className="page-header">
        <span className="accent" />
        <h1>Create Attendee</h1>
        <p className="mt-2 text-sm text-brand-blue/70">
          Create an attendee account and their linked organization record.
        </p>
      </div>
      <div className="mt-6 rounded-lg border border-brand-cement bg-brand-white p-5">
        <CreateAttendeeForm />
      </div>
    </section>
  );
}
