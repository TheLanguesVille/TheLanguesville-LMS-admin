"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InviteOverlay } from "@/components/invitations/invite-shell";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type CourseSummary,
  addApiLesson,
  listAllCourses,
} from "@/lib/api/courses";
import { coursePaths } from "@/lib/routes";

const NAVY = "#2E2F6F";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="sm" color="gray.700" mb={2}>
      {children}
    </Text>
  );
}

const fieldStyles = {
  h: "48px",
  fontSize: "sm",
  borderColor: "gray.200",
  rounded: "lg",
  _focus: { borderColor: NAVY, outline: "none", boxShadow: "none" },
} as const;

/**
 * Dashboard "Add Lesson" quick action: pick a course and module, name the
 * lesson, then land in that lesson's editor to build its content blocks.
 */
export function AddLessonModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listAllCourses().then((result) => {
      if (result.success) {
        setCourses(result.data.filter((c) => c.status !== "archived"));
      } else {
        setCourses([]);
        toast.error(getApiErrorMessage(result, "Couldn't load your courses"));
      }
    });
  }, []);

  const course = courses?.find((c) => c._id === courseId);
  const modules = course?.modules ?? [];
  const valid = Boolean(courseId && moduleId && title.trim());

  const pickCourse = (id: string) => {
    setCourseId(id);
    const next = courses?.find((c) => c._id === id);
    // One module is the common case — preselect it.
    setModuleId(next?.modules?.length === 1 ? next.modules[0]._id : "");
  };

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const result = await addApiLesson(courseId, moduleId, title.trim());
    if (result.success) {
      toast.success("Lesson added — build its content below");
      router.push(
        coursePaths.edit(courseId, { moduleId, lessonId: result.data._id }),
      );
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't add this lesson"));
      setSaving(false);
    }
  };

  return (
    <InviteOverlay onClose={saving ? undefined : onClose} maxW="460px">
      <Stack gap={5}>
        <Stack gap={1}>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            Add Lesson
          </Text>
          <Text fontSize="sm" color="gray.500">
            Choose where the lesson goes, then build its content blocks.
          </Text>
        </Stack>

        {courses === null ? (
          <Flex justify="center" py={8}>
            <Spinner size="sm" color={NAVY} />
          </Flex>
        ) : courses.length === 0 ? (
          <Stack gap={3} align="center" textAlign="center" py={4}>
            <Text fontSize="sm" color="gray.600">
              You don&apos;t have any courses yet. Create one first, then add
              lessons to it.
            </Text>
            <Button
              bg={NAVY}
              color="white"
              rounded="full"
              h="44px"
              px={6}
              fontSize="sm"
              _hover={{ bg: "#262760" }}
              onClick={() => router.push(coursePaths.new)}
            >
              Create course
            </Button>
          </Stack>
        ) : (
          <>
            <Box>
              <FieldLabel>Course</FieldLabel>
              <NativeSelect.Root>
                <NativeSelect.Field
                  {...fieldStyles}
                  value={courseId}
                  onChange={(e) => pickCourse(e.target.value)}
                >
                  <option value="" disabled>
                    Select a course
                  </option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                      {c.status === "draft" ? " (Draft)" : ""}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>

            {courseId && modules.length === 0 ? (
              <Box bg="gray.50" rounded="lg" px={4} py={3}>
                <Text fontSize="sm" color="gray.600">
                  This course has no modules yet. Lessons live inside a
                  module —{" "}
                  <Text
                    as="span"
                    color={NAVY}
                    fontWeight="medium"
                    cursor="pointer"
                    textDecoration="underline"
                    onClick={() => router.push(coursePaths.edit(courseId))}
                  >
                    open its curriculum
                  </Text>{" "}
                  to add one.
                </Text>
              </Box>
            ) : null}

            {modules.length > 0 ? (
              <Box>
                <FieldLabel>Module</FieldLabel>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    {...fieldStyles}
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a module
                    </option>
                    {modules.map((m, i) => (
                      <option key={m._id} value={m._id}>
                        {`Module ${i + 1}: ${m.title}`}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            ) : null}

            <Box>
              <FieldLabel>Lesson Title</FieldLabel>
              <Input
                {...fieldStyles}
                value={title}
                maxLength={200}
                placeholder="e.g. Greetings and introductions"
                _placeholder={{ color: "gray.400" }}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </Box>
          </>
        )}

        <Stack gap={3}>
          {courses && courses.length > 0 ? (
            <Button
              bg={NAVY}
              color="white"
              rounded="full"
              h="48px"
              fontWeight="medium"
              _hover={{ bg: "#262760" }}
              disabled={!valid}
              loading={saving}
              onClick={submit}
            >
              Add lesson
            </Button>
          ) : null}
          <Button
            variant="outline"
            rounded="full"
            h="48px"
            fontWeight="medium"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </InviteOverlay>
  );
}
