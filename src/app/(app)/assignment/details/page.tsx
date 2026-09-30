"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Heading,
  Link,
  Portal,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { AlertCircle, ArrowLeft, FileText, Inbox, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MetaItem, NumberCard, PageTopBar, StatusBadge } from "@/components/assignment/shared";
import { assignmentPaths } from "@/lib/routes";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type Assignment,
  type AssignmentOverview,
  type SubmissionListItem,
  deleteAssignment,
  exportSubmissions,
  getAssignment,
  getAssignmentOverview,
  listSubmissions,
  sendReminder,
} from "@/lib/api/assignments";

const AVATAR_COLORS = ["#F97461", "#6366F1", "#10B981", "#F59E0B", "#EC4899"];
const SUB_COLS = "1.4fr 1.4fr 0.8fr 0.9fr 1fr 0.8fr";
const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** First placement's populated course title, with a "+N" hint for multi-course. */
function courseLabel(assignment: Assignment): string {
  const first = assignment.placements[0]?.courseId;
  const title =
    first && typeof first === "object" ? first.title : undefined;
  if (!title) return "—";
  const extra = assignment.placements.length - 1;
  return extra > 0 ? `${title} +${extra}` : title;
}

function SubmissionRow({
  submission,
  index,
  totalPoints,
  onAction,
}: {
  submission: SubmissionListItem;
  index: number;
  totalPoints: number;
  onAction: () => void;
}) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const isGraded = submission.status === "graded";
  return (
    <Grid
      templateColumns={SUB_COLS}
      alignItems="center"
      gap={4}
      px={5}
      py={4}
      borderTopWidth="1px"
      borderColor="gray.100"
    >
      <HStack gap={3}>
        <Flex
          w="32px"
          h="32px"
          rounded="full"
          bg={`${color}22`}
          color={color}
          align="center"
          justify="center"
          fontSize="xs"
          fontWeight="semibold"
          flexShrink={0}
        >
          {initials(submission.studentName)}
        </Flex>
        <Text fontSize="sm" fontWeight="medium" color="gray.900">
          {submission.studentName}
        </Text>
      </HStack>
      <Text fontSize="sm" color="gray.700">
        {submission.studentEmail}
      </Text>
      <Text fontSize="sm" color="gray.700">
        {submission.score != null ? `${submission.score}/${totalPoints}` : "—"}
        {submission.letterGrade ? ` (${submission.letterGrade})` : ""}
      </Text>
      <Text fontSize="sm" color="gray.700">
        {timeAgo(submission.submittedAt)}
      </Text>
      <Box>
        <StatusBadge status={submission.status} />
      </Box>
      <Box
        as="button"
        onClick={onAction}
        px={4}
        py={1.5}
        rounded="md"
        borderWidth="1px"
        borderColor="gray.200"
        bg="white"
        fontSize="sm"
        fontWeight="medium"
        color="gray.700"
        cursor="pointer"
        w="fit-content"
        _hover={{ bg: "gray.50" }}
      >
        {isGraded ? "Review" : "Grade"}
      </Box>
    </Grid>
  );
}

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const assignmentId = params.get("assignmentId");

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [overview, setOverview] = useState<AssignmentOverview | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [subTotalPoints, setSubTotalPoints] = useState(100);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [subPage, setSubPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [subsLoading, setSubsLoading] = useState(true);

  const [tab, setTab] = useState<"overview" | "instructions">("overview");
  const [reminderSent, setReminderSent] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCore = useCallback(async () => {
    if (!assignmentId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [a, o] = await Promise.all([
      getAssignment(assignmentId),
      getAssignmentOverview(assignmentId),
    ]);
    if (a.success) {
      setAssignment(a.data);
      setReminderSent(Boolean(a.data.lastReminderSentAt));
    } else {
      setNotFound(true);
    }
    if (o.success) setOverview(o.data);
    setLoading(false);
  }, [assignmentId]);

  const fetchSubmissions = useCallback(async () => {
    if (!assignmentId) return;
    setSubsLoading(true);
    const result = await listSubmissions(assignmentId, {
      page: subPage,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setSubmissions(result.data.submissions);
      setSubTotalPoints(result.data.totalPoints);
      setSubTotalPages(result.data.totalPages || 1);
    }
    setSubsLoading(false);
  }, [assignmentId, subPage]);

  useEffect(() => {
    const id = setTimeout(fetchCore, 0);
    return () => clearTimeout(id);
  }, [fetchCore]);

  useEffect(() => {
    const id = setTimeout(fetchSubmissions, 0);
    return () => clearTimeout(id);
  }, [fetchSubmissions]);

  if (loading) {
    return (
      <Box pb={10}>
        <PageTopBar />
        <Box px={8}>
          <Skeleton h="28px" w="320px" rounded="md" mb={3} />
          <Skeleton h="16px" w="200px" rounded="md" mb={8} />
          <HStack gap={5}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} h="96px" flex="1" rounded="xl" />
            ))}
          </HStack>
        </Box>
      </Box>
    );
  }

  if (notFound || !assignment) {
    return (
      <Box>
        <PageTopBar />
        <Flex direction="column" align="center" justify="center" py="160px" gap={3}>
          <Text fontWeight="semibold" color="gray.900">
            Assignment not found
          </Text>
          <Button variant="outline" rounded="full" onClick={() => router.push(assignmentPaths.list)}>
            Back to assignments
          </Button>
        </Flex>
      </Box>
    );
  }

  const dueAt = overview?.dueAt ?? assignment.submission.dueAt;
  const assignedCount = overview?.assignedCount ?? 0;
  const submittedCount = overview?.submittedCount ?? 0;
  const totalPoints = overview?.totalPoints ?? assignment.grading.totalPoints;
  const links = assignment.resources.links;
  const files = assignment.resources.files;

  const handleSendReminder = async () => {
    if (!assignmentId || sendingReminder) return;
    setSendingReminder(true);
    const result = await sendReminder(assignmentId);
    if (result.success) {
      setReminderSent(true);
      toast.success("Reminder Sent", {
        description: result.data.message || "A reminder has been sent out to all students.",
      });
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't send reminder"));
    }
    setSendingReminder(false);
  };

  const handleExport = async () => {
    if (!assignmentId || exporting) return;
    setExporting(true);
    const result = await exportSubmissions(assignmentId);
    if (result.success) {
      toast.success("Export started", {
        description: "Your submissions CSV is downloading.",
      });
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't export submissions"));
    }
    setExporting(false);
  };

  const handleDelete = async () => {
    if (!assignmentId || deleting) return;
    setDeleting(true);
    const result = await deleteAssignment(assignmentId);
    if (result.success) {
      setConfirmingDelete(false);
      toast.success("Assignment Deleted", {
        description: "This assignment has been deleted successfully.",
      });
      router.push(assignmentPaths.list);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't delete assignment"));
      setDeleting(false);
    }
  };

  return (
    <Box pb={10}>
      <PageTopBar />

      <Box px={8}>
        {/* Back + actions */}
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Box>
            <Box
              as="button"
              onClick={() => router.push(assignmentPaths.list)}
              color="gray.500"
              mb={3}
              cursor="pointer"
              _hover={{ color: "gray.800" }}
            >
              <ArrowLeft size={20} />
            </Box>
            <HStack gap={2} mb={2} fontSize="sm">
              <Text color="gray.400">Assignment</Text>
              <Text color="gray.300">›</Text>
              <Text color="#2E2F6F" fontWeight="medium">
                {assignment.title}
              </Text>
            </HStack>
            <Heading as="h1" size="xl" color="gray.900" mb={1}>
              {assignment.title}
            </Heading>
            <Text fontSize="sm" color="gray.500" mb={5}>
              {courseLabel(assignment)}
            </Text>
            <HStack gap={10} align="flex-start">
              <MetaItem label="Due date">{formatDue(dueAt)}</MetaItem>
              <MetaItem label="Assigned to">All ({assignedCount})</MetaItem>
              <MetaItem label="Submissions">
                {submittedCount}/{assignedCount}
              </MetaItem>
              <MetaItem label="Completion">{overview?.completionRate ?? 0}%</MetaItem>
            </HStack>
          </Box>

          <HStack gap={3} pt={1}>
            <Box
              as="button"
              onClick={() => setConfirmingDelete(true)}
              color="#EF4444"
              fontSize="sm"
              fontWeight="medium"
              px={2}
              cursor="pointer"
              _hover={{ color: "#DC2626" }}
            >
              Delete
            </Box>
            {assignment.status === "draft" ? (
              <Button
                bg="#2E2F6F"
                color="white"
                rounded="full"
                h="40px"
                px={5}
                fontSize="sm"
                fontWeight="medium"
                _hover={{ bg: "#262760" }}
                onClick={() => router.push(assignmentPaths.edit(assignmentId!))}
              >
                Continue editing
              </Button>
            ) : (
              <>
                {assignment.status === "published" ? (
                  <Button
                    variant="outline"
                    rounded="full"
                    h="40px"
                    px={5}
                    fontSize="sm"
                    fontWeight="medium"
                    color="#2E2F6F"
                    borderColor="gray.200"
                    _hover={{ bg: "#FFF1ED", borderColor: "#F97461", color: "#F97461" }}
                    onClick={() => router.push(assignmentPaths.edit(assignmentId!))}
                  >
                    <Pencil size={15} />
                    Edit
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  rounded="full"
                  h="40px"
                  px={5}
                  fontSize="sm"
                  fontWeight="medium"
                  loading={sendingReminder}
                  disabled={reminderSent || sendingReminder}
                  onClick={handleSendReminder}
                >
                  {reminderSent ? "Reminder sent" : "Send reminder"}
                </Button>
                <Button
                  bg="#2E2F6F"
                  color="white"
                  rounded="full"
                  h="40px"
                  px={5}
                  fontSize="sm"
                  fontWeight="medium"
                  _hover={{ bg: "#262760" }}
                  loading={exporting}
                  disabled={exporting}
                  onClick={handleExport}
                >
                  Export submissions
                </Button>
              </>
            )}
          </HStack>
        </Flex>

        {/* Tabs */}
        <Box borderBottomWidth="1px" borderColor="gray.200" mt={8} mb={6}>
          <HStack gap={8}>
            {(["overview", "instructions"] as const).map((t) => {
              const active = tab === t;
              return (
                <Box
                  key={t}
                  onClick={() => setTab(t)}
                  pb={3}
                  borderBottomWidth="2px"
                  borderColor={active ? "#2E2F6F" : "transparent"}
                  cursor="pointer"
                  textTransform="capitalize"
                >
                  <Text
                    fontSize="sm"
                    fontWeight={active ? "semibold" : "medium"}
                    color={active ? "#2E2F6F" : "gray.500"}
                  >
                    {t}
                  </Text>
                </Box>
              );
            })}
          </HStack>
        </Box>

        {tab === "overview" ? (
          <Stack gap={6}>
            <HStack gap={5} align="stretch">
              <NumberCard label="Submitted" value={overview?.submittedCount ?? 0} />
              <NumberCard label="Pending" value={overview?.pendingCount ?? 0} />
              <NumberCard label="Graded" value={overview?.gradedCount ?? 0} />
              <NumberCard
                label="Avg Score"
                value={overview?.avgScore != null ? `${overview.avgScore}/${totalPoints}` : "—"}
              />
            </HStack>

            <Heading as="h2" size="md" color="gray.900">
              Submissions
            </Heading>

            {subsLoading ? (
              <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6}>
                <Stack gap={4}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} h="40px" rounded="md" />
                  ))}
                </Stack>
              </Box>
            ) : submissions.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                py="80px"
                gap={3}
                color="gray.400"
              >
                <Inbox size={36} />
                <Stack gap={0.5} textAlign="center">
                  <Text fontWeight="semibold" color="gray.900">
                    No submissions yet
                  </Text>
                  <Text fontSize="sm">
                    Submission for this assignment will appear here
                  </Text>
                </Stack>
              </Flex>
            ) : (
              <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
                <Grid templateColumns={SUB_COLS} gap={4} px={5} py={3.5} bg="gray.50" roundedTop="xl">
                  <Text fontSize="sm" color="gray.500">Student</Text>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontSize="sm" color="gray.500">Grade</Text>
                  <Text fontSize="sm" color="gray.500">Submitted</Text>
                  <Text fontSize="sm" color="gray.500">Status</Text>
                  <Text fontSize="sm" color="gray.500">Action</Text>
                </Grid>
                {submissions.map((s, i) => (
                  <SubmissionRow
                    key={s.id}
                    submission={s}
                    index={i}
                    totalPoints={subTotalPoints}
                    onAction={() =>
                      router.push(assignmentPaths.grade(assignmentId!, s.id))
                    }
                  />
                ))}
                <Flex justify="space-between" align="center" px={5} py={4} borderTopWidth="1px" borderColor="gray.100">
                  <Text fontSize="sm" color="gray.500">
                    Page {subPage} of {subTotalPages}
                  </Text>
                  <HStack gap={2}>
                    <Box
                      as="button"
                      onClick={subPage <= 1 ? undefined : () => setSubPage((p) => Math.max(1, p - 1))}
                      px={4}
                      py={2}
                      rounded="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      bg="white"
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      opacity={subPage <= 1 ? 0.5 : 1}
                      cursor={subPage <= 1 ? "not-allowed" : "pointer"}
                      _hover={subPage <= 1 ? undefined : { bg: "gray.50" }}
                    >
                      Previous
                    </Box>
                    <Box
                      as="button"
                      onClick={subPage >= subTotalPages ? undefined : () => setSubPage((p) => Math.min(subTotalPages, p + 1))}
                      px={4}
                      py={2}
                      rounded="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      bg="white"
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.700"
                      opacity={subPage >= subTotalPages ? 0.5 : 1}
                      cursor={subPage >= subTotalPages ? "not-allowed" : "pointer"}
                      _hover={subPage >= subTotalPages ? undefined : { bg: "gray.50" }}
                    >
                      Next
                    </Box>
                  </HStack>
                </Flex>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack gap={6} maxW="760px">
            <Stack gap={3}>
              <Text fontWeight="semibold" color="gray.900">
                Instructions
              </Text>
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                {assignment.description || "No instructions provided."}
              </Text>
            </Stack>
            {files.length > 0 ? (
              <Stack gap={3}>
                <Text fontWeight="semibold" color="gray.900">
                  Attachments
                </Text>
                <Stack gap={0}>
                  {files.map((att) => (
                    <Flex
                      key={att.fileUrl}
                      justify="space-between"
                      align="center"
                      py={4}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                    >
                      <HStack gap={3}>
                        <FileText size={18} color="#6B7280" />
                        <Text fontSize="sm" color="gray.700">
                          {att.fileName}
                        </Text>
                      </HStack>
                      <Link
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        fontSize="sm"
                        fontWeight="medium"
                        color="gray.900"
                        cursor="pointer"
                      >
                        Download
                      </Link>
                    </Flex>
                  ))}
                </Stack>
              </Stack>
            ) : null}
            {links.length > 0 ? (
              <Stack gap={3}>
                <Text fontWeight="semibold" color="gray.900">
                  Links
                </Text>
                <Stack gap={2}>
                  {links.map((l) => (
                    <Link
                      key={l}
                      href={l}
                      target="_blank"
                      rel="noopener noreferrer"
                      fontSize="sm"
                      color="#2563EB"
                      textDecoration="underline"
                    >
                      {l}
                    </Link>
                  ))}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Box>

      {/* Delete confirmation */}
      {confirmingDelete ? (
        <Portal>
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.600"
            zIndex={200}
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={4}
            onClick={() => setConfirmingDelete(false)}
          >
            <Box
              bg="white"
              rounded="2xl"
              p={8}
              w="full"
              maxW="460px"
              boxShadow="2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Stack gap={5} align="center" textAlign="center">
                <Flex w="56px" h="56px" rounded="full" bg="#FEE2E2" align="center" justify="center">
                  <AlertCircle size={26} color="#DC2626" />
                </Flex>
                <Stack gap={2}>
                  <Heading as="h3" size="md" color="gray.900">
                    Delete assignment?
                  </Heading>
                  <Text fontSize="sm" color="gray.500" lineHeight="1.6">
                    Deleting this assignment will remove all submissions, grades
                    and attached resources.
                  </Text>
                </Stack>
                <Stack gap={3} w="full">
                  <Button
                    bg="#2E2F6F"
                    color="white"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="semibold"
                    _hover={{ bg: "#262760" }}
                    loading={deleting}
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="medium"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Portal>
      ) : null}
    </Box>
  );
}
