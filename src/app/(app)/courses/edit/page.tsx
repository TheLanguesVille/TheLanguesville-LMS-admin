"use client";

import { Box, Flex, Skeleton, Stack, Text } from "@chakra-ui/react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EditCourseShell } from "@/components/course-builder/edit-course-shell";
import {
  CourseBuilderProvider,
  useCourseBuilder,
  type CourseDraft,
} from "@/components/course-builder/course-builder-context";
import { CourseSetupStep } from "@/components/course-builder/course-setup-step";
import { CurriculumStep } from "@/components/course-builder/curriculum-step";
import {
  LessonEditor,
  saveLessonBlocks,
} from "@/components/course-builder/lesson-editor";
import { coursePaths } from "@/lib/routes";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type ApiCourse,
  duplicateCourse,
  getCourse,
  updateCourse,
} from "@/lib/api/courses";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { usePermissions } from "@/lib/hooks/use-permissions";

function mapCourseToDraft(course: ApiCourse): CourseDraft {
  return {
    title: course.title,
    description: course.description,
    level: course.level,
    price: String(course.price ?? ""),
    duration: course.duration ?? "",
    modules: course.modules.map((m) => ({
      id: m._id,
      title: m.title,
      lessons: m.lessons.map((l) => ({
        id: l._id,
        title: l.title,
        blocks: l.contentBlocks.map((b) => {
          if (b.type === "text")
            return { id: b._id, type: "text" as const, html: b.content ?? "" };
          if (b.type === "video")
            return { id: b._id, type: "video" as const, url: b.url ?? "" };
          return {
            id: b._id,
            type: "file" as const,
            fileName: b.fileName,
            fileSize: b.fileSize,
            mimeType: b.mimeType,
            fileUrl: b.fileUrl,
          };
        }),
      })),
    })),
  };
}

interface EditFlowProps {
  course: ApiCourse;
  courseId: string;
  openModuleId?: string;
  openLessonId?: string;
}

