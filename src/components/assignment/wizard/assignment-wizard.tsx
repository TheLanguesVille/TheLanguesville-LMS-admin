"use client";

import { Box, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type Assignment,
  type PlacementInput,
  type UpdateAssignmentPayload,
  createAssignment,
  publishAssignment,
  recordId,
  updateAssignment,
} from "@/lib/api/assignments";
import { assignmentPaths } from "@/lib/routes";
import { StepBasicInfo } from "./step-basic-info";
import { StepGrading } from "./step-grading";
import { StepResources } from "./step-resources";
import { StepReview } from "./step-review";
import { StepSubmission } from "./step-submission";
import {
  type AssignmentDraft,
  WizardProvider,
  type WizardStep,
  useWizard,
} from "./wizard-context";
import { WizardShell } from "./wizard-shell";

/** Combine a `<input type=date>` + `<input type=time>` into an ISO-8601 string. */
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const dt = new Date(`${date}T${time || "23:59"}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

/** Build the backend slice for a given wizard step from the local draft. */
function sliceForStep(
  step: WizardStep,
  draft: AssignmentDraft,
  placements: PlacementInput[],
): UpdateAssignmentPayload {
  switch (step) {
    case 1:
      return {
        title: draft.title.trim(),
        description: draft.description || undefined,
        type: draft.type ?? undefined,
        placements,
      };
    case 2:
      return {
        submission: {
          type: draft.submissionType ?? undefined,
          // Omit rather than send null while no date is picked: the live
          // backend's schema coerces null into 1970-01-01.
          dueAt: combineDateTime(draft.dueDate, draft.dueTime) ?? undefined,
          allowLate: draft.allowLate,
          lateDueAt: draft.allowLate
            ? combineDateTime(draft.lateDate, draft.lateTime)
            : null,
        },
      };
    case 3:
      return {
        grading: {
          method: draft.gradingMethod ?? undefined,
          totalPoints: parseInt(draft.totalPoints, 10) || 0,
          passingScore: parseInt(draft.passingScore, 10) || 0,
          rubric:
            draft.gradingMethod === "rubric"
              ? draft.rubric.map((c) => ({ name: c.name, points: c.points }))
              : [],
        },
      };
    case 4:
      return {
        resources: { files: draft.files, links: draft.links },
      };
    default:
      return {};
  }
}

/** Every step's slice in one PATCH, so nothing edited on a skipped step is lost. */
function fullPayload(
  draft: AssignmentDraft,
  placements: PlacementInput[],
): UpdateAssignmentPayload {
  return ([1, 2, 3, 4] as WizardStep[]).reduce<UpdateAssignmentPayload>(
    (acc, s) => ({ ...acc, ...sliceForStep(s, draft, placements) }),
    {},
  );
}

function AssignmentWizardFlow() {
  const router = useRouter();
  const {
    hydrating,
    mode,
    isPublished,
    draft,
    step,
    setStep,
    canProceed,
    canPublish,
    placements,
    assignmentId,
    setAssignmentId,
  } = useWizard();
  const [saving, setSaving] = useState(false);

  /** Persist the current step. Creates the draft on the first save. */
  const saveCurrentStep = async (): Promise<boolean> => {
    const slice = sliceForStep(step, draft, placements);

    if (step === 1 && !assignmentId) {
      const result = await createAssignment({
        title: draft.title.trim(),
        description: draft.description || undefined,
        type: draft.type ?? undefined,
        placements,
      });
      if (!result.success) {
        toast.error(getApiErrorMessage(result, "Couldn't save assignment"));
        return false;
      }
      setAssignmentId(recordId(result.data));
      return true;
    }

    if (!assignmentId) return true; // nothing to persist yet
    const result = await updateAssignment(assignmentId, slice);
    if (!result.success) {
      toast.error(getApiErrorMessage(result, "Couldn't save changes"));
      return false;
    }
    return true;
  };

  /** Persist all steps at once (used before publishing / saving an edit). */
  const saveEverything = async (): Promise<boolean> => {
    if (!assignmentId) return false;
    const result = await updateAssignment(
      assignmentId,
      fullPayload(draft, placements),
    );
    if (!result.success) {
      toast.error(getApiErrorMessage(result, "Couldn't save changes"));
      return false;
    }
    return true;
  };

  const handlePrimary = async () => {
    if (saving) return;
    setSaving(true);

    if (step === 5) {
      if (!assignmentId) {
        toast.error("Finish the earlier steps before publishing.");
        setSaving(false);
        return;
      }
      // Steps are only saved on "Proceed", so jumping around with the step
      // rail or "Previous" could otherwise leave edits unsaved.
      if (!(await saveEverything())) {
        setSaving(false);
        return;
      }
      if (isPublished) {
        setSaving(false);
        toast.success("Assignment updated", {
          description: "Students will see your changes right away.",
        });
        router.push(assignmentPaths.details(assignmentId));
        return;
      }
      const result = await publishAssignment(assignmentId);
      setSaving(false);
      if (result.success) {
        toast.success("Assignment Published", {
          description: "Your assignment has been published successfully.",
        });
        router.push(assignmentPaths.list);
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't publish assignment"));
      }
      return;
    }

    const ok = await saveCurrentStep();
    setSaving(false);
    if (ok) setStep((step + 1) as WizardStep);
  };

  const handleSaveDraft = async () => {
    if (saving) return;
    setSaving(true);
    // A live assignment saves every step, so the edit is complete on its own.
    const ok = isPublished ? await saveEverything() : await saveCurrentStep();
    setSaving(false);
    if (ok) toast.success(isPublished ? "Changes saved" : "Draft saved");
  };

  const isLast = step === 5;
  const primaryDisabled = isLast ? !canPublish : !canProceed(step);

  const title = isPublished
    ? "Edit assignment"
    : mode === "edit"
      ? "Continue draft"
      : "New Assignment";

  if (hydrating) {
    return (
      <WizardShell title={title} showPrevious={false} showSaveDraft={false} primaryDisabled>
        <Stack gap={4}>
          <Skeleton h="28px" w="240px" rounded="md" />
          <Skeleton h="44px" rounded="md" />
          <Skeleton h="120px" rounded="md" />
          <Skeleton h="200px" rounded="md" />
        </Stack>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      title={title}
      primaryLabel={isLast ? (isPublished ? "Save changes" : "Publish") : "Proceed"}
      saveDraftLabel={isPublished ? "Save changes" : "Save draft"}
      banner={
        isPublished ? (
          <LiveEditBanner
            onViewDetails={() =>
              assignmentId && router.push(assignmentPaths.details(assignmentId))
            }
          />
        ) : null
      }
      onClose={
        isPublished && assignmentId
          ? () => router.push(assignmentPaths.details(assignmentId))
          : undefined
      }
      primaryDisabled={primaryDisabled}
      primaryLoading={saving}
      onPrimary={handlePrimary}
      onPrevious={step > 1 ? () => setStep((step - 1) as WizardStep) : undefined}
      onSaveDraft={handleSaveDraft}
      showPrevious={step > 1}
      // Step 1 has nothing to save until the draft exists (Proceed creates it).
      showSaveDraft={step < 5 && (step > 1 || Boolean(assignmentId))}
    >
      {step === 1 ? <StepBasicInfo /> : null}
      {step === 2 ? <StepSubmission /> : null}
      {step === 3 ? <StepGrading /> : null}
      {step === 4 ? <StepResources /> : null}
      {step === 5 ? <StepReview /> : null}
    </WizardShell>
  );
}

/** Shown above every step while editing an assignment students can already see. */
function LiveEditBanner({ onViewDetails }: { onViewDetails: () => void }) {
  return (
    <HStack
      gap={3}
      align="flex-start"
      bg="#FFF1ED"
      borderWidth="1px"
      borderColor="#FBD5CC"
      rounded="xl"
      px={4}
      py={3}
      mb={6}
    >
      <Box
        w="28px"
        h="28px"
        rounded="full"
        bg="#F97461"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Radio size={15} />
      </Box>
      <Stack gap={0.5} flex="1">
        <Text fontSize="sm" fontWeight="semibold" color="gray.900">
          This assignment is live
        </Text>
        <Text fontSize="sm" color="gray.600">
          Students can already see it. Changes apply as soon as you save —
          existing submissions and grades are kept.
        </Text>
      </Stack>
      <Box
        as="button"
        onClick={onViewDetails}
        fontSize="sm"
        fontWeight="medium"
        color="#2E2F6F"
        whiteSpace="nowrap"
        cursor="pointer"
        _hover={{ textDecoration: "underline" }}
      >
        View details
      </Box>
    </HStack>
  );
}

/**
 * The 5-step assignment builder. Pass `initialAssignment` to resume a saved
 * draft or edit a published assignment (edits PATCH it; a published one stays
 * published); omit it to create a new one.
 */
export function AssignmentWizard({
  initialAssignment,
}: {
  initialAssignment?: Assignment;
}) {
  return (
    <WizardProvider initialAssignment={initialAssignment}>
      <AssignmentWizardFlow />
    </WizardProvider>
  );
}
