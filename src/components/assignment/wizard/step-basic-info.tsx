"use client";

import { HStack, Stack, Text } from "@chakra-ui/react";
import { HelpCircle, Briefcase, Pencil } from "lucide-react";
import type { AssignmentType } from "@/lib/api/assignments";
import { SelectableCard } from "@/components/assignment/shared";
import { CourseTreePicker } from "./course-tree-picker";
import { useWizard } from "./wizard-context";
import { Card, FieldLabel, StepHeading, TextAreaField, TextField } from "./wizard-bits";

const TYPES: { value: AssignmentType; label: string; icon: typeof Pencil }[] = [
  { value: "essay", label: "Essay", icon: Pencil },
  { value: "quiz", label: "Quiz", icon: HelpCircle },
  { value: "project", label: "Project", icon: Briefcase },
];

export function StepBasicInfo() {
  const { draft, update } = useWizard();

  return (
    <Stack gap={6}>
      <StepHeading
        title="Basic information"
        subtitle="Give your assignment a clear title and describe what students need to do."
      />

      <Card title="Assignment details">
        <Stack gap={4}>
          <Stack gap={0}>
            <FieldLabel>Assignment title</FieldLabel>
            <TextField
              placeholder="eg French Conversation Practice Essay"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </Stack>
          <Stack gap={0}>
            <FieldLabel>Description</FieldLabel>
            <TextAreaField
              placeholder="Describe what students needs to do, expectations and any guidelines"
              maxLength={1000}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
            />
            <Text fontSize="xs" color="gray.400" textAlign="right" mt={1.5}>
              {draft.description.length}/1000
            </Text>
          </Stack>
        </Stack>
      </Card>

      <Card title="Assignment type">
        <HStack gap={3} align="stretch">
          {TYPES.map((t) => (
            <SelectableCard
              key={t.value}
              icon={t.icon}
              label={t.label}
              selected={draft.type === t.value}
              onClick={() => update({ type: t.value })}
            />
          ))}
        </HStack>
      </Card>

      <Card title="Assign to courses">
        <CourseTreePicker />
      </Card>
    </Stack>
  );
}
