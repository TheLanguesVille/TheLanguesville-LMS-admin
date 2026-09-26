"use client";

import { Button, Flex, Text } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AssignmentWizard } from "@/components/assignment/wizard/assignment-wizard";
import { WizardShell } from "@/components/assignment/wizard/wizard-shell";
import { type Assignment, getAssignment } from "@/lib/api/assignments";
import { assignmentPaths } from "@/lib/routes";

function EditAssignmentPageInner() {
  const router = useRouter();
  const assignmentId = useSearchParams().get("assignmentId");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const notFound = !assignmentId || loadFailed;

  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    getAssignment(assignmentId).then((result) => {
      if (!active) return;
      if (!result.success) {
        setLoadFailed(true);
      } else if (result.data.status !== "draft") {
        // Only drafts are resumable; published work lives on its details page.
        router.replace(assignmentPaths.details(assignmentId));
      } else {
        setAssignment(result.data);
      }
    });
    return () => {
      active = false;
    };
  }, [assignmentId, router]);

  if (notFound) {
    return (
      <Flex direction="column" align="center" justify="center" py="160px" gap={3}>
        <Text fontWeight="semibold" color="gray.900">
          Draft not found
        </Text>
        <Button
          variant="outline"
          rounded="full"
          onClick={() => router.push(assignmentPaths.list)}
        >
          Back to assignments
        </Button>
      </Flex>
    );
  }

  // The wizard shows its own skeleton while it expands the draft's placements.
  if (!assignment) {
    return (
      <WizardShell
        title="Continue draft"
        showPrevious={false}
        showSaveDraft={false}
        primaryDisabled
      >
        {null}
      </WizardShell>
    );
  }

  return <AssignmentWizard initialAssignment={assignment} />;
}

export default function EditAssignmentPage() {
  return (
    <Suspense>
      <EditAssignmentPageInner />
    </Suspense>
  );
}
