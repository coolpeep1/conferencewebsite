"use client";
import { useState } from "react";

export default function ProfileEditor({
  name,
  email,
  profile,
}: {
  name: string;
  email: string;
  profile: {
    organization_role: string;
    bio: string;
    contact_email: string;
  } | null;
}) {
  const [role, setRole] = useState(profile?.organization_role ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [contactEmail, setContactEmail] = useState(
    profile?.contact_email || email
  );
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const r = await fetch("/api/admin/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_role: role,
        bio,
        contact_email: contactEmail,
      }),
    });
    setMessage(r.ok ? "Profile saved." : "Could not save profile.");
  }

  return (
    <form
      onSubmit={save}
      className="mt-6 max-w-2xl space-y-5 rounded-lg border border-brand-cement bg-brand-white p-5"
    >
      <p className="text-sm text-brand-blue">
        <span className="font-semibold">Name:</span> {name}
      </p>
      <label className="block text-sm font-medium text-brand-blue">
        Role in the organization
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input mt-1"
          placeholder="Conference coordinator"
        />
      </label>
      <label className="block text-sm font-medium text-brand-blue">
        Contact email
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="input mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-brand-blue">
        About you
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="input mt-1"
          rows={5}
          placeholder="Tell attendees how you can help."
        />
      </label>
      {message && <p className="text-sm text-brand-blue/70">{message}</p>}
      <button className="btn-primary">Save profile</button>
    </form>
  );
}
