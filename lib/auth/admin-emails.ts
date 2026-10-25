export const ADMIN_EMAILS = [
  "chloebnb.marcus@gmail.com",
  "marcus.arfolabi@gmail.com",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes(
    (email ?? "").trim().toLowerCase() as (typeof ADMIN_EMAILS)[number],
  );
}
