"use client";

import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { CheckCircle2, Pencil } from "lucide-react";
import { TYPE_LABELS } from "@/lib/api/assignments";
import { StepHeading } from "./wizard-bits";
import { useWizard, type WizardStep } from "./wizard-context";

function formatDate(iso: string): string {
  if (!iso) return "Not set";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatTime(t: string): string {
  if (!t) return "";
  const [hStr, min] = t.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min ?? "00"} ${period}`;
}

export function StepReview() {
  const { draft, setStep, courses, isPublished } = useWizard();

  const selected = new Set(draft.selectedLessonIds);
  let courseName = "Not set";
  let lessonName = "Not set";
  const selectedCount = draft.selectedLessonIds.length;
  outer: for (const course of courses) {
    for (const m of course.modules ?? []) {
      for (const l of m.lessons) {
        if (selected.has(l.id)) {
          courseName = course.title;
          lessonName = selectedCount > 1 ? `${selectedCount} lessons` : l.title;
          break outer;
        }
      }
    }
  }

  const total = parseInt(draft.totalPoints, 10) || 0;
  const passing = parseInt(draft.passingScore, 10) || 0;
  const passingPct = total > 0 ? Math.round((passing / total) * 100) : 0;
  const dueLabel =
    draft.dueDate || draft.dueTime
      ? `${formatDate(draft.dueDate)}${draft.dueTime ? ` - ${formatTime(draft.dueTime)}` : ""}`
      : "Not set";

  const rows: { label: string; value: string; step: WizardStep }[] = [
    { label: "Title", value: draft.title || "Untitled", step: 1 },
    { label: "Description", value: draft.description || "—", step: 1 },
    { label: "Type", value: draft.type ? TYPE_LABELS[draft.type] : "Not set", step: 1 },
    { label: "Course", value: courseName, step: 1 },
    { label: "Lesson", value: lessonName, step: 1 },
    { label: "Due Date", value: dueLabel, step: 2 },
    { label: "Total Points", value: String(total), step: 3 },
    { label: "Passing Score", value: `${passingPct}% (${passing} pts)`, step: 3 },
    {
      label: "Grading Method",
      value: draft.gradingMethod
        ? draft.gradingMethod.charAt(0).toUpperCase() + draft.gradingMethod.slice(1)
        : "Not set",
      step: 3,
    },
    { label: "Late Submission", value: draft.allowLate ? "Allowed" : "Not allowed", step: 2 },
  ];

  return (
    <Stack gap={6}>
      <StepHeading
        title={isPublished ? "Review changes" : "Review & publish"}
        subtitle={
          isPublished
            ? "Check everything, then save — students see the update right away."
            : "Double-check everything before sending to students."
        }
      />

      <Stack gap={0}>
        <Text fontWeight="semibold" color="gray.900" mb={2}>
          Assignment summary
        </Text>
        {rows.map((r) => (
          <Flex
            key={r.label}
            justify="space-between"
            align="center"
            py={3.5}
            borderBottomWidth="1px"
            borderColor="gray.100"
          >
            <Text fontSize="sm" color="gray.500">
              {r.label}
            </Text>
            <HStack gap={2} maxW="60%">
              <Text fontSize="sm" color="gray.900" fontWeight="medium" truncate>
                {r.value}
              </Text>
              <Box
                as="button"
                onClick={() => setStep(r.step)}
                color="gray.400"
                cursor="pointer"
                _hover={{ color: "#2E2F6F" }}
                display="flex"
                flexShrink={0}
              >
                <Pencil size={14} />
              </Box>
            </HStack>
          </Flex>
        ))}
      </Stack>

      {draft.gradingMethod === "rubric" && draft.rubric.length > 0 ? (
        <Stack gap={0}>
          <Text fontWeight="semibold" color="gray.900" mb={2}>
            Rubric ({draft.rubric.length} criteria)
          </Text>
          {draft.rubric.map((c) => (
            <Flex
              key={c.id}
              justify="space-between"
              align="center"
              py={3.5}
              borderBottomWidth="1px"
              borderColor="gray.100"
            >
              <Text fontSize="sm" color="gray.500">
                {c.name}
              </Text>
              <HStack gap={2}>
                <Text fontSize="sm" color="gray.900" fontWeight="medium">
                  {c.points} pts
                </Text>
                <Box as="button" onClick={() => setStep(3)} color="gray.400" cursor="pointer" _hover={{ color: "#2E2F6F" }} display="flex">
                  <Pencil size={14} />
                </Box>
              </HStack>
            </Flex>
          ))}
        </Stack>
      ) : null}

      <Flex gap={3} align="flex-start" bg="#F0FDF4" borderWidth="1px" borderColor="#BBF7D0" rounded="xl" p={5}>
        <Box color="#16A34A" flexShrink={0} mt={0.5}>
          <CheckCircle2 size={22} />
        </Box>
        <Stack gap={0.5}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.900">
            Ready to publish
          </Text>
          <Text fontSize="sm" color="gray.600">
            This assignment will be visible to students in {courseName} immediately
            after publishing.
          </Text>
        </Stack>
      </Flex>
    </Stack>
  );
}
