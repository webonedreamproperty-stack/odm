/** Pending redirect path after successful member Google OAuth */
export const MEMBER_OAUTH_NEXT_KEY = "od_member_oauth_next_path";

/** localStorage key — set by AuthProvider after member Google OAuth when sign-out is required */
export const MEMBER_OAUTH_ERROR_KEY = "od_member_oauth_error_message";

export type MemberAuthMessageTone = "info" | "warning" | "error";

/** Maps server/auth copy to UI emphasis (not security-sensitive). */
export function toneForMemberAuthMessage(message: string): MemberAuthMessageTone {
  const m = message.toLowerCase();
  if (m.includes("od partner account")) return "warning";
  if (
    m.includes("register") ||
    m.includes("not registered") ||
    m.includes("activate your membership")
  ) {
    return "info";
  }
  return "error";
}

/** Tailwind classes for inline auth notices (Google OAuth / member eligibility). */
export function memberAuthNoticeClassName(message: string): string {
  switch (toneForMemberAuthMessage(message)) {
    case "info":
      return "rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm leading-relaxed text-sky-950";
    case "warning":
      return "rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-relaxed text-amber-950";
    default:
      return "rounded-[1rem] border border-red-200 bg-red-50/90 px-4 py-3 text-left text-sm leading-relaxed text-red-700";
  }
}
