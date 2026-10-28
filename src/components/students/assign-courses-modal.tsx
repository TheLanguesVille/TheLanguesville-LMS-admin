"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Input,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { BookOpen, Check, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InviteOverlay } from "@/components/invitations/invite-shell";
import { AppButton } from "@/components/ui/app-button";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type AssignableCourse,
  type EnrollmentType,
  assignCourses,
  listAssignableCourses,
} from "@/lib/api/students";

const ENROLLMENT_TYPES: Array<{
  value: EnrollmentType;
  label: string;
  description: string;
}> = [
  {
    value: "sponsored-access",
    label: "Sponsored Access",
    description: "Provided at no cost to the student",
  },
  {
    value: "learner-paid",
    label: "Learner-Paid",
    description: "Student paid for access outside the platform",
  },
];

interface AssignCoursesModalProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
  /** Fired after at least one course was assigned so the page can refetch. */
  onAssigned: () => void;
}

/**
 * Admin-only: grant an existing student access to one or more published
 * courses. Courses they can already open are listed but locked.
 */
export function AssignCoursesModal({
  studentId,
  studentName,
  onClose,
  onAssigned,
}: AssignCoursesModalProps) {
  const [courses, setCourses] = useState<AssignableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [enrollmentType, setEnrollmentType] =
    useState<EnrollmentType>("sponsored-access");
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listAssignableCourses(studentId).then((result) => {
      if (!active) return;
      if (result.success) {
        setCourses(result.data);
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't load courses"));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [studentId]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selectedCourses = courses.filter((c) => selected.includes(c.id));

  const submit = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    const result = await assignCourses(studentId, {
      courseIds: selected,
      enrollmentType,
      notifyStudent,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(getApiErrorMessage(result, "Couldn't assign courses"));
      return;
    }
    const { assigned, skipped } = result.data;
    if (assigned.length > 0) {
      toast.success(
        assigned.length === 1
          ? `${studentName} now has access to ${assigned[0].title}`
          : `Assigned ${assigned.length} courses to ${studentName}`,
      );
      onAssigned();
    }
    for (const s of skipped) {
      toast.warning(`${s.title ?? "A course"} skipped: ${s.reason}`);
    }
    if (assigned.length > 0) onClose();
  };

  return (
    <InviteOverlay onClose={saving ? undefined : onClose} maxW="520px">
      <Flex justify="space-between" align="flex-start" mb={5}>
        <Stack gap={1}>
          <Heading as="h3" size="md" color="gray.900">
            Assign courses
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Give {studentName} access to published courses.
          </Text>
        </Stack>
        <Flex as="button" onClick={saving ? undefined : onClose} w="32px" h="32px" rounded="full" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color="gray.500" cursor="pointer" flexShrink={0} _hover={{ bg: "gray.50" }}>
          <X size={16} />
        </Flex>
      </Flex>

      {/* Enrollment type */}
      <Stack gap={2} mb={5}>
        <Text fontSize="sm" fontWeight="medium" color="gray.800">
          Enrollment Type
        </Text>
        <HStack gap={3} align="stretch">
          {ENROLLMENT_TYPES.map((option) => {
            const active = enrollmentType === option.value;
            return (
              <Box
                key={option.value}
                as="button"
                flex="1"
                textAlign="left"
                px={4}
                py={3}
                rounded="lg"
                borderWidth="1px"
                borderColor={active ? "#2E2F6F" : "gray.200"}
                bg={active ? "#F5F5FB" : "white"}
                cursor="pointer"
                onClick={() => setEnrollmentType(option.value)}
              >
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {option.label}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {option.description}
                </Text>
              </Box>
            );
          })}
        </HStack>
      </Stack>

      {/* Course multi-select */}
      <Stack gap={2} mb={5}>
        <Text fontSize="sm" fontWeight="medium" color="gray.800">
          Courses
        </Text>
        <Box borderWidth="1px" borderColor="gray.200" rounded="lg" overflow="hidden">
          <Flex align="center" gap={2} px={4} h="44px" borderBottomWidth="1px" borderColor="gray.100">
            <Search size={16} color="#9CA3AF" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              border="none"
              px={0}
              h="full"
              fontSize="sm"
              _placeholder={{ color: "gray.400" }}
              _focus={{ outline: "none", boxShadow: "none" }}
            />
          </Flex>
          {selectedCourses.length > 0 ? (
            <Flex wrap="wrap" gap={2} px={4} py={2.5} borderBottomWidth="1px" borderColor="gray.100">
              {selectedCourses.map((c) => (
                <HStack key={c.id} gap={1.5} px={2.5} py={1} rounded="full" bg="#FEF3F1" color="#E4573D" fontSize="xs" fontWeight="medium">
                  <Text>{c.title}</Text>
                  <Box as="button" cursor="pointer" onClick={() => toggle(c.id)} display="flex" alignItems="center">
                    <X size={12} />
                  </Box>
                </HStack>
              ))}
            </Flex>
          ) : null}
          <Box maxH="240px" overflowY="auto">
            {loading ? (
              <Stack gap={3} px={4} py={3}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} h="16px" rounded="md" />
                ))}
              </Stack>
            ) : filtered.length === 0 ? (
              <Text fontSize="sm" color="gray.400" px={4} py={4}>
                {courses.length === 0 ? "No published courses yet" : "No courses match your search"}
              </Text>
            ) : (
              filtered.map((c) => {
                const isSelected = selected.includes(c.id);
                return (
                  <Flex
                    key={c.id}
                    as="button"
                    w="full"
                    px={4}
                    py={3}
                    align="center"
                    justify="space-between"
                    gap={3}
                    textAlign="left"
                    bg={isSelected ? "gray.50" : "white"}
                    cursor={c.alreadyEnrolled ? "not-allowed" : "pointer"}
                    opacity={c.alreadyEnrolled ? 0.55 : 1}
                    _hover={c.alreadyEnrolled ? undefined : { bg: "gray.50" }}
                    onClick={c.alreadyEnrolled ? undefined : () => toggle(c.id)}
                  >
                    <HStack gap={2.5} minW={0}>
                      <BookOpen size={16} color="#374151" style={{ flexShrink: 0 }} />
                      <Stack gap={0} minW={0}>
                        <Text fontSize="sm" color="gray.900" lineClamp={1}>
                          {c.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {c.level}
                          {c.instructorName ? ` • ${c.instructorName}` : ""}
                        </Text>
                      </Stack>
                    </HStack>
                    {c.alreadyEnrolled ? (
                      <Text fontSize="xs" color="gray.500" flexShrink={0}>
                        Enrolled
                      </Text>
                    ) : isSelected ? (
                      <Check size={16} color="#E4573D" strokeWidth={3} />
                    ) : null}
                  </Flex>
                );
              })
            )}
          </Box>
        </Box>
      </Stack>

      <HStack as="label" gap={2.5} mb={6} cursor="pointer" fontSize="sm" color="gray.700">
        <input
          type="checkbox"
          checked={notifyStudent}
          onChange={(e) => setNotifyStudent(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "#2E2F6F" }}
        />
        <Text>Email the student about their new courses</Text>
      </HStack>

      <Stack gap={3}>
        <AppButton onClick={submit} isLoading={saving} disabled={saving || selected.length === 0}>
          {selected.length > 1 ? `Assign ${selected.length} courses` : "Assign course"}
        </AppButton>
        <Button variant="outline" rounded="full" h="48px" fontWeight="medium" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </Stack>
    </InviteOverlay>
  );
}
