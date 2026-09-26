"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Assignment,
  AssignmentType,
  GradingMethod,
  Placement,
  PlacementInput,
  ResourceFile,
  SubmissionType,
} from "@/lib/api/assignments";
import { type ApiCourse, getCourse, listCourses } from "@/lib/api/courses";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

/* ------------------------------------------------------------------ *
 * Course → module → lesson tree (built from the real Courses API)
 * ------------------------------------------------------------------ */

export interface TreeLesson {
  id: string;
  title: string;
}
export interface TreeModule {
  id: string;
  title: string;
  lessons: TreeLesson[];
}
export interface TreeCourse {
  id: string;
  title: string;
  level: string;
  moduleCount: number;
  lessonCount: number;
  studentCount: number;
  /** null until the course detail has been lazily fetched. */
  modules: TreeModule[] | null;
  loading: boolean;
}

export interface WizardRubricCriterion {
  id: string;
  name: string;
  points: number;
}

let nextLocalId = 0;
function localId(prefix = "crit"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  nextLocalId += 1;
  return `${prefix}-${nextLocalId}`;
}

export interface AssignmentDraft {
  title: string;
  description: string;
  type: AssignmentType | null;
  /** Lesson ids selected in the course tree (source of truth for placement). */
  selectedLessonIds: string[];
  submissionType: SubmissionType | null;
  dueDate: string;
  dueTime: string;
  allowLate: boolean;
  lateDate: string;
  lateTime: string;
  gradingMethod: GradingMethod | null;
  totalPoints: string;
  passingScore: string;
  rubric: WizardRubricCriterion[];
  /** Already-uploaded resource files (bytes sent via POST /api/uploads). */
  files: ResourceFile[];
  links: string[];
}

const initialDraft: AssignmentDraft = {
  title: "",
  description: "",
  type: null,
  selectedLessonIds: [],
  submissionType: null,
  dueDate: "",
  dueTime: "23:59",
  allowLate: false,
  lateDate: "",
  lateTime: "23:59",
  gradingMethod: null,
  totalPoints: "100",
  passingScore: "60",
  rubric: [],
  files: [],
  links: [],
};

interface WizardContextValue {
  /** True while a saved draft is being loaded back into the wizard. */
  hydrating: boolean;
  /** "edit" when continuing a saved draft rather than starting fresh. */
  mode: "new" | "edit";
  draft: AssignmentDraft;
  update: (patch: Partial<AssignmentDraft>) => void;
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  /** Backend assignment id once the draft has been created (POST). */
  assignmentId: string | null;
  setAssignmentId: (id: string | null) => void;
  // course tree
  courses: TreeCourse[];
  coursesLoading: boolean;
  loadCourse: (courseId: string) => void;
  /** Real placements derived from the current lesson selection. */
  placements: PlacementInput[];
  // rubric helpers
  addCriterion: () => void;
  updateCriterion: (id: string, patch: Partial<WizardRubricCriterion>) => void;
  removeCriterion: (id: string) => void;
  rubricTotal: number;
  // validity
  canProceed: (s: WizardStep) => boolean;
  canPublish: boolean;
  furthestComplete: number;
}

const WizardContext = createContext<WizardContextValue | null>(null);

/** Collapse a lesson selection into the minimal set of course/module/lesson placements. */
function derivePlacements(
  courses: TreeCourse[],
  selected: Set<string>,
): PlacementInput[] {
  const placements: PlacementInput[] = [];
  for (const course of courses) {
    if (!course.modules) continue; // can't reason about an unloaded course
    const courseLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (courseLessonIds.length === 0) continue;
    const selectedInCourse = courseLessonIds.filter((id) => selected.has(id));
    if (selectedInCourse.length === 0) continue;

    if (selectedInCourse.length === courseLessonIds.length) {
      placements.push({ courseId: course.id });
      continue;
    }
    for (const m of course.modules) {
      const mLessonIds = m.lessons.map((l) => l.id);
      const selInModule = mLessonIds.filter((id) => selected.has(id));
      if (selInModule.length === 0) continue;
      if (selInModule.length === mLessonIds.length) {
        placements.push({ courseId: course.id, moduleId: m.id });
      } else {
        for (const id of selInModule) {
          placements.push({ courseId: course.id, moduleId: m.id, lessonId: id });
        }
      }
    }
  }
  return placements;
}

