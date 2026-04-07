const defaultAdminEmails = ["fariavictor2011@gmail.com"];

const configuredAdminEmails = process.env.ADMIN_EMAILS
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const adminEmails = new Set([...(configuredAdminEmails ?? []), ...defaultAdminEmails]);

export const isAdminEmail = (email: string) => adminEmails.has(email.trim().toLowerCase());
