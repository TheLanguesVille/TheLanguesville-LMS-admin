import { type ApiResult, apiClient } from "./client";

/* ------------------------------------------------------------------ *
 * Profile (contract §4.1 / §4.2)
 * ------------------------------------------------------------------ */

export interface SettingsProfile {
  id: string;
  email: string;
  firstName: string;
  /** Optional fields are omitted by the backend when unset. */
  middleName?: string;
  lastName: string;
  fullName: string;
  /** Coarse account type — still what the legacy route guards check. */
  role: string;
  /**
   * The named role from "Roles & Permissions" — what the profile card's Role
   * row shows. Null for accounts predating roles, and for instructors.
   */
  roleId: string | null;
  roleName: string;
  professionalTitle?: string;
  department?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  professionalTitle?: string;
  department?: string;
  bio?: string;
  avatarUrl?: string;
}

export async function getProfile(): Promise<ApiResult<SettingsProfile>> {
  return apiClient<SettingsProfile>("/settings/profile", { method: "GET" });
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<ApiResult<SettingsProfile>> {
  return apiClient<SettingsProfile>("/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------ *
 * Security (contract §4.3)
 * ------------------------------------------------------------------ */

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>("/settings/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------ *
 * Notifications (contract §4.4 / §4.5)
 * ------------------------------------------------------------------ */

export interface NotificationPreferences {
  /** Teaching Activity */
  assignmentSubmissions: boolean;
  gradeReviewRequests: boolean;
  /** Delivery Channels */
  emailNotifications: boolean;
  browserPushNotifications: boolean;
}

export async function getNotifications(): Promise<
  ApiResult<NotificationPreferences>
> {
  return apiClient<NotificationPreferences>("/settings/notifications", {
    method: "GET",
  });
}

export async function updateNotifications(
  patch: Partial<NotificationPreferences>,
): Promise<ApiResult<NotificationPreferences>> {
  return apiClient<NotificationPreferences>("/settings/notifications", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/* ------------------------------------------------------------------ *
 * Permissions — the fine-grained layer that sits on top of the coarse
 * account `role`. A named role holds a set of these keys; an admin points at
 * one named role. (contract §"two layers of access")
 * ------------------------------------------------------------------ */

/**
 * Catalog keys. Kept as a union so `hasPermission` calls are typo-checked,
 * but the *labels* always come from the API so they're never duplicated here.
 */
export type Permission =
  | "courses.view"
  | "courses.publish"
  | "courses.edit"
  | "courses.delete"
  | "students.view"
  | "students.invite"
  | "students.delete"
  | "instructors.view"
  | "instructors.invite"
  | "instructors.approve"
  | "analytics.view"
  | "analytics.export"
  | "settings.manage_roles"
  | "settings.manage_admins";

export interface DescribedPermission {
  key: Permission;
  label: string;
  /** Group *label* ("Courses"), not the group key. */
  group: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: Array<{ key: Permission; label: string }>;
}

export interface MyPermissions {
  permissions: Permission[];
  details: DescribedPermission[];
}

/** What the signed-in admin holds — drives which tabs and actions render. */
export async function getMyPermissions(): Promise<ApiResult<MyPermissions>> {
  return apiClient<MyPermissions>("/settings/me/permissions", {
    method: "GET",
  });
}

/**
 * The grouped checkbox catalog for the new-role / role-detail screens.
 * Requires `settings.manage_roles`.
 */
export async function getPermissionCatalog(): Promise<
  ApiResult<{ groups: PermissionGroup[]; total: number }>
> {
  return apiClient<{ groups: PermissionGroup[]; total: number }>(
    "/settings/permissions",
    { method: "GET" },
  );
}

/* ------------------------------------------------------------------ *
 * Roles & Permissions tab (contract §2)
 * ------------------------------------------------------------------ */

/** One avatar in a role's "Active Admins" cell. */
export interface RoleAdminSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  /** Lets the UI render "(You)" without comparing ids. */
  isYou: boolean;
}

export interface RoleListItem {
  id: string;
  name: string;
  /** Capped at 5 per row by the API — use `activeAdminsCount` for the "+N". */
  activeAdmins: RoleAdminSummary[];
  activeAdminsCount: number;
  permissionCount: number;
  /**
   * Catalog-order labels ("View courses", …) — the Change role picker's
   * summary line, which can't read the catalog with only `manage_admins`.
   */
  permissionLabels: string[];
  /** Coarse account type the role grants; only superadmins assign "superadmin". */
  kind: "admin" | "superadmin";
  /** Built-in roles can't be deleted; hide the trash action. */
  isSystem: boolean;
  lastUpdated: string;
}

export interface RoleDetail {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  /** Full list here, unlike the capped list view. */
  activeAdmins: RoleAdminSummary[];
  activeAdminsCount: number;
  lastUpdated: string;
  createdAt: string;
}

/** Readable with either `manage_roles` or `manage_admins` (invite dropdown). */
export async function listRoles(): Promise<
  ApiResult<{ roles: RoleListItem[] }>
> {
  return apiClient<{ roles: RoleListItem[] }>("/settings/roles", {
    method: "GET",
  });
}

export async function getRole(roleId: string): Promise<ApiResult<RoleDetail>> {
  return apiClient<RoleDetail>(`/settings/roles/${roleId}`, { method: "GET" });
}

/** `permissions` may be empty — tick the boxes on the detail page instead. */
export async function createRole(payload: {
  name: string;
  permissions: Permission[];
}): Promise<ApiResult<RoleDetail>> {
  return apiClient<RoleDetail>("/settings/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Rename and/or re-tick permissions. At least one field must be present, and
 * `permissions` REPLACES the whole set — send the full ticked list, not a delta.
 */
export async function updateRole(
  roleId: string,
  payload: { name?: string; permissions?: Permission[] },
): Promise<ApiResult<RoleDetail>> {
  return apiClient<RoleDetail>(`/settings/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** 400s for built-in roles and for roles that still have admins assigned. */
export async function deleteRole(
  roleId: string,
): Promise<ApiResult<{ message?: string }>> {
  return apiClient<{ message?: string }>(`/settings/roles/${roleId}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------------ *
 * Admin Management tab (contract §3) — all gated on `manage_admins`.
 * ------------------------------------------------------------------ */

/**
 * "Inactive" is this screen's wording for the same stored state the instructor
 * screens call "suspended": the account keeps its data and is blocked at login.
 */
export type AdminAccountStatus = "active" | "inactive";

export interface AdminListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  roleId: string | null;
  roleName: string;
  status: AdminAccountStatus;
  isYou: boolean;
  joinedAt: string;
}

/** The Details modal — the list row plus the permissions the guards enforce. */
export interface AdminDetail extends AdminListItem {
  permissions: DescribedPermission[];
  permissionCount: number;
}

export interface ListAdminsParams {
  /** Matches first name, last name or email. */
  search?: string;
  /** Omit for both. */
  status?: AdminAccountStatus;
  page?: number;
  limit?: number;
}

/** Instructors are deliberately excluded — they have their own screens. */
export async function listAdmins(params: ListAdminsParams = {}): Promise<
  ApiResult<{
    admins: AdminListItem[];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 10));

  return apiClient<{
    admins: AdminListItem[];
    total: number;
    page: number;
    totalPages: number;
  }>(`/settings/admins?${search.toString()}`, { method: "GET" });
}

export async function getAdmin(
  adminId: string,
): Promise<ApiResult<AdminDetail>> {
  return apiClient<AdminDetail>(`/settings/admins/${adminId}`, {
    method: "GET",
  });
}

export interface AdminInviteData {
  inviteId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expiresAt: string;
  message?: string;
}

/**
 * Emails the standard invite with a password-setup link; the named role rides
 * on the invite and is applied when the account is created. Assigning the
 * Super Admin role requires the inviter to be a superadmin.
 */
export async function inviteAdminAccount(payload: {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
}): Promise<ApiResult<AdminInviteData>> {
  return apiClient<AdminInviteData>("/settings/admins/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** 400s on your own account, a no-op state change, or the last superadmin. */
export async function deactivateAdmin(
  adminId: string,
): Promise<ApiResult<{ status: AdminAccountStatus }>> {
  return apiClient<{ status: AdminAccountStatus }>(
    `/settings/admins/${adminId}/deactivate`,
    { method: "PATCH" },
  );
}

export async function reactivateAdmin(
  adminId: string,
): Promise<ApiResult<{ status: AdminAccountStatus }>> {
  return apiClient<{ status: AdminAccountStatus }>(
    `/settings/admins/${adminId}/reactivate`,
    { method: "PATCH" },
  );
}

/**
 * Moves an admin onto another role — how a role gains/loses active admins.
 * 400s on your own account, on Super Admin targets/roles unless you're a
 * superadmin, and on demoting the last superadmin.
 */
export async function changeAdminRole(
  adminId: string,
  roleId: string,
): Promise<ApiResult<AdminDetail>> {
  return apiClient<AdminDetail>(`/settings/admins/${adminId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ roleId }),
  });
}
