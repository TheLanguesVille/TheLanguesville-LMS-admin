"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Heading,
  Input,
  Portal,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Check, ChevronDown, Plus, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/shared/avatar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { InviteStudentModal } from "@/components/invitations/invite-student-modal";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type StudentCourseFilter,
  type StudentListItem,
  listStudentCourses,
  listStudents,
  sendBulkMessage,
} from "@/lib/api/students";
import { useAdmin } from "@/lib/hooks/use-admin";
import { studentPaths } from "@/lib/routes";

const COLS = "1.4fr 1.4fr 1.4fr 0.6fr 1fr 0.9fr";
const PAGE_SIZE = 5;

function ProgressCell({ value }: { value: number }) {
  return (
    <Stack gap={1.5} w="80%">
      <Text fontSize="sm" color="gray.700">
        {value}%
      </Text>
      <Box bg="gray.100" rounded="full" h="6px">
        <Box bg="#2E2F6F" rounded="full" h="6px" w={`${value}%`} />
      </Box>
    </Stack>
  );
}

function RowSkeleton() {
  return (
    <Grid templateColumns={COLS} gap={4} px={5} py={4} alignItems="center" borderTopWidth="1px" borderColor="gray.100">
      <HStack gap={3}>
        <Skeleton w="32px" h="32px" rounded="full" />
        <Skeleton h="14px" w="60%" rounded="md" />
      </HStack>
      <Skeleton h="14px" w="80%" rounded="md" />
      <Skeleton h="14px" w="70%" rounded="md" />
      <Skeleton h="14px" w="40%" rounded="md" />
      <Skeleton h="14px" w="70%" rounded="md" />
      <Skeleton h="28px" w="80px" rounded="md" />
    </Grid>
  );
}

