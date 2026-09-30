import { apiClient, type ApiResult } from "./client";

export type AdminNotificationType =
  | "assignment_submitted"
  | "course_enrolled"
  | "course_reviewed"
  | "tutor_reported"
  | "invite_accepted"
  | "other";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  /** Dashboard path the row opens, e.g. "/assignment/grade?…". */
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: AdminNotification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

export function listNotifications(
  page = 1,
  limit = 10,
): Promise<ApiResult<NotificationsPage>> {
  return apiClient<NotificationsPage>(
    `/notifications?page=${page}&limit=${limit}`,
  );
}

export function getNotificationUnreadCount(): Promise<
  ApiResult<{ unreadCount: number }>
> {
  return apiClient(`/notifications/unread-count`);
}

export function markNotificationRead(
  id: string,
): Promise<ApiResult<{ message: string }>> {
  return apiClient(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead(): Promise<
  ApiResult<{ message: string }>
> {
  return apiClient(`/notifications/read-all`, { method: "POST" });
}
