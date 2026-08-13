"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateAttendeeForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/attendees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        organization_name: organizationName,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Could not create attendee.");
      return;
    }

    setFullName("");
    setEmail("");
    setOrganizationName("");
    setPassword("");
    setMessage("Attendee created.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-brand-blue">
        Full name
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-brand-blue">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-brand-blue">
        Password
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-brand-blue">
        Organization name
        <input
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          className="input mt-1"
          placeholder="Optional"
        />
      </label>
      {message && <p className="text-sm text-brand-blue/70">{message}</p>}
      <button disabled={saving} className="btn-primary">
        {saving ? "Creating..." : "Create attendee"}
      </button>
    </form>
  );
}
