import { apiClient, type ApiResult } from "./client";

export interface CourseSummary {
  _id: string;
  title: string;
  description: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  price: number;
  duration: string;
  status: "draft" | "published" | "archived";
  thumbnailUrl?: string;
  tags?: string[];
  enrolledCount: number;
  completionRate: number;
  instructorId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  moduleCount: number;
  lessonCount: number;
  modules?: { _id: string; title: string; lessons?: { _id: string }[] }[];
  createdAt: string;
  updatedAt: string;
}

export interface ListCoursesQuery {
  status?: "draft" | "published" | "archived";
  level?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListCoursesData {
  courses: CourseSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function listCourses(
  params: ListCoursesQuery = {},
): Promise<ApiResult<ListCoursesData>> {
  const qs = new URLSearchParams();
  if (params.status) qs.append("status", params.status);
  if (params.level) qs.append("level", params.level);
  if (params.search) qs.append("search", params.search);
  if (params.page) qs.append("page", params.page.toString());
  if (params.limit) qs.append("limit", params.limit.toString());
  return apiClient<ListCoursesData>(`/courses?${qs.toString()}`, {
    method: "GET",
  });
}

export interface ApiContentBlock {
  _id: string;
  type: "text" | "video" | "file";
  title?: string;
  content?: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  order: number;
}

export interface ApiLessonDetail {
  _id: string;
  title: string;
  description?: string;
  contentBlocks: ApiContentBlock[];
  order: number;
  duration?: number;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiModuleDetail {
  _id: string;
  title: string;
  description?: string;
  lessons: ApiLessonDetail[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCourse {
  _id: string;
  title: string;
  description: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  price: number;
  duration: string;
  status: "draft" | "published" | "archived";
  instructorId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  modules: ApiModuleDetail[];
  thumbnailUrl?: string;
  tags?: string[];
  enrolledCount: number;
  completionRate: number;
  createdAt: string;
  updatedAt: string;
}

export async function getCourse(
  courseId: string,
): Promise<ApiResult<ApiCourse>> {
  return apiClient<ApiCourse>(`/courses/${courseId}`, { method: "GET" });
}

export async function unpublishCourse(
  courseId: string,
): Promise<ApiResult<ApiCourse>> {
  return apiClient<ApiCourse>(`/courses/${courseId}/unpublish`, {
    method: "POST",
  });
}

export async function archiveCourse(
  courseId: string,
): Promise<ApiResult<ApiCourse>> {
  return apiClient<ApiCourse>(`/courses/${courseId}/archive`, {
    method: "POST",
  });
}

export interface ApiModule {
  _id: string;
  title: string;
  description?: string;
  order: number;
  lessons: ApiLesson[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiLesson {
  _id: string;
  title: string;
  description?: string;
  order: number;
  duration?: number;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function addApiModule(
  courseId: string,
  title: string,
): Promise<ApiResult<ApiModule>> {
  return apiClient<ApiModule>(`/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateApiModule(
  courseId: string,
  moduleId: string,
  title: string,
): Promise<ApiResult<ApiModule>> {
  return apiClient<ApiModule>(`/courses/${courseId}/modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteApiModule(
  courseId: string,
  moduleId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>(
    `/courses/${courseId}/modules/${moduleId}`,
    { method: "DELETE" },
  );
}

export async function addApiLesson(
  courseId: string,
  moduleId: string,
  title: string,
): Promise<ApiResult<ApiLesson>> {
  return apiClient<ApiLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons`,
    { method: "POST", body: JSON.stringify({ title }) },
  );
}

export async function updateApiLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: { title?: string },
): Promise<ApiResult<ApiLesson>> {
  return apiClient<ApiLesson>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

export async function deleteApiLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    { method: "DELETE" },
  );
}

export interface ApiBlock {
  _id: string;
  type: "text" | "video" | "file";
  title?: string;
  content?: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  order: number;
}

export interface AddBlockPayload {
  type: "text" | "video" | "file";
  content?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  order?: number;
}

export interface UpdateBlockPayload {
  content?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
}

export async function addApiBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  payload: AddBlockPayload,
): Promise<ApiResult<ApiBlock>> {
  return apiClient<ApiBlock>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/blocks`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function updateApiBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  blockId: string,
  payload: UpdateBlockPayload,
): Promise<ApiResult<ApiBlock>> {
  return apiClient<ApiBlock>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/blocks/${blockId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export async function deleteApiBlock(
  courseId: string,
  moduleId: string,
  lessonId: string,
  blockId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/blocks/${blockId}`,
    { method: "DELETE" },
  );
}

export interface UpdateCoursePayload {
  title?: string;
  description?: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  price?: number;
  duration?: string;
  status?: "draft" | "published" | "archived";
}

export async function updateCourse(
  courseId: string,
  data: UpdateCoursePayload,
): Promise<ApiResult<ApiCourse>> {
  return apiClient<ApiCourse>(`/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(
  courseId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiClient<{ message: string }>(`/courses/${courseId}`, {
    method: "DELETE",
  });
}

export async function publishCourse(
  courseId: string,
): Promise<ApiResult<ApiCourse>> {
  return apiClient<ApiCourse>(`/courses/${courseId}/publish`, {
    method: "POST",
  });
}

export interface CourseReview {
  id: string;
  studentName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseReviewsData {
  /** Mean rating to 1 decimal, null when the course has no reviews. */
  average: number | null;
  total: number;
  /** Review count per star (half stars count toward the star below). */
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
  reviews: CourseReview[];
  page: number;
  totalPages: number;
}

export async function listCourseReviews(
  courseId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiResult<CourseReviewsData>> {
  const qs = new URLSearchParams();
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<CourseReviewsData>(
    `/courses/${courseId}/reviews${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

/* ------------------------------------------------------------------ *
 * Cohort progress — per-student completion for one course
 * ------------------------------------------------------------------ */

export interface CohortStudent {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  /** 0-100 completion of this course. */
  progress: number;
  status: "active" | "completed";
  enrolledAt: string;
}

export interface CourseCohortData {
  /** Students enrolled (dropped enrolments excluded). */
  total: number;
  completed: number;
  averageProgress: number;
  /** Most-progressed first. */
  students: CohortStudent[];
  page: number;
  totalPages: number;
}

export async function getCourseCohort(
  courseId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiResult<CourseCohortData>> {
  const qs = new URLSearchParams();
  if (params.page) qs.append("page", String(params.page));
  if (params.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  return apiClient<CourseCohortData>(
    `/courses/${courseId}/cohort${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}
