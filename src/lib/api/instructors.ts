import { type ApiResult, apiClient } from "./client";
import type { CefrLevel } from "./students";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export type TeachingLevel = "beginner" | "intermediate" | "advanced";
export type InstructorStatus = "active" | "suspended";
export type InstructorActivityType =
  | "lesson_published"
  | "assignments_graded"
  | "syllabus_updated"
  | "course_created"
  | "other";

/* ------------------------------------------------------------------ *
 * Stats + list
 * ------------------------------------------------------------------ */

export interface InstructorStats {
  total: number;
  active: number;
}

export async function getInstructorStats(): Promise<
  ApiResult<InstructorStats>
> {
  return apiClient<InstructorStats>("/instructors/stats", { method: "GET" });
}

export interface InstructorListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  teachingLevel: TeachingLevel;
  status: InstructorStatus;
  studentsCount: number;
  joinedAt: string;
  /** null → render "-" */
  rating: number | null;
}

export interface ListInstructorsQuery {
  search?: string;
  status?: InstructorStatus;
  page?: number;
  limit?: number;
}

export interface ListInstructorsData {
  instructors: InstructorListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listInstructors(
  params: ListInstructorsQuery = {},
): Promise<ApiResult<ListInstructorsData>> {
  const qs = new URLSearchParams();
  if (params.search) qs.append("search", params.search);
  if (params.status) qs.append("status", params.status);
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<ListInstructorsData>(
    `/instructors${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

export interface InstructorReview {
  id: string;
  studentName: string;
  rating: number;
  comment: string | null;
  /** The course the student reviewed (null for reviews logged without one). */
  courseId: string | null;
  courseTitle: string | null;
  createdAt: string;
}

export interface InstructorActivity {
  id: string;
  type: InstructorActivityType;
  description: string;
  courseId: string | null;
  occurredAt: string;
}

export interface InstructorCourse {
  courseId: string;
  title: string;
  description: string;
  level: CefrLevel;
  moduleCount: number;
  lessonCount: number;
  duration: string;
  avgProgress: number;
}

export interface InstructorDetail {
  instructor: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    initials: string;
    teachingLevel: TeachingLevel;
    status: InstructorStatus;
    joinedAt: string;
  };
  stats: {
    students: number;
    rating: number | null;
    completion: number;
    reviews: number;
  };
  courses: InstructorCourse[];
  /** Latest 3 — "View All" pages through listInstructorReviews. */
  reviews: InstructorReview[];
  /** Latest 5. */
  recentActivity: InstructorActivity[];
}

export async function getInstructorDetail(
  instructorId: string,
): Promise<ApiResult<InstructorDetail>> {
  return apiClient<InstructorDetail>(`/instructors/${instructorId}`, {
    method: "GET",
  });
}

export interface ListReviewsData {
  reviews: InstructorReview[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listInstructorReviews(
  instructorId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiResult<ListReviewsData>> {
  const qs = new URLSearchParams();
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<ListReviewsData>(
    `/instructors/${instructorId}/reviews${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export interface InstructorMessageResult {
  /** false = email send failed but the message was still logged. */
  delivered: boolean;
}

export async function sendInstructorMessage(
  instructorId: string,
  payload: { subject: string; body: string },
): Promise<ApiResult<InstructorMessageResult>> {
  return apiClient<InstructorMessageResult>(
    `/instructors/${instructorId}/messages`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function suspendInstructor(
  instructorId: string,
): Promise<ApiResult<{ status: InstructorStatus }>> {
  return apiClient(`/instructors/${instructorId}/suspend`, {
    method: "PATCH",
  });
}

export async function unsuspendInstructor(
  instructorId: string,
): Promise<ApiResult<{ status: InstructorStatus }>> {
  return apiClient(`/instructors/${instructorId}/unsuspend`, {
    method: "PATCH",
  });
}

export async function deleteInstructor(
  instructorId: string,
): Promise<ApiResult<{ message?: string }>> {
  return apiClient(`/instructors/${instructorId}`, { method: "DELETE" });
}