function BulkMessageModal({ onClose }: { onClose: () => void }) {
  const [recipients, setRecipients] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Populate the recipient list from the students list (large limit lists
  // everyone). Default every loaded student to checked.
  useEffect(() => {
    let active = true;
    listStudents({ limit: 100 }).then((result) => {
      if (!active) return;
      if (result.success) {
        setRecipients(result.data.students);
        setSelected(new Set(result.data.students.map((s) => s.id)));
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't load recipients"));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = selected.size;
  const canSend =
    !sending && count > 0 && subject.trim() !== "" && message.trim() !== "";

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const result = await sendBulkMessage({
      studentIds: [...selected],
      subject: subject.trim(),
      body: message.trim(),
    });
    if (result.success) {
      onClose();
      toast.success("Bulk Message Delivered", {
        description:
          result.message ??
          "Your bulk message has been delivered successfully.",
      });
    } else {
      setSending(false);
      toast.error(getApiErrorMessage(result, "Couldn't send the message"));
    }
  };

  return (
    <Portal>
      <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" px={4} onClick={onClose}>
        <Box bg="white" rounded="2xl" w="full" maxW="820px" boxShadow="2xl" onClick={(e) => e.stopPropagation()} overflow="hidden">
          {/* Header */}
          <Flex justify="space-between" align="flex-start" px={7} pt={6} pb={5}>
            <Stack gap={0}>
              <Heading as="h3" size="md" color="gray.900">
                Bulk Message
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Compose announcement
              </Text>
            </Stack>
            <Flex as="button" onClick={onClose} w="32px" h="32px" rounded="full" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color="gray.500" cursor="pointer" _hover={{ bg: "gray.50" }}>
              <X size={16} />
            </Flex>
          </Flex>

          {/* Body */}
          <Grid templateColumns="1fr 1.3fr">
            {/* Recipients */}
            <Box borderRightWidth="1px" borderColor="gray.100" px={7} py={2} maxH="360px" overflowY="auto">
              <Flex justify="space-between" align="center" mb={3} position="sticky" top={0} bg="white" py={2}>
                <Text fontWeight="semibold" color="gray.900">
                  Recipients
                </Text>
                <Box as="button" onClick={() => setSelected(new Set())} fontSize="sm" color="#4338CA" fontWeight="medium" cursor="pointer">
                  Deselect All
                </Box>
              </Flex>
              <Stack gap={4} pb={2}>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <HStack key={i} gap={3}>
                      <Skeleton w="36px" h="36px" rounded="full" />
                      <Stack gap={1.5} flex="1">
                        <Skeleton h="12px" w="60%" rounded="md" />
                        <Skeleton h="10px" w="80%" rounded="md" />
                      </Stack>
                    </HStack>
                  ))
                ) : recipients.length === 0 ? (
                  <Text fontSize="sm" color="gray.400">
                    No students to message yet.
                  </Text>
                ) : (
                  recipients.map((s) => {
                    const on = selected.has(s.id);
                    return (
                      <Flex key={s.id} as="button" onClick={() => toggle(s.id)} align="center" justify="space-between" cursor="pointer" textAlign="left">
                        <HStack gap={3}>
                          <Avatar name={s.name} src={s.avatarUrl} initials={s.initials} size={36} />
                          <Stack gap={0}>
                            <Text fontSize="sm" fontWeight="medium" color="gray.900">
                              {s.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {s.email}
                            </Text>
                          </Stack>
                        </HStack>
                        {on ? (
                          <Flex w="22px" h="22px" rounded="full" bg="#16A34A" align="center" justify="center" flexShrink={0}>
                            <Check size={13} color="white" strokeWidth={3} />
                          </Flex>
                        ) : (
                          <Box w="22px" h="22px" rounded="full" borderWidth="1.5px" borderColor="gray.300" flexShrink={0} />
                        )}
                      </Flex>
                    );
                  })
                )}
              </Stack>
            </Box>

            {/* Compose */}
            <Box px={7} py={4}>
              <Stack gap={0} mb={4}>
                <Text fontSize="sm" color="gray.700" mb={2}>
                  Subject
                </Text>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="A clear, short subject line"
                  h="48px"
                  fontSize="sm"
                  borderColor="gray.200"
                  rounded="lg"
                  _placeholder={{ color: "gray.400" }}
                  _focus={{ borderColor: "#2E2F6F", outline: "none", boxShadow: "none" }}
                />
              </Stack>
              <Stack gap={0}>
                <Text fontSize="sm" color="gray.700" mb={2}>
                  Message
                </Text>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  placeholder="Write your message"
                  minH="150px"
                  resize="none"
                  fontSize="sm"
                  borderColor="gray.200"
                  rounded="lg"
                  _placeholder={{ color: "gray.400" }}
                  _focus={{ borderColor: "#2E2F6F", outline: "none", boxShadow: "none" }}
                />
                <Text fontSize="xs" color="gray.400" textAlign="right" mt={1.5}>
                  {message.length}/2000
                </Text>
              </Stack>
            </Box>
          </Grid>

          {/* Footer */}
          <Flex justify="space-between" align="center" px={7} py={5} borderTopWidth="1px" borderColor="gray.100">
            <Text fontSize="sm" color="gray.500">
              Sending to{" "}
              <Text as="span" color="gray.900" fontWeight="semibold">
                {count}
              </Text>{" "}
              students
            </Text>
            <HStack gap={3}>
              <Button variant="outline" rounded="full" h="44px" px={7} fontSize="sm" fontWeight="medium" onClick={onClose}>
                Cancel
              </Button>
              <Button
                rounded="full"
                h="44px"
                px={8}
                fontSize="sm"
                fontWeight="medium"
                bg={canSend ? "#2E2F6F" : "#E5E7EB"}
                color={canSend ? "white" : "#9CA3AF"}
                _hover={canSend ? { bg: "#262760" } : { bg: "#E5E7EB" }}
                cursor={canSend ? "pointer" : "not-allowed"}
                disabled={!canSend}
                loading={sending}
                onClick={send}
              >
                Send
              </Button>
            </HStack>
          </Flex>
        </Box>
      </Box>
    </Portal>
  );
}

const ALL_COURSES = "All Courses";

export default function StudentsListPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();

  const [courses, setCourses] = useState<StudentCourseFilter[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  /** Distinguishes "no results for this filter" from "no students at all". */
  const [hasAny, setHasAny] = useState(true);

  const fetchCourses = useCallback(async () => {
    const result = await listStudentCourses();
    if (result.success) setCourses(result.data);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const result = await listStudents({
      courseId: courseId ?? undefined,
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setStudents(result.data.students);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages || 1);
      // A populated list (or any unfiltered result) means students exist.
      if (!courseId && !search) setHasAny(result.data.total > 0);
      else if (result.data.total > 0) setHasAny(true);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load students"));
      setStudents([]);
    }
    setLoading(false);
  }, [courseId, search, page]);

  useEffect(() => {
    const id = setTimeout(fetchCourses, 0);
    return () => clearTimeout(id);
  }, [fetchCourses]);

  useEffect(() => {
    const id = setTimeout(fetchList, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchList, search]);

  const userChip = admin
    ? {
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        role: roleLabel(admin.role),
      }
    : undefined;

  const inviteModal = inviteOpen ? (
    <InviteStudentModal
      via="students"
      onClose={() => setInviteOpen(false)}
      onSent={fetchList}
      viewListLabel="View student list"
      onViewList={() => setInviteOpen(false)}
    />
  ) : null;

  const courseLabel =
    courses.find((c) => c.id === courseId)?.title ?? ALL_COURSES;

  // Fully empty state: no students at all, with no active course/search filter.
  // Rendered via a ternary inside one return so the invite modal keeps its
  // tree position — and its state — when a refetch flips this flag.
  const showEmptyState = !loading && !hasAny && !courseId && !search;

  return (
    <Box>
      <DashboardHeader title="Students" loading={adminLoading} user={userChip} />

      {showEmptyState ? (
        <Flex direction="column" align="center" justify="center" py="200px" gap={3} color="gray.400">
          <Users size={40} />
          <Stack gap={1} textAlign="center">
            <Text fontWeight="semibold" color="gray.900">
              No enrolled students yet
            </Text>
            <Text fontSize="sm">Names and details of enrolled students will appear here</Text>
          </Stack>
          <Button bg="#2E2F6F" color="white" rounded="full" h="48px" px={6} mt={3} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setInviteOpen(true)}>
            <Plus size={18} />
            Invite student
          </Button>
        </Flex>
      ) : (
      <Box px={8} py={6}>
        <Flex justify="space-between" align="flex-start" mb={6}>
          <Stack gap={1}>
            <Heading as="h2" size="xl" color="gray.900">
              {total} enrolled {total === 1 ? "student" : "students"}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Track individual progress, engagement, and submissions for each student.
            </Text>
          </Stack>
          <HStack gap={3}>
            <Button variant="outline" rounded="full" h="48px" px={6} fontWeight="medium" onClick={() => setBulkOpen(true)}>
              Send bulk message
            </Button>
            <Button bg="#2E2F6F" color="white" rounded="full" h="48px" px={6} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setInviteOpen(true)}>
              <Plus size={18} />
              Invite student
            </Button>
          </HStack>
        </Flex>

        {/* Filter + search */}
        <Flex justify="space-between" align="center" mb={6} gap={3} wrap="wrap">
          <Box position="relative">
            <Flex as="button" onClick={() => setFilterOpen((o) => !o)} align="center" justify="space-between" gap={3} w="280px" h="48px" px={4} borderWidth="1px" borderColor="gray.200" rounded="lg" bg="white" cursor="pointer">
              <Text fontSize="sm" color="gray.900">
                {courseLabel}
              </Text>
              <ChevronDown size={18} color="#9CA3AF" />
            </Flex>
            {filterOpen ? (
              <Box position="absolute" top="52px" left={0} w="280px" bg="white" borderWidth="1px" borderColor="gray.200" rounded="lg" boxShadow="lg" zIndex={20} overflow="hidden" maxH="300px" overflowY="auto">
                {[{ id: null as string | null, title: ALL_COURSES }, ...courses].map((c) => {
                  const selected = (c.id ?? null) === courseId;
                  return (
                    <Flex
                      key={c.id ?? ALL_COURSES}
                      as="button"
                      onClick={() => {
                        setCourseId(c.id ?? null);
                        setPage(1);
                        setFilterOpen(false);
                      }}
                      w="full"
                      px={4}
                      py={2.5}
                      align="center"
                      justify="space-between"
                      bg={selected ? "gray.50" : "white"}
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                    >
                      <Text fontSize="sm" color="gray.800">
                        {c.title}
                      </Text>
                      {selected ? <Check size={16} color="#6366F1" /> : null}
                    </Flex>
                  );
                })}
              </Box>
            ) : null}
          </Box>

          <Box position="relative" w="340px">
            <Box position="absolute" top="50%" left="14px" transform="translateY(-50%)" color="gray.400">
              <Search size={18} />
            </Box>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search a student..."
              h="48px"
              pl="44px"
              fontSize="sm"
              borderColor="gray.200"
              rounded="lg"
              _placeholder={{ color: "gray.400" }}
              _focus={{ borderColor: "#2E2F6F", outline: "none", boxShadow: "none" }}
            />
          </Box>
        </Flex>

        {/* Table */}
        <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
          <Grid templateColumns={COLS} gap={4} px={5} py={3.5} bg="gray.50" roundedTop="xl">
            {["Student", "Email", "Course", "Level", "Progress", "Action"].map((h) => (
              <Text key={h} fontSize="sm" color="gray.500">
                {h}
              </Text>
            ))}
          </Grid>
          {loading ? (
            [...Array(PAGE_SIZE)].map((_, i) => <RowSkeleton key={i} />)
          ) : students.length === 0 ? (
            <Flex direction="column" align="center" justify="center" py="80px" gap={2} color="gray.400">
              <Users size={32} />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                No students found
              </Text>
              <Text fontSize="sm">Try a different search or filter</Text>
            </Flex>
          ) : (
            students.map((s) => (
              <Grid key={s.id} templateColumns={COLS} gap={4} px={5} py={4} alignItems="center" borderTopWidth="1px" borderColor="gray.100">
                <HStack gap={3}>
                  <Avatar name={s.name} src={s.avatarUrl} initials={s.initials} size={32} />
                  <Text fontSize="sm" fontWeight="medium" color="gray.900">
                    {s.name}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.700">
                  {s.email}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {s.course?.title ?? "—"}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {s.level ?? "—"}
                </Text>
                <ProgressCell value={s.progress} />
                <Box as="button" onClick={() => router.push(studentPaths.details(s.id))} px={4} py={1.5} rounded="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm" fontWeight="medium" color="gray.700" cursor="pointer" w="fit-content" _hover={{ bg: "gray.50" }}>
                  View profile
                </Box>
              </Grid>
            ))
          )}
          <Flex justify="space-between" align="center" px={5} py={4} borderTopWidth="1px" borderColor="gray.100">
            <Text fontSize="sm" color="gray.500">
              Page {page} of {totalPages}
            </Text>
            <HStack gap={2}>
              <Box
                as="button"
                onClick={page <= 1 ? undefined : () => setPage((p) => Math.max(1, p - 1))}
                px={4}
                py={2}
                rounded="md"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                opacity={page <= 1 ? 0.5 : 1}
                cursor={page <= 1 ? "not-allowed" : "pointer"}
                _hover={page <= 1 ? undefined : { bg: "gray.50" }}
              >
                Previous
              </Box>
              <Box
                as="button"
                onClick={page >= totalPages ? undefined : () => setPage((p) => Math.min(totalPages, p + 1))}
                px={4}
                py={2}
                rounded="md"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                opacity={page >= totalPages ? 0.5 : 1}
                cursor={page >= totalPages ? "not-allowed" : "pointer"}
                _hover={page >= totalPages ? undefined : { bg: "gray.50" }}
              >
                Next
              </Box>
            </HStack>
          </Flex>
        </Box>
      </Box>
      )}

      {bulkOpen ? <BulkMessageModal onClose={() => setBulkOpen(false)} /> : null}
      {inviteModal}
    </Box>
  );
}
