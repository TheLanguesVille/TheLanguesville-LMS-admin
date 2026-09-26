/**
 * Centralized course route URLs.
 *
 * The app is deployed as a static export (`output: "export"`), which cannot
 * serve dynamic path segments for runtime-only ids. So course/lesson ids travel
 * in the query string and every page below is a real static route.
 */

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

export const coursePaths = {
  list: "/courses",
  new: "/courses/new",
  details: (courseId: string) => `/courses/details${qs({ courseId })}`,
  edit: (
    courseId: string,
    opts?: { moduleId?: string; lessonId?: string },
  ) => `/courses/edit${qs({ courseId, ...opts })}`,
  lesson: (courseId: string, lessonId: string) =>
    `/courses/lessons${qs({ courseId, lessonId })}`,
};

export const assignmentPaths = {
  list: "/assignment",
  new: "/assignment/new",
  /** Resume a draft in the builder. */
  edit: (assignmentId: string) => `/assignment/edit${qs({ assignmentId })}`,
  details: (assignmentId: string) =>
    `/assignment/details${qs({ assignmentId })}`,
  grade: (assignmentId: string, submissionId: string) =>
    `/assignment/grade${qs({ assignmentId, submissionId })}`,
};

export const settingsPaths = {
  index: "/settings",
  /** Deep-links straight to a tab: /settings?tab=roles */
  tab: (tab: "profile" | "roles" | "admins" | "notifications") =>
    `/settings${qs({ tab })}`,
  newRole: "/settings/roles/new",
  roleDetail: (roleId: string) => `/settings/roles/details${qs({ roleId })}`,
};

export const analyticsPaths = {
  index: "/analytics",
};

export const studentPaths = {
  list: "/students",
  details: (studentId: string) => `/students/details${qs({ studentId })}`,
};

export const instructorPaths = {
  list: "/instructors",
  details: (instructorId: string) =>
    `/instructors/details${qs({ instructorId })}`,
};

export const invitationPaths = {
  list: "/invitations",
};
