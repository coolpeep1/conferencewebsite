function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

function absoluteUrl(relatedLink) {
  if (!relatedLink) return baseUrl;
  if (relatedLink.startsWith("http://") || relatedLink.startsWith("https://")) {
    return relatedLink;
  }
  return `${baseUrl}${relatedLink.startsWith("/") ? "" : "/"}${relatedLink}`;
}

function alsoIncludesHtml(items) {
  if (!items || items.length === 0) return "";
  return `
    <div style="background:#f2f5ff;border-left:3px solid #f58700;padding:12px 16px;margin:16px 0;font-size:14px;color:#5a6075;">
      <div style="color:#192243;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px 0;">Also included in this email</div>
      ${items.map((item) => `<div style="margin:4px 0;">• ${escapeHtml(item.subject)}</div>`).join("")}
    </div>
  `;
}

function alsoIncludesText(items) {
  if (!items || items.length === 0) return "";
  return `\nAlso included in this email:\n${items.map((item) => `- ${item.subject}`).join("\n")}`;
}

function layout(title, preview, bodyHtml, footerLink, footerLabel) {
  return {
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="background:#f2f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <div style="background:#ffffff;margin:32px auto;padding:32px;max-width:560px;border-radius:8px;">
      <div style="border-bottom:3px solid #f58700;padding-bottom:16px;margin-bottom:24px;">
        <h1 style="color:#192243;font-size:22px;font-weight:600;margin:0;">${escapeHtml(title)}</h1>
      </div>
      ${bodyHtml}
      <div style="color:#5a6075;font-size:13px;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
        <a href="${escapeHtml(absoluteUrl(footerLink))}" style="color:#f58700;">${escapeHtml(footerLabel)}</a>
      </div>
    </div>
  </body>
</html>`,
    text: `${preview}`,
  };
}

function renderEmail(args) {
  const also = args.alsoIncludes && args.alsoIncludes.length > 0 ? args.alsoIncludes : undefined;

  switch (args.trigger) {
    case "registration_status_changed": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const orgName = typeof args.meta.orgName === "string" ? args.meta.orgName : "your organization";
      const newStatus = typeof args.meta.newStatus === "string" ? args.meta.newStatus : "updated";
      const statusCopy = {
        pending: "is being reviewed",
        confirmed: "has been confirmed",
        waitlisted: "has been placed on the waitlist",
        declined: "could not be accepted",
      };
      const phrase = statusCopy[newStatus] || `is now ${newStatus}`;
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(fullName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Your registration for <strong>${escapeHtml(orgName)}</strong> ${escapeHtml(phrase)}.</p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${fullName},\n\nYour registration for ${orgName} ${phrase}.${alsoIncludesText(also)}\n\nView your registration: ${absoluteUrl("/attendee")}`;
      const rendered = layout(`Registration ${newStatus}`, `Registration ${newStatus}: ${orgName}`, bodyHtml, "/attendee", "View your registration");
      return { subject: `Your registration is ${newStatus}`, html: rendered.html, text };
    }
    case "form_assigned": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const formTitle = typeof args.meta.formTitle === "string" ? args.meta.formTitle : "a form";
      const formLink = typeof args.meta.formLink === "string" ? args.meta.formLink : "/attendee/assigned-forms";
      const absLink = absoluteUrl(formLink);
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(fullName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">You've been assigned the form <strong>${escapeHtml(formTitle)}</strong>. Please complete it at your earliest convenience.</p>
        <p><a href="${escapeHtml(absLink)}" style="background:#f58700;color:#ffffff;border-radius:6px;font-size:15px;font-weight:600;padding:12px 20px;text-decoration:none;display:inline-block;">Complete form</a></p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${fullName},\n\nYou've been assigned the form ${formTitle}. Please complete it at your earliest convenience.${alsoIncludesText(also)}\n\nComplete form: ${absLink}`;
      const rendered = layout("You've been assigned a form", `New form to complete: ${formTitle}`, bodyHtml, formLink, "Open the form");
      return { subject: `New form to complete: ${formTitle}`, html: rendered.html, text };
    }
    case "form_response_submitted": {
      const adminName = typeof args.meta.adminName === "string" ? args.meta.adminName : "Admin";
      const respondentName = typeof args.meta.respondentName === "string" ? args.meta.respondentName : "Someone";
      const formTitle = typeof args.meta.formTitle === "string" ? args.meta.formTitle : "a form";
      const responsesLink = typeof args.meta.responsesLink === "string" ? args.meta.responsesLink : "/admin/responses";
      const absLink = absoluteUrl(responsesLink);
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(adminName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;"><strong>${escapeHtml(respondentName)}</strong> submitted a response for the form <strong>${escapeHtml(formTitle)}</strong>.</p>
        <p><a href="${escapeHtml(absLink)}" style="background:#f58700;color:#ffffff;border-radius:6px;font-size:15px;font-weight:600;padding:12px 20px;text-decoration:none;display:inline-block;">View response</a></p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${adminName},\n\n${respondentName} submitted a response for the form ${formTitle}.${alsoIncludesText(also)}\n\nView response: ${absLink}`;
      const rendered = layout("New form submission", `New submission: ${formTitle}`, bodyHtml, responsesLink, "View responses");
      return { subject: `New submission: ${formTitle}`, html: rendered.html, text };
    }
    case "registration_submitted": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const orgName = typeof args.meta.orgName === "string" ? args.meta.orgName : "your organization";
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(fullName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Thanks for registering <strong>${escapeHtml(orgName)}</strong> for the conference. We've received your registration and will email you once it's been reviewed.</p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${fullName},\n\nThanks for registering ${orgName} for the conference. We've received your registration and will email you once it's been reviewed.${alsoIncludesText(also)}`;
      const rendered = layout("Thanks for registering", `Registration received: ${orgName}`, bodyHtml, "/attendee", "Go to your portal");
      return { subject: `Registration received: ${orgName}`, html: rendered.html, text };
    }
    case "password_reset": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const resetLink = typeof args.meta.resetLink === "string" ? args.meta.resetLink : "/auth/reset-password";
      const absLink = absoluteUrl(resetLink);
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(fullName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">We received a request to reset your password. Click the button below to reset it:</p>
        <p><a href="${escapeHtml(absLink)}" style="background:#f58700;color:#ffffff;border-radius:6px;font-size:15px;font-weight:600;padding:12px 20px;text-decoration:none;display:inline-block;">Reset password</a></p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${fullName},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${absLink}\n\nThis link will expire in 1 hour. If you didn't request this, you can safely ignore this email.${alsoIncludesText(also)}`;
      const rendered = layout("Password Reset Request", "Password Reset Request", bodyHtml, resetLink, "Reset password");
      return { subject: "Password Reset Request", html: rendered.html, text };
    }
    case "org_deleted": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const orgName = typeof args.meta.orgName === "string" ? args.meta.orgName : "your organization";
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(fullName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Your registration for <strong>${escapeHtml(orgName)}</strong> has been removed by the conference organizer. The organization's data will be permanently deleted from our records in 5 days.</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">If this was a mistake, please contact the organizer to restore it before then. After 5 days the data is gone for good.</p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${fullName},\n\nYour registration for ${orgName} has been removed by the conference organizer. The organization's data will be permanently deleted from our records in 5 days.\n\nIf this was a mistake, please contact the organizer to restore it before then. After 5 days the data is gone for good.${alsoIncludesText(also)}`;
      const rendered = layout(`${orgName} was removed`, `${orgName} was removed from the conference`, bodyHtml, "/attendee", "View your portal");
      return { subject: `Your organization was removed from the conference`, html: rendered.html, text };
    }
    case "org_restored": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const orgName = typeof args.meta.orgName === "string" ? args.meta.orgName : "your organization";
      const bodyHtml = `
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Hi ${escapeHtml(fullName)},</p>
        <p style="color:#192243;font-size:16px;line-height:24px;margin:0 0 16px 0;">Good news — your registration for <strong>${escapeHtml(orgName)}</strong> has been restored by the conference organizer. Everything is back to normal.</p>
        ${alsoIncludesHtml(also)}
      `;
      const text = `Hi ${fullName},\n\nGood news — your registration for ${orgName} has been restored by the conference organizer. Everything is back to normal.${alsoIncludesText(also)}`;
      const rendered = layout(`${orgName} was restored`, `${orgName} was restored to the conference`, bodyHtml, "/attendee", "View your portal");
      return { subject: `Your organization was restored to the conference`, html: rendered.html, text };
    }
    default:
      throw new Error(`Unknown email trigger: ${args.trigger}`);
  }
}

module.exports = { renderEmail };
