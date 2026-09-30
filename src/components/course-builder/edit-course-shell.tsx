"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
} from "@chakra-ui/react";
import { CheckCircle2, ChevronRight, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { coursePaths } from "@/lib/routes";
import { StepRail } from "./step-rail";

interface EditCourseShellProps {
  children: ReactNode;
  courseTitle: string;
  courseId: string;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary?: () => void;
  onPrevious?: () => void;
  hidePrevious?: boolean;
  /** Shows a "Duplicate" button in the header when set. */
  onDuplicate?: () => void;
}

export function EditCourseShell({
  children,
  courseTitle,
  courseId,
  primaryLabel = "Save changes",
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  onPrevious,
  hidePrevious = false,
  onDuplicate,
}: EditCourseShellProps) {
  const router = useRouter();

  return (
    <Box
      position="fixed"
      inset={0}
      bg="white"
      zIndex={50}
      display="flex"
      flexDirection="column"
    >
      {/* Top header */}
      <Flex
        h="64px"
        align="center"
        justify="space-between"
        px={6}
        borderBottomWidth="1px"
        borderColor="gray.200"
        flexShrink={0}
      >
        {/* Breadcrumb */}
        <HStack gap={2} fontSize="sm">
          <Text
            color="#2E2F6F"
            fontWeight="medium"
            cursor="pointer"
            onClick={() => router.push(coursePaths.details(courseId))}
            _hover={{ textDecoration: "underline" }}
          >
            {courseTitle}
          </Text>
          <ChevronRight size={14} color="#9CA3AF" />
          <Text color="gray.700" fontWeight="medium">
            Curriculum
          </Text>
        </HStack>

        {/* Header title centred */}
        <Heading
          as="h1"
          size="md"
          color="gray.900"
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          pointerEvents="none"
        >
          Edit Course
        </Heading>

        {/* Duplicate + Cancel + Save */}
        <HStack gap={2}>
          {onDuplicate ? (
            <Button
              variant="outline"
              rounded="full"
              h="36px"
              px={5}
              fontWeight="medium"
              fontSize="sm"
              onClick={onDuplicate}
            >
              <Copy size={15} />
              Duplicate
            </Button>
          ) : null}
          <Button
            variant="outline"
            rounded="full"
            h="36px"
            px={5}
            fontWeight="medium"
            fontSize="sm"
            onClick={() => router.push(coursePaths.details(courseId))}
          >
            Cancel
          </Button>
          <Button
            bg="#2E2F6F"
            color="white"
            rounded="full"
            h="36px"
            px={5}
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

      {/* Body: rail + content */}
      <Flex flex="1" overflow="hidden">
        <Box
          w="280px"
          borderRightWidth="1px"
          borderColor="gray.200"
          px={6}
          py={6}
          flexShrink={0}
          overflowY="auto"
        >
          <StepRail />
        </Box>

        <Box flex="1" overflowY="auto" px={8} py={6}>
          <Box maxW="720px" mx="auto">
            {children}
          </Box>
        </Box>
      </Flex>

      {/* Footer */}
      <Flex
        h="64px"
        align="center"
        justify="space-between"
        px={6}
        borderTopWidth="1px"
        borderColor="gray.200"
        flexShrink={0}
        bg="white"
      >
        <HStack gap={2} color="#16A34A">
          <CheckCircle2 size={16} />
          <Text fontSize="sm">Auto-saved</Text>
        </HStack>

        <HStack gap={3}>
          {!hidePrevious && (
            <Button
              variant="outline"
              rounded="full"
              h="40px"
              px={6}
              fontWeight="medium"
              fontSize="sm"
              onClick={onPrevious}
              disabled={!onPrevious}
            >
              Previous
            </Button>
          )}
          <Button
            bg="#2E2F6F"
            color="white"
            rounded="full"
            h="40px"
            px={6}
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