/** Per-step completeness — gates "Proceed" and picks where a resumed draft opens. */
function isStepComplete(draft: AssignmentDraft, s: WizardStep): boolean {
  const total = parseInt(draft.totalPoints, 10) || 0;
  const passing = parseInt(draft.passingScore, 10) || 0;
  switch (s) {
    case 1:
      return Boolean(
        draft.title.trim() && draft.type && draft.selectedLessonIds.length > 0,
      );
    case 2:
      return Boolean(draft.submissionType && draft.dueDate && draft.dueTime);
    case 3: {
      if (!draft.gradingMethod) return false;
      if (passing > total) return false;
      if (draft.gradingMethod === "rubric") {
        const rubricTotal = draft.rubric.reduce(
          (sum, c) => sum + (c.points || 0),
          0,
        );
        return rubricTotal > 0 && rubricTotal === total;
      }
      return Boolean(draft.totalPoints && draft.passingScore);
    }
    case 4:
      return true; // resources optional
    case 5:
      return true;
    default:
      return false;
  }
}

function modulesToTree(course: ApiCourse): TreeModule[] {
  return course.modules.map((m) => ({
    id: m._id,
    title: m.title,
    lessons: m.lessons.map((l) => ({ id: l._id, title: l.title })),
  }));
}

function placementCourseId(p: Placement): string {
  return typeof p.courseId === "string" ? p.courseId : p.courseId._id;
}

/** Inverse of derivePlacements: expand saved placements back into lesson ids. */
function expandPlacements(
  placements: Placement[],
  courses: TreeCourse[],
): string[] {
  const ids = new Set<string>();
  for (const p of placements) {
    const course = courses.find((c) => c.id === placementCourseId(p));
    if (!course?.modules) continue;
    if (p.lessonId) {
      ids.add(p.lessonId);
      continue;
    }
    for (const m of course.modules) {
      if (p.moduleId && m.id !== p.moduleId) continue;
      for (const l of m.lessons) ids.add(l.id);
    }
  }
  return [...ids];
}

/** Split an ISO timestamp into local `<input type=date>` / `<input type=time>` values. */
function splitDateTime(
  iso: string | null | undefined,
): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function draftFromAssignment(
  a: Assignment,
  selectedLessonIds: string[],
): AssignmentDraft {
  const due = splitDateTime(a.submission?.dueAt);
  const late = splitDateTime(a.submission?.lateDueAt);
  return {
    title: a.title ?? "",
    description: a.description ?? "",
    type: a.type ?? null,
    selectedLessonIds,
    submissionType: a.submission?.type ?? null,
    dueDate: due?.date ?? "",
    dueTime: due?.time ?? initialDraft.dueTime,
    allowLate: a.submission?.allowLate ?? false,
    lateDate: late?.date ?? "",
    lateTime: late?.time ?? initialDraft.lateTime,
    gradingMethod: a.grading?.method ?? null,
    totalPoints: String(a.grading?.totalPoints ?? initialDraft.totalPoints),
    passingScore: String(a.grading?.passingScore ?? initialDraft.passingScore),
    rubric: (a.grading?.rubric ?? []).map((c) => ({
      id: localId("crit"),
      name: c.name,
      points: c.points,
    })),
    files: a.resources?.files ?? [],
    links: a.resources?.links ?? [],
  };
}

