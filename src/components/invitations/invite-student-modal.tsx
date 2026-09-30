"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { BookOpen, Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/onboarding/form-field";
import { AppButton } from "@/components/ui/app-button";
import { getApiErrorMessage } from "@/lib/api/client";
import { listAllCourses } from "@/lib/api/courses";
import { createInvitation } from "@/lib/api/invitations";
import { type EnrollmentType, inviteStudent } from "@/lib/api/students";
import {
  BackLink,
  InviteOverlay,
  StepHeading,
  WizardHeader,
  WizardProgress,
} from "./invite-shell";
import { InviteSuccessModal } from "./invite-success-modal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ENROLLMENT_TYPES: Array<{
  value: EnrollmentType;
  label: string;
  description: string;
}> = [
  {
    value: "learner-paid",
    label: "Learner-Paid",
    description: "Student purchases access to the course themselves",
  },
  {
    value: "sponsored-access",
    label: "Sponsored Access",
    description: "Course access is provided at no cost to the student",
  },
];

interface CourseOption {
  id: string;
  title: string;
}

interface InviteStudentModalProps {
  onClose: () => void;
  /** Fired after every successful send so the parent can refresh its lists. */
  onSent?: () => void;
  /** Success-modal primary action ("View student list"). */
  viewListLabel: string;
  onViewList: () => void;
  /** Students screen keeps POST /students/invite; Invitations uses POST /invitations. */
  via?: "students" | "invitations";
}

