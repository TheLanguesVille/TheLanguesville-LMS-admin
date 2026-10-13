import { type ApiResult, apiClient } from "./client";

/* ------------------------------------------------------------------ *
 * Enums (contract §5)
 * ------------------------------------------------------------------ */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StudentStatus = "active" | "inactive";
export type EnrollmentType = "sponsored-access" | "learner-paid";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type ActivityType =
  | "lesson_completed"
  | "milestone"
  | "joined_course"
  | "assignment_submitted"
  | "grade_received"
  | "message_received"
  | "other";

/* ------------------------------------------------------------------ *
 * Object shapes (contract §5 DTOs — list/detail/grades/activity always
 * expose a string `id`, never `_id`).
 * ------------------------------------------------------------------ */

export interface StudentListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  /** `null` only in edge cases (e.g. representative course deleted) — guard it. */
  course: { id: string; title: string } | null;
  level: CefrLevel | null;
  progress: number;
  overallProgress: number;
}

export interface EnrolledCourse {
  enrollmentId: string;
  courseId: string;
  title: string;
  description: string;
  level: CefrLevel;
  moduleCount: number;
  lessonCount: number;
  duration: string;
  progress: number;
  status: EnrollmentStatus;
}

export interface GradeItem {
  id: string;
  title: string;
  course: string | null;
  score: number | null;
  totalPoints: number;
  letterGrade: string | null;
  gradedAt: string | null;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  courseId: string | null;
  occurredAt: string;
}

export interface StudentDetail {
  student: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    initials: string;
    status: StudentStatus;
    lastActiveAt: string | null;
  };
  stats: {
    overallProgress: number;
    avgGrade: number | null;
    coursesCount: number;
    dayStreak: number;
  };
  enrolledCourses: EnrolledCourse[];
  recentGrades: GradeItem[];
  recentActivity: ActivityItem[];
}

/* ------------------------------------------------------------------ *
 * Stats & filter dropdown (contract §2.1 / §2.2)
 * ------------------------------------------------------------------ */

export interface StudentStats {
  total: number;
  active: number;
}

export async function getStudentStats(): Promise<ApiResult<StudentStats>> {
  return apiClient<StudentStats>("/students/stats", { method: "GET" });
}

/** One entry per instructor-owned course — the "All Courses" filter options. */
export interface StudentCourseFilter {
  id: string;
  title: string;
  level: CefrLevel;
}

export async function listStudentCourses(): Promise<
  ApiResult<StudentCourseFilter[]>
> {
  return apiClient<StudentCourseFilter[]>("/students/courses", {
    method: "GET",
  });
}

/* ------------------------------------------------------------------ *
 * List (contract §2.3)
 * ------------------------------------------------------------------ */

export interface ListStudentsQuery {
  courseId?: string;
  status?: StudentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListStudentsData {
  students: StudentListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listStudents(
  params: ListStudentsQuery = {},
): Promise<ApiResult<ListStudentsData>> {
  const qs = new URLSearchParams();
  if (params.courseId) qs.append("courseId", params.courseId);
  if (params.status) qs.append("status", params.status);
  if (params.search) qs.append("search", params.search);
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<ListStudentsData>(
    `/students${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

/* ------------------------------------------------------------------ *
 * Detail + paginated sub-sections (contract §2.4 – §2.6)
 * ------------------------------------------------------------------ */

export async function getStudentDetail(
  studentId: string,
): Promise<ApiResult<StudentDetail>> {
  return apiClient<StudentDetail>(`/students/${studentId}`, { method: "GET" });
}

export interface ListGradesData {
  grades: GradeItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listStudentGrades(
  studentId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiResult<ListGradesData>> {
  const qs = new URLSearchParams();
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<ListGradesData>(
    `/students/${studentId}/grades${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

export interface ListActivityData {
  activities: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listStudentActivity(
  studentId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiResult<ListActivityData>> {
  const qs = new URLSearchParams();
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<ListActivityData>(
    `/students/${studentId}/activity${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

/* ------------------------------------------------------------------ *
 * Invite (student onboarding wizard) — the account is only created
 * when the student accepts the emailed join link.
 * ------------------------------------------------------------------ */

export interface InviteStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  enrollmentType: EnrollmentType;
  /** Min 1, from the course picker. */
  courseIds: string[];
}

export interface InviteStudentData {
  inviteId: string;
  name: string;
  email: string;
  role: "student";
  expiresAt: string;
  message?: string;
}

export async function inviteStudent(
  payload: InviteStudentPayload,
): Promise<ApiResult<InviteStudentData>> {
  return apiClient<InviteStudentData>("/students/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------ *
 * Messaging (contract §2.7 / §2.8)
 * ------------------------------------------------------------------ */

export interface MessageResult {
  messageId: string;
  recipientCount: number;
  /** 0 when email delivery is unavailable; treat 200 as success regardless. */
  deliveredCount: number;
}

export async function sendStudentMessage(
  studentId: string,
  payload: { subject: string; body: string },
): Promise<ApiResult<MessageResult>> {
  return apiClient<MessageResult>(`/students/${studentId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendBulkMessage(payload: {
  studentIds: string[];
  subject: string;
  body: string;
}): Promise<ApiResult<MessageResult>> {
  return apiClient<MessageResult>("/students/messages/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------ *
 * Display helpers
 * ------------------------------------------------------------------ */

/**
 * Render an ISO-8601 timestamp as a coarse relative label ("2h ago",
 * "Yesterday", "1 week ago"). Returns "" for `null` so callers can omit the
 * "Last active" line entirely.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;

  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;

  const years = Math.round(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/**
 * Permanently deletes the account with its conversations, notifications and
 * progress. Super Admin only — the API 403s everyone else.
 */
export async function deleteStudent(
  studentId: string,
): Promise<ApiResult<{ message?: string }>> {
  return apiClient<{ message?: string }>(`/students/${studentId}`, {
    method: "DELETE",
  });
}