export function WizardProvider({
  children,
  initialAssignment,
}: {
  children: ReactNode;
  /** A saved draft to resume; omit to start a brand-new assignment. */
  initialAssignment?: Assignment;
}) {
  const [draft, setDraft] = useState<AssignmentDraft>(initialDraft);
  const [step, setStep] = useState<WizardStep>(1);
  const [assignmentId, setAssignmentId] = useState<string | null>(
    initialAssignment?._id ?? null,
  );
  const [courses, setCourses] = useState<TreeCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [hydrating, setHydrating] = useState(Boolean(initialAssignment));

  // Load the instructor's courses for the placement picker. When resuming a
  // draft, also fetch the full tree of every course it's placed in so the
  // saved placements can be expanded back into ticked lessons — otherwise
  // derivePlacements() would see unloaded courses and drop them on next save.
  useEffect(() => {
    let active = true;
    (async () => {
      const list = await listCourses({ limit: 100 });
      let tree: TreeCourse[] = list.success
        ? list.data.courses.map((c) => ({
            id: c._id,
            title: c.title,
            level: c.level,
            moduleCount: c.moduleCount ?? 0,
            lessonCount: c.lessonCount ?? 0,
            studentCount: c.enrolledCount ?? 0,
            modules: null,
            loading: false,
          }))
        : [];

      if (initialAssignment) {
        const courseIds = [
          ...new Set(initialAssignment.placements.map(placementCourseId)),
        ];
        const details = await Promise.all(courseIds.map((id) => getCourse(id)));
        for (const result of details) {
          if (!result.success) continue;
          const c = result.data;
          const modules = modulesToTree(c);
          const loaded: TreeCourse = {
            id: c._id,
            title: c.title,
            level: c.level,
            moduleCount: modules.length,
            lessonCount: modules.reduce((n, m) => n + m.lessons.length, 0),
            studentCount: c.enrolledCount ?? 0,
            modules,
            loading: false,
          };
          tree = tree.some((t) => t.id === c._id)
            ? tree.map((t) => (t.id === c._id ? loaded : t))
            : [...tree, loaded];
        }

        const resumed = draftFromAssignment(
          initialAssignment,
          expandPlacements(initialAssignment.placements, tree),
        );
        // Open on the first unfinished step, or Review if it's ready to publish.
        const firstIncomplete = ([1, 2, 3] as WizardStep[]).find(
          (s) => !isStepComplete(resumed, s),
        );
        if (!active) return;
        setDraft(resumed);
        setStep(firstIncomplete ?? 5);
      }

      if (!active) return;
      setCourses(tree);
      setCoursesLoading(false);
      setHydrating(false);
    })();
    return () => {
      active = false;
    };
  }, [initialAssignment]);

  const loadCourse = useCallback((courseId: string) => {
    setCourses((prev) => {
      const target = prev.find((c) => c.id === courseId);
      if (!target || target.modules || target.loading) return prev;
      return prev.map((c) => (c.id === courseId ? { ...c, loading: true } : c));
    });
    getCourse(courseId).then((result) => {
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          if (!result.success) return { ...c, loading: false };
          return { ...c, loading: false, modules: modulesToTree(result.data) };
        }),
      );
    });
  }, []);

  const update = useCallback(
    (patch: Partial<AssignmentDraft>) =>
      setDraft((prev) => ({ ...prev, ...patch })),
    [],
  );

  const placements = useMemo(
    () => derivePlacements(courses, new Set(draft.selectedLessonIds)),
    [courses, draft.selectedLessonIds],
  );

  const value = useMemo<WizardContextValue>(() => {
    const rubricTotal = draft.rubric.reduce((sum, c) => sum + (c.points || 0), 0);
    const canProceed = (s: WizardStep): boolean => isStepComplete(draft, s);

    // Mirror the backend publish preconditions (contract §2.7).
    const lateOk = !draft.allowLate
      ? true
      : Boolean(draft.lateDate) &&
        (() => {
          const due = new Date(`${draft.dueDate}T${draft.dueTime || "23:59"}:00`);
          const late = new Date(`${draft.lateDate}T${draft.lateTime || "23:59"}:00`);
          return late.getTime() > due.getTime();
        })();
    const canPublish =
      canProceed(1) && canProceed(2) && canProceed(3) && lateOk;

    let furthestComplete = 0;
    for (let s = 1 as WizardStep; s <= 5; s = (s + 1) as WizardStep) {
      if (canProceed(s)) furthestComplete = s;
      else break;
    }

    return {
      hydrating,
      mode: initialAssignment ? "edit" : "new",
      draft,
      update,
      step,
      setStep,
      assignmentId,
      setAssignmentId,
      courses,
      coursesLoading,
      loadCourse,
      placements,
      addCriterion: () =>
        update({
          rubric: [
            ...draft.rubric,
            { id: localId("crit"), name: "New criterion", points: 10 },
          ],
        }),
      updateCriterion: (id, patch) =>
        update({
          rubric: draft.rubric.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }),
      removeCriterion: (id) =>
        update({ rubric: draft.rubric.filter((c) => c.id !== id) }),
      rubricTotal,
      canProceed,
      canPublish,
      furthestComplete,
    };
  }, [
    hydrating,
    initialAssignment,
    draft,
    step,
    update,
    assignmentId,
    courses,
    coursesLoading,
    loadCourse,
    placements,
  ]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
}
