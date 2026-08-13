export type EmailTrigger =
  | "registration_status_changed"
  | "form_assigned"
  | "form_response_submitted"
  | "registration_submitted";

type AbsorbedItem = { subject: string };

export type RenderEmailArgs = {
  trigger: EmailTrigger;
  meta: Record<string, unknown>;
  alsoIncludes?: AbsorbedItem[];
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(relatedLink: string) {
  if (!relatedLink) return baseUrl;
  if (relatedLink.startsWith("http://") || relatedLink.startsWith("https://")) {
    return relatedLink;
  }
  return `${baseUrl}${relatedLink.startsWith("/") ? "" : "/"}${relatedLink}`;
}

function alsoIncludesHtml(items?: AbsorbedItem[]) {
  if (!items || items.length === 0) return "";
  return `
    <div style="background:#f2f5ff;border-left:3px solid #f58700;padding:12px 16px;margin:16px 0;font-size:14px;color:#5a6075;">
      <div style="color:#192243;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px 0;">Also included in this email</div>
      ${items.map((item) => `<div style="margin:4px 0;">• ${escapeHtml(item.subject)}</div>`).join("")}
    </div>
  `;
}

function alsoIncludesText(items?: AbsorbedItem[]) {
  if (!items || items.length === 0) return "";
  return `\nAlso included in this email:\n${items.map((item) => `- ${item.subject}`).join("\n")}`;
}

function layout(title: string, preview: string, bodyHtml: string, footerLink: string, footerLabel: string) {
  return {
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { background:#f2f5ff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; margin:0; padding:0; }
      .container { background:#fff; margin:32px auto; padding:32px; max-width:560px; border-radius:8px; }
      .header { border-bottom:3px solid #f58700; padding-bottom:16px; margin-bottom:24px; }
      .title { color:#192243; font-size:22px; font-weight:600; margin:0; }
      .paragraph { color:#192243; font-size:16px; line-height:24px; margin:0 0 16px 0; }
      .button { background:#f58700; color:#fff !important; border-radius:6px; font-size:15px; font-weight:600; padding:12px 20px; text-decoration:none; display:inline-block; }
      .footer { color:#5a6075; font-size:13px; margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; }
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <div class="container">
      <div class="header"><h1 class="title">${escapeHtml(title)}</h1></div>
      ${bodyHtml}
      <div class="footer"><a href="${escapeHtml(absoluteUrl(footerLink))}" style="color:#f58700;">${escapeHtml(footerLabel)}</a></div>
    </div>
  </body>
</html>`,
    text: `${preview}\n\n${bodyHtml.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")}\n\n${footerLabel}: ${absoluteUrl(footerLink)}`,
  };
}

export function renderEmail(args: RenderEmailArgs): RenderedEmail {
  const also = args.alsoIncludes && args.alsoIncludes.length > 0 ? args.alsoIncludes : undefined;

  switch (args.trigger) {
    case "registration_status_changed": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const orgName = typeof args.meta.orgName === "string" ? args.meta.orgName : "your organization";
      const newStatus = typeof args.meta.newStatus === "string" ? args.meta.newStatus : "updated";
      const statusCopy: Record<string, string> = {
        pending: "is being reviewed",
        confirmed: "has been confirmed",
        waitlisted: "has been placed on the waitlist",
        declined: "could not be accepted",
      };
      const phrase = statusCopy[newStatus] ?? `is now ${newStatus}`;
      const bodyHtml = `
        <p class="paragraph">Hi ${escapeHtml(fullName)},</p>
        <p class="paragraph">Your registration for <strong>${escapeHtml(orgName)}</strong> ${escapeHtml(phrase)}.</p>
        ${alsoIncludesHtml(also)}
      `;
      const bodyText = `Hi ${fullName},\n\nYour registration for ${orgName} ${phrase}.${alsoIncludesText(also)}`;
      const preview = `Registration ${newStatus}: ${orgName}`;
      const rendered = layout(`Registration ${newStatus}`, preview, bodyHtml, "/attendee", "View your registration");
      return { subject: `Your registration is ${newStatus}`, html: rendered.html, text: bodyText + `\n\nView your registration: ${absoluteUrl("/attendee")}` };
    }
    case "form_assigned": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const formTitle = typeof args.meta.formTitle === "string" ? args.meta.formTitle : "a form";
      const formLink = absoluteUrl(typeof args.meta.formLink === "string" ? args.meta.formLink : "/attendee/assigned-forms");
      const bodyHtml = `
        <p class="paragraph">Hi ${escapeHtml(fullName)},</p>
        <p class="paragraph">You've been assigned the form <strong>${escapeHtml(formTitle)}</strong>. Please complete it at your earliest convenience.</p>
        <p><a href="${escapeHtml(formLink)}" class="button">Complete form</a></p>
        ${alsoIncludesHtml(also)}
      `;
      const bodyText = `Hi ${fullName},\n\nYou've been assigned the form ${formTitle}. Please complete it at your earliest convenience.${alsoIncludesText(also)}\n\nComplete form: ${formLink}`;
      const rendered = layout("You've been assigned a form", `New form to complete: ${formTitle}`, bodyHtml, formLink, "Open the form");
      return { subject: `New form to complete: ${formTitle}`, html: rendered.html, text: bodyText };
    }
    case "form_response_submitted": {
      const adminName = typeof args.meta.adminName === "string" ? args.meta.adminName : "Admin";
      const respondentName = typeof args.meta.respondentName === "string" ? args.meta.respondentName : "Someone";
      const formTitle = typeof args.meta.formTitle === "string" ? args.meta.formTitle : "a form";
      const responsesLink = absoluteUrl(typeof args.meta.responsesLink === "string" ? args.meta.responsesLink : "/admin/responses");
      const bodyHtml = `
        <p class="paragraph">Hi ${escapeHtml(adminName)},</p>
        <p class="paragraph"><strong>${escapeHtml(respondentName)}</strong> submitted a response for the form <strong>${escapeHtml(formTitle)}</strong>.</p>
        <p><a href="${escapeHtml(responsesLink)}" class="button">View response</a></p>
        ${alsoIncludesHtml(also)}
      `;
      const bodyText = `Hi ${adminName},\n\n${respondentName} submitted a response for the form ${formTitle}.${alsoIncludesText(also)}\n\nView response: ${responsesLink}`;
      const rendered = layout("New form submission", `New submission: ${formTitle}`, bodyHtml, responsesLink, "View responses");
      return { subject: `New submission: ${formTitle}`, html: rendered.html, text: bodyText };
    }
    case "registration_submitted": {
      const fullName = typeof args.meta.fullName === "string" ? args.meta.fullName : "there";
      const orgName = typeof args.meta.orgName === "string" ? args.meta.orgName : "your organization";
      const bodyHtml = `
        <p class="paragraph">Hi ${escapeHtml(fullName)},</p>
        <p class="paragraph">Thanks for registering <strong>${escapeHtml(orgName)}</strong> for the conference. We've received your registration and will email you once it's been reviewed.</p>
        ${alsoIncludesHtml(also)}
      `;
      const bodyText = `Hi ${fullName},\n\nThanks for registering ${orgName} for the conference. We've received your registration and will email you once it's been reviewed.${alsoIncludesText(also)}`;
      const rendered = layout("Thanks for registering", `Registration received: ${orgName}`, bodyHtml, "/attendee", "Go to your portal");
      return { subject: `Registration received: ${orgName}`, html: rendered.html, text: bodyText };
    }
    default:
      throw new Error(`Unknown email trigger: ${args.trigger}`);
  }
}