function EditFlow({
  course,
  courseId,
  openModuleId,
  openLessonId,
}: EditFlowProps) {
  const router = useRouter();
  const {
    step,
    setStep,
    draft,
    isSetupComplete,
    editingLesson,
    setEditingLesson,
  } = useCourseBuilder();

  const [saving, setSaving] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const { has } = usePermissions();
  const onDuplicate = has("courses.edit")
    ? () => setShowDuplicate(true)
    : undefined;

  const handleConfirmDuplicate = async () => {
    const result = await duplicateCourse(courseId);
    setShowDuplicate(false);
    if (result.success) {
      toast.success("Course duplicated — you're now editing the copy");
      router.push(coursePaths.edit(result.data._id));
    } else {
      toast.error(result.message || "Failed to duplicate course");
    }
  };

  const duplicateModal = showDuplicate ? (
    <ConfirmModal
      tone="info"
      title="Duplicate this course?"
      body={
        <>
            A new draft copy of <b>{course.title}</b> will be created from its
            last saved version — save any changes on this screen first.
            Students, reviews and assignments stay with the original.
        </>
      }
      confirmLabel="Duplicate course"
      onConfirm={handleConfirmDuplicate}
      onClose={() => setShowDuplicate(false)}
    />
  ) : null;

  useEffect(() => {
    if (openModuleId && openLessonId) {
      setEditingLesson({ moduleId: openModuleId, lessonId: openLessonId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSetup = async () => {
    setSaving(true);
    const result = await updateCourse(courseId, {
      title: draft.title,
      description: draft.description,
      level: draft.level ?? undefined,
      price: parseFloat(draft.price) || 0,
      duration: draft.duration,
    });
    if (result.success) {
      toast.success("Course details saved");
      setStep(2);
    } else {
      toast.error(result.message || "Failed to save course details");
    }
    setSaving(false);
  };

  const handleFinish = async () => {
    setSaving(true);
    const result = await updateCourse(courseId, {
      title: draft.title,
      description: draft.description,
      level: draft.level ?? undefined,
      price: parseFloat(draft.price) || 0,
      duration: draft.duration,
    });
    if (result.success) {
      toast.success("Course updated!");
      router.push(coursePaths.details(courseId));
    } else {
      toast.error(result.message || "Failed to save");
      setSaving(false);
    }
  };

  // Lesson editor sub-view inside step 2
  if (step === 2 && editingLesson) {
    const mod = draft.modules.find((m) => m.id === editingLesson.moduleId);
    const lesson = mod?.lessons.find((l) => l.id === editingLesson.lessonId);
    if (!mod || !lesson) {
      setEditingLesson(null);
      return null;
    }
    const finishLesson = async () => {
      setSavingLesson(true);
      const result = await saveLessonBlocks(courseId, mod.id, lesson);
      setSavingLesson(false);
      if (!result.success) {
        toast.error(
          getApiErrorMessage(
            result,
            "Couldn't save this lesson. Please try again.",
          ),
        );
        return;
      }
      toast.success("Lesson saved");
      setEditingLesson(null);
    };
    return (
      <>
        {duplicateModal}
        <EditCourseShell
          courseTitle={course.title}
          courseId={courseId}
          onDuplicate={onDuplicate}
          primaryLabel="Save lesson"
          primaryDisabled={savingLesson}
          primaryLoading={savingLesson}
          onPrimary={finishLesson}
          hidePrevious
        >
          <LessonEditor mod={mod} lesson={lesson} onDone={finishLesson} />
        </EditCourseShell>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        {duplicateModal}
        <EditCourseShell
          courseTitle={course.title}
          courseId={courseId}
          onDuplicate={onDuplicate}
          primaryLabel="Next: Curriculum"
          primaryDisabled={!isSetupComplete || saving}
          primaryLoading={saving}
          onPrimary={handleSaveSetup}
          hidePrevious
        >
          <CourseSetupStep />
        </EditCourseShell>
      </>
    );
  }

  // Step 2 — curriculum
  return (
    <>
      {duplicateModal}
      <EditCourseShell
        courseTitle={course.title}
        courseId={courseId}
        onDuplicate={onDuplicate}
        primaryLabel="Save changes"
        primaryDisabled={saving}
        primaryLoading={saving}
        onPrimary={handleFinish}
        onPrevious={() => setStep(1)}
      >
        <CurriculumStep />
      </EditCourseShell>
    </>
  );
}

function EditCoursePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";
  const openModuleId = searchParams.get("moduleId") ?? undefined;
  const openLessonId = searchParams.get("lessonId") ?? undefined;
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) {
      router.replace(coursePaths.list);
      return;
    }
    async function load() {
      // Duplicating navigates to the copy on this same page — reset so the
      // builder remounts with the new course instead of the old draft.
      setLoading(true);
      setCourse(null);
      const result = await getCourse(courseId);
      if (result.success) {
        setCourse(result.data);
      } else {
        toast.error(result.message || "Failed to load course");
        router.push(coursePaths.details(courseId));
      }
      setLoading(false);
    }
    void load();
  }, [courseId, router]);

  if (loading || !course) {
    return (
      <Flex h="100dvh" align="center" justify="center" bg="white">
        <Stack gap={3} align="center">
          <Box
            w="48px"
            h="48px"
            rounded="md"
            bg="#E8E9F5"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="lg" fontWeight="bold" color="#2E2F6F">
              L
            </Text>
          </Box>
          <Stack gap={2} w="240px">
            <Skeleton height="12px" rounded="md" />
            <Skeleton height="12px" width="70%" rounded="md" />
          </Stack>
        </Stack>
      </Flex>
    );
  }

  const seedDraft = mapCourseToDraft(course);

  return (
    <CourseBuilderProvider
      key={course._id}
      initialDraft={seedDraft}
      initialCourseId={courseId}
      initialStep={2}
    >
      <EditFlow
        course={course}
        courseId={courseId}
        openModuleId={openModuleId}
        openLessonId={openLessonId}
      />
    </CourseBuilderProvider>
  );
}

export default function EditCoursePage() {
  return (
    <Suspense>
      <EditCoursePageInner />
    </Suspense>
  );
}
