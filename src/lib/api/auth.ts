import { apiClient, type ApiResult } from "./client";
import { clearSession, setToken } from "@/lib/auth/session";

/** Instructors ARE admins — same collection, same login, `role: "instructor"`. */
export type AdminRole = "superadmin" | "admin" | "instructor";

export function roleLabel(role: AdminRole | undefined): string {
  if (role === "superadmin") return "Super Admin";
  if (role === "instructor") return "Instructor";
  return "Admin";
}

export interface AdminProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

/** Step A of login only confirms an OTP was emailed — no token yet. */
export interface LoginData {
  message: string;
}

/** verify-otp returns the JWT (24h) and a confirmation message. */
export interface VerifyOtpData {
  token: string;
  message: string;
}

export interface AcceptInviteData {
  adminId: string;
  email: string;
  firstName: string;
  lastName: string;
  message: string;
}

export interface InviteData {
  inviteId: string;
  email: string;
  message: string;
}

export function isSuperAdmin(profile: AdminProfile | null | undefined): boolean {
  return profile?.role === "superadmin";
}

/** Step A: email + password → emails a 6-digit OTP. */
export async function login(
  email: string,
  password: string,
): Promise<ApiResult<LoginData>> {
  return apiClient<LoginData>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** Step B: email + 6-digit OTP → JWT. Stores the token on success. */
export async function verifyOtp(
  email: string,
  otp: string,
): Promise<ApiResult<VerifyOtpData>> {
  const result = await apiClient<VerifyOtpData>("/admin/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

  if (result.success) {
    // Drop anything cached for a previous session before starting this one.
    clearSession();
    setToken(result.data.token);
  }

  return result;
}

export async function getMe(): Promise<ApiResult<AdminProfile>> {
  return apiClient<AdminProfile>("/admin/me", { method: "GET" });
}

export interface AcceptInvitePayload {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

/** Public: complete a single-use email invite. Does NOT log the user in. */
export async function acceptInvite(
  payload: AcceptInvitePayload,
): Promise<ApiResult<AcceptInviteData>> {
  return apiClient<AcceptInviteData>("/admin/accept-invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Superadmin-only: email a new admin an invite link. No token is returned. */
export async function inviteAdmin(
  email: string,
): Promise<ApiResult<InviteData>> {
  return apiClient<InviteData>("/admin/invite", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export interface InviteInstructorPayload {
  email: string;
  firstName: string;
  lastName: string;
  /** Step 2 of the wizard — required for instructor invites (400 if omitted). */
  teachingLevel: "beginner" | "intermediate" | "advanced";
}

export interface InstructorInviteData {
  inviteId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "instructor";
  expiresAt: string;
  message?: string;
}

/**
 * Admin/superadmin: invite an instructor. Same endpoint as inviting an admin,
 * just with `role: "instructor"` + the teaching level. The instructor accepts
 * via the same /admin/accept-invite page and logs in exactly like an admin.
 */
export async function inviteInstructor(
  payload: InviteInstructorPayload,
): Promise<ApiResult<InstructorInviteData>> {
  return apiClient<InstructorInviteData>("/admin/invite", {
    method: "POST",
    body: JSON.stringify({ ...payload, role: "instructor" }),
  });
}

/** verify-reset-otp trades the emailed code for a short-lived (15m) token. */
export interface VerifyResetOtpData {
  resetToken: string;
  message: string;
}

/**
 * Reset step A: email → emails a 6-digit code. Always resolves successfully
 * (even for unknown emails) so the endpoint can't be used to probe accounts —
 * never branch the UI on whether an account exists.
 */
export async function forgotPassword(
  email: string,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>("/admin/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Reset step B: email + 6-digit code → short-lived reset token. */
export async function verifyResetOtp(
  email: string,
  otp: string,
): Promise<ApiResult<VerifyResetOtpData>> {
  return apiClient<VerifyResetOtpData>("/admin/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export interface ResetPasswordPayload {
  resetToken: string;
  password: string;
  confirmPassword: string;
}

/** Reset step C: set the new password. Does NOT log the user in. */
export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>("/admin/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  clearSession();
}
