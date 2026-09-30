"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useOptionalWizard, type WizardStep } from "./wizard-context";

const STEPS: { number: WizardStep; label: string }[] = [
  { number: 1, label: "Basic Info" },
  { number: 2, label: "Submission" },
  { number: 3, label: "Grading Setup" },
  { number: 4, label: "Resources" },
  { number: 5, label: "Review" },
];

export function WizardStepRail() {
  // The edit page shows the shell (and this rail) while the assignment is
  // still loading, before any WizardProvider exists — render inert steps then.
  const wizard = useOptionalWizard();
  const current = wizard?.step ?? 1;
  const furthestComplete = wizard?.furthestComplete ?? 0;
  const setStep = (s: WizardStep) => wizard?.setStep(s);

  return (
    <Stack gap={2}>
      {STEPS.map((s) => {
        const isActive = s.number === current;
        const isComplete = s.number < current && s.number <= furthestComplete + 1;
        const navigable = Boolean(wizard) && s.number <= furthestComplete + 1;

        return (
          <HStack
            key={s.number}
            gap={3}
            px={3}
            py={2.5}
            rounded="md"
            bg={isActive ? "#FFF1ED" : "transparent"}
            cursor={navigable ? "pointer" : "not-allowed"}
            opacity={navigable ? 1 : 0.6}
            onClick={() => {
              if (navigable) setStep(s.number);
            }}
            _hover={navigable && !isActive ? { bg: "gray.50" } : undefined}
            transition="background 0.15s"
          >
            <Box
              w="24px"
              h="24px"
              rounded="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg={isComplete ? "#16A34A" : isActive ? "#F97461" : "#9CA3AF"}
              color="white"
              fontSize="xs"
              fontWeight="semibold"
              flexShrink={0}
            >
              {isComplete ? <Check size={14} /> : s.number}
            </Box>
            <Text
              fontSize="sm"
              fontWeight={isActive ? "semibold" : "medium"}
              color={isActive ? "#F97461" : "gray.800"}
            >
              {s.label}
            </Text>
          </HStack>
        );
      })}
    </Stack>
  );
}
