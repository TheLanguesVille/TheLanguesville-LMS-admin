"use client";

import { Box, Button, Flex, HStack, Heading, IconButton, Text } from "@chakra-ui/react";
import { CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { assignmentPaths } from "@/lib/routes";
import { WizardStepRail } from "./wizard-step-rail";

interface WizardShellProps {
  children: ReactNode;
  title?: string;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary?: () => void;
  onPrevious?: () => void;
  onSaveDraft?: () => void;
  showPrevious?: boolean;
  showSaveDraft?: boolean;
  saveDraftLabel?: string;
  /** Rendered above the step content (e.g. the "this is live" notice). */
  banner?: ReactNode;
  /** Where the close (X) button goes; defaults to the assignment list. */
  onClose?: () => void;
}

export function WizardShell({
  children,
  title = "New Assignment",
  primaryLabel = "Proceed",
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  onPrevious,
  onSaveDraft,
  showPrevious = true,
  showSaveDraft = true,
  saveDraftLabel = "Save draft",
  banner,
  onClose,
}: WizardShellProps) {
  const router = useRouter();

  return (
    <Box position="fixed" inset={0} bg="white" zIndex={50} display="flex" flexDirection="column">
      {/* Header */}
      <Flex h="80px" align="center" justify="space-between" px={8} flexShrink={0}>
        <HStack gap={4}>
          <HStack gap={2}>
            <Box
              w="32px"
              h="32px"
              rounded="md"
              bg="#E8E9F5"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="#2E2F6F"
              fontWeight="bold"
            >
              L
            </Box>
            <Text fontSize="xs" color="gray.500" lineHeight="1.1">
              The
              <br />
              Languesville
            </Text>
          </HStack>
          <Box w="1px" h="24px" bg="gray.200" />
          <Heading as="h1" size="md" color="gray.900">
            {title}
          </Heading>
        </HStack>

        <IconButton
          aria-label="Close assignment builder"
          variant="outline"
          rounded="full"
          size="sm"
          onClick={onClose ?? (() => router.push(assignmentPaths.list))}
        >
          <X size={16} />
        </IconButton>
      </Flex>
      <Box h="1px" bg="gray.100" />

      {/* Body */}
      <Flex flex="1" overflow="hidden">
        <Box w="280px" px={8} py={8} flexShrink={0} overflowY="auto">
          <WizardStepRail />
        </Box>
        <Box flex="1" overflowY="auto" px={8} py={8}>
          <Box maxW="720px">
            {banner}
            {children}
          </Box>
        </Box>
      </Flex>

      {/* Footer */}
      <Box h="1px" bg="gray.100" />
      <Flex h="80px" align="center" justify="space-between" px={8} flexShrink={0} bg="white">
        <HStack gap={2} color="#16A34A">
          <CheckCircle2 size={16} />
          <Text fontSize="sm">Auto-saved</Text>
        </HStack>

        <HStack gap={5}>
          {showSaveDraft ? (
            <Box
              as="button"
              onClick={onSaveDraft}
              fontSize="sm"
              fontWeight="medium"
              color="gray.700"
              cursor="pointer"
              _hover={{ color: "gray.900" }}
            >
              {saveDraftLabel}
            </Box>
          ) : null}
          {showPrevious ? (
            <Button
              variant="outline"
              rounded="full"
              h="44px"
              px={7}
              fontWeight="medium"
              fontSize="sm"
              onClick={onPrevious}
              disabled={!onPrevious}
            >
              Previous
            </Button>
          ) : null}
          <Button
            bg="#2E2F6F"
            color="white"
            rounded="full"
            h="44px"
            px={8}
            fontWeight="medium"
            fontSize="sm"
            _hover={{ bg: "#262760" }}
            _disabled={{
              bg: "#E5E7EB",
              color: "#9CA3AF",
              cursor: "not-allowed",
              _hover: { bg: "#E5E7EB" },
            }}
            disabled={primaryDisabled || primaryLoading}
            loading={primaryLoading}
            onClick={onPrimary}
          >
            {primaryLabel}
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