export function InviteStudentModal({
  onClose,
  onSent,
  viewListLabel,
  onViewList,
  via = "students",
}: InviteStudentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<CourseOption[]>([]);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ name: string; email: string; expiresAt: string } | null>(null);

  // Course picker options come from the existing courses list.
  useEffect(() => {
    let active = true;
    listAllCourses().then((result) => {
      if (!active) return;
      if (result.success) {
        setCourses(result.data.map((c) => ({ id: c._id, title: c.title })));
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't load courses"));
      }
      setCoursesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const validateInfo = () => {
    const next: Record<string, string | undefined> = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (!EMAIL_RE.test(email.trim())) next.email = "Please enter a valid email address";
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const toggleCourse = (course: CourseOption) =>
    setSelectedCourses((prev) =>
      prev.some((c) => c.id === course.id)
        ? prev.filter((c) => c.id !== course.id)
        : [...prev, course],
    );

  const canSend = !sending && enrollmentType !== null && selectedCourses.length > 0;

  const send = async () => {
    if (!canSend || !enrollmentType) return;
    setSending(true);
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      enrollmentType,
      courseIds: selectedCourses.map((c) => c.id),
    };
    const result =
      via === "students"
        ? await inviteStudent(payload)
        : await createInvitation({ role: "student", ...payload });
    setSending(false);

    if (result.success) {
      setSent({
        name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        expiresAt: result.data.expiresAt,
      });
      onSent?.();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't send the invitation"));
    }
  };

  const reset = () => {
    setStep(1);
    setFirstName("");
    setLastName("");
    setEmail("");
    setErrors({});
    setEnrollmentType(null);
    setTypeOpen(false);
    setCourseSearch("");
    setSelectedCourses([]);
    setSent(null);
  };

  if (sent) {
    return (
      <InviteSuccessModal
        name={sent.name}
        email={sent.email}
        roleLabel="Student"
        description="The student will receive an email to join the platform."
        expiresAt={sent.expiresAt}
        primaryLabel={viewListLabel}
        onPrimary={onViewList}
        secondaryLabel="Invite another student"
        onSecondary={reset}
        onClose={onClose}
      />
    );
  }

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.trim().toLowerCase()),
  );
  const typeLabel = ENROLLMENT_TYPES.find((t) => t.value === enrollmentType)?.label;

  return (
    <InviteOverlay onClose={onClose}>
      <WizardHeader title="Invite Student" />
      <WizardProgress step={step} total={2} />

      {step === 1 ? (
        <>
          <StepHeading title="Students Info" subtitle="Enter the student's details to send an invitation." />
          <Stack gap={4} mb={6}>
            <FormField
              label="First Name"
              placeholder="John"
              value={firstName}
              error={errors.firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }));
              }}
            />
            <FormField
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              error={errors.lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined }));
              }}
            />
            <FormField
              label="Email Address"
              type="email"
              placeholder="johndoe@email.fr"
              value={email}
              error={errors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
            />
          </Stack>
          <Stack gap={3}>
            <AppButton onClick={() => validateInfo() && setStep(2)}>Continue</AppButton>
            <Button variant="outline" rounded="full" h="48px" fontWeight="medium" onClick={onClose}>
              Cancel
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <StepHeading title="Enrollment Info" subtitle="Select the course and learning level to enroll the student." />

          {/* Enrollment type dropdown */}
          <Stack gap={2} mb={5}>
            <Text fontSize="sm" fontWeight="medium" color="gray.800">
              Enrollment Type
            </Text>
            <Box position="relative">
              <Flex
                as="button"
                onClick={() => setTypeOpen((o) => !o)}
                w="full"
                h="48px"
                px={4}
                align="center"
                justify="space-between"
                borderWidth="1px"
                borderColor="gray.200"
                rounded="lg"
                bg="white"
                cursor="pointer"
              >
                <Text fontSize="sm" color={typeLabel ? "gray.900" : "gray.400"}>
                  {typeLabel ?? "Select enrollment type"}
                </Text>
                {typeOpen ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
              </Flex>
              {typeOpen ? (
                <Box position="absolute" top="54px" left={0} right={0} bg="white" borderWidth="1px" borderColor="gray.200" rounded="lg" boxShadow="lg" zIndex={20} overflow="hidden">
                  {ENROLLMENT_TYPES.map((option) => (
                    <Box
                      key={option.value}
                      as="button"
                      w="full"
                      textAlign="left"
                      px={4}
                      py={3}
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                      onClick={() => {
                        setEnrollmentType(option.value);
                        setTypeOpen(false);
                      }}
                    >
                      <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                        {option.label}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {option.description}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>
          </Stack>

          {/* Course multi-select */}
          <Stack gap={2} mb={6}>
            <Text fontSize="sm" fontWeight="medium" color="gray.800">
              Course Enrollement
            </Text>
            <Box borderWidth="1px" borderColor="gray.200" rounded="lg" overflow="hidden">
              <Flex align="center" gap={2} px={4} h="44px" borderBottomWidth="1px" borderColor="gray.100">
                <Search size={16} color="#9CA3AF" />
                <Input
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
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
                      <Box as="button" cursor="pointer" onClick={() => toggleCourse(c)} display="flex" alignItems="center">
                        <X size={12} />
                      </Box>
                    </HStack>
                  ))}
                </Flex>
              ) : null}
              <Box maxH="200px" overflowY="auto">
                {coursesLoading ? (
                  <Stack gap={3} px={4} py={3}>
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} h="16px" rounded="md" />
                    ))}
                  </Stack>
                ) : filteredCourses.length === 0 ? (
                  <Text fontSize="sm" color="gray.400" px={4} py={4}>
                    {courses.length === 0 ? "No courses available yet" : "No courses match your search"}
                  </Text>
                ) : (
                  filteredCourses.map((c) => {
                    const selected = selectedCourses.some((s) => s.id === c.id);
                    return (
                      <Flex
                        key={c.id}
                        as="button"
                        w="full"
                        px={4}
                        py={3}
                        align="center"
                        justify="space-between"
                        cursor="pointer"
                        bg={selected ? "gray.50" : "white"}
                        _hover={{ bg: "gray.50" }}
                        onClick={() => toggleCourse(c)}
                        textAlign="left"
                      >
                        <HStack gap={2.5}>
                          <BookOpen size={16} color="#374151" />
                          <Text fontSize="sm" color="gray.900">
                            {c.title}
                          </Text>
                        </HStack>
                        {selected ? <Check size={16} color="#E4573D" strokeWidth={3} /> : null}
                      </Flex>
                    );
                  })
                )}
              </Box>
            </Box>
          </Stack>

          <BackLink label="Back to student’s info" onClick={() => setStep(1)} />
          <Stack gap={3}>
            <AppButton onClick={send} isLoading={sending} disabled={!canSend}>
              Send invitation
            </AppButton>
            <Button variant="outline" rounded="full" h="48px" fontWeight="medium" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
          </Stack>
        </>
      )}
    </InviteOverlay>
  );
}
