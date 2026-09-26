"use client";

import { roleLabel } from "@/lib/api/auth";
import { Box, Flex, Grid, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { NumberCard, StatusBadge } from "@/components/assignment/shared";
import { AppButton } from "@/components/ui/app-button";
import { useAdmin } from "@/lib/hooks/use-admin";
import { assignmentPaths } from "@/lib/routes";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type AssignmentListItem,
  type AssignmentStats,
  TYPE_LABELS,
  getAssignmentStats,
  listAssignments,
} from "@/lib/api/assignments";

type TabValue = "all" | "active" | "overdue" | "draft";

const COLS = "1.6fr 1.4fr 0.9fr 1fr 0.9fr 0.7fr";
const PAGE_SIZE = 10;

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={disabled ? undefined : onClick}
      px={4}
      py={2}
      rounded="md"
      borderWidth="1px"
      borderColor="gray.200"
      bg="white"
      fontSize="sm"
      fontWeight="medium"
      color="gray.700"
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? "not-allowed" : "pointer"}
      _hover={disabled ? undefined : { bg: "gray.50" }}
    >
      {label}
    </Box>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="sm" color="gray.500" fontWeight="medium">
      {children}
    </Text>
  );
}

function AssignmentRow({
  assignment,
  onClick,
}: {
  assignment: AssignmentListItem;
  onClick: () => void;
}) {
  return (
    <Grid
      templateColumns={COLS}
      alignItems="center"
      gap={4}
      px={5}
      py={4}
      borderTopWidth="1px"
      borderColor="gray.100"
      cursor="pointer"
      _hover={{ bg: "gray.50" }}
      transition="background 0.15s"
      onClick={onClick}
    >
      <Stack gap={0.5}>
        <Text fontSize="sm" fontWeight="medium" color="gray.900">
          {assignment.title}
        </Text>
        <Text fontSize="xs" color="gray.400">
          {TYPE_LABELS[assignment.type] ?? assignment.type}
        </Text>
      </Stack>
      <Text fontSize="sm" color="gray.700">
        {assignment.course?.title ?? "—"}
        {assignment.courseCount > 1 ? ` +${assignment.courseCount - 1}` : ""}
      </Text>
      <Text fontSize="sm" color="gray.700">
        All ({assignment.assignedCount})
      </Text>
      <Text fontSize="sm" color="gray.700">
        {formatDue(assignment.dueAt)}
      </Text>
      <Box>
        <StatusBadge status={assignment.derivedStatus} />
      </Box>
      <Text fontSize="sm" color="gray.700">
        {assignment.submittedCount}/{assignment.assignedCount}
      </Text>
    </Grid>
  );
}

function RowSkeleton() {
  return (
    <Grid templateColumns={COLS} gap={4} px={5} py={4} borderTopWidth="1px" borderColor="gray.100">
      <Stack gap={1.5}>
        <Skeleton h="14px" w="70%" rounded="md" />
        <Skeleton h="10px" w="40%" rounded="md" />
      </Stack>
      <Skeleton h="14px" w="70%" rounded="md" />
      <Skeleton h="14px" w="50%" rounded="md" />
      <Skeleton h="14px" w="60%" rounded="md" />
      <Skeleton h="20px" w="64px" rounded="full" />
      <Skeleton h="14px" w="40%" rounded="md" />
    </Grid>
  );
}

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "draft", label: "Draft" },
];

export default function AssignmentListPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [items, setItems] = useState<AssignmentListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  /** Distinguishes "no results for this filter" from "no assignments at all". */
  const [hasAny, setHasAny] = useState(true);

  const fetchStats = useCallback(async () => {
    const result = await getAssignmentStats();
    if (result.success) {
      setStats(result.data);
      setHasAny(
        result.data.active + result.data.overdue + result.data.drafts > 0,
      );
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const result = await listAssignments({
      filter: activeTab,
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setItems(result.data.assignments);
      setTotalPages(result.data.totalPages || 1);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load assignments"));
      setItems([]);
    }
    setLoading(false);
  }, [activeTab, search, page]);

  useEffect(() => {
    const id = setTimeout(fetchStats, 0);
    return () => clearTimeout(id);
  }, [fetchStats]);

  useEffect(() => {
    const id = setTimeout(fetchList, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchList, search]);

  const statCards: { label: string; value: number }[] = [
    { label: "Active", value: stats?.active ?? 0 },
    { label: "Overdue", value: stats?.overdue ?? 0 },
    { label: "Drafts", value: stats?.drafts ?? 0 },
    { label: "Submission", value: stats?.submissions ?? 0 },
  ];

  const userChip = admin
    ? {
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        role: roleLabel(admin.role),
      }
    : undefined;

  // Fully empty state (no assignments at all, no active search/filter).
  if (!loading && !hasAny && !search && activeTab === "all" && items.length === 0) {
    return (
      <Box>
        <DashboardHeader title="Assignment" notificationCount={1} loading={adminLoading} user={userChip} />
        <Flex direction="column" align="center" justify="center" py="160px" gap={4}>
          <Box color="gray.300">
            <FileText size={44} />
          </Box>
          <Stack gap={1} textAlign="center">
            <Text fontWeight="semibold" color="gray.900">
              No assignments yet
            </Text>
            <Text fontSize="sm" color="gray.500">
              Assignments created for this course will appear here for students
              to complete and submit.
            </Text>
          </Stack>
          <AppButton w="auto" px={6} onClick={() => router.push(assignmentPaths.new)}>
            <HStack gap={2}>
              <Plus size={16} />
              <Text>New assignment</Text>
            </HStack>
          </AppButton>
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHeader title="Assignment" notificationCount={1} loading={adminLoading} user={userChip} />

      <Box px={8} py={6}>
        <Stack gap={6}>
          {/* Stat cards */}
          <HStack gap={4} align="stretch">
            {statCards.map((c) => (
              <NumberCard key={c.label} label={c.label} value={c.value} />
            ))}
          </HStack>

          {/* Tabs */}
          <Box borderBottomWidth="1px" borderColor="gray.200">
            <HStack gap={6}>
              {TABS.map((tab) => {
                const active = tab.value === activeTab;
                return (
                  <Box
                    key={tab.value}
                    onClick={() => {
                      setActiveTab(tab.value);
                      setPage(1);
                    }}
                    pb={3}
                    borderBottomWidth="2px"
                    borderColor={active ? "#2E2F6F" : "transparent"}
                    cursor="pointer"
                  >
                    <Text
                      fontSize="sm"
                      fontWeight={active ? "semibold" : "medium"}
                      color={active ? "#2E2F6F" : "gray.500"}
                    >
                      {tab.label}
                    </Text>
                  </Box>
                );
              })}
            </HStack>
          </Box>

          {/* Search + New assignment */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <SearchInput
              placeholder="Search assignments"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <AppButton
              w="auto"
              px={5}
              onClick={() => router.push(assignmentPaths.new)}
            >
              <HStack gap={2}>
                <Plus size={16} />
                <Text>New assignment</Text>
              </HStack>
            </AppButton>
          </Flex>

          {/* Table */}
          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
            <Grid
              templateColumns={COLS}
              gap={4}
              px={5}
              py={3.5}
              bg="gray.50"
              roundedTop="xl"
            >
              <HeaderCell>Assignment</HeaderCell>
              <HeaderCell>Course</HeaderCell>
              <HeaderCell>Assigned to</HeaderCell>
              <HeaderCell>Due date</HeaderCell>
              <HeaderCell>Status</HeaderCell>
              <HeaderCell>Submitted</HeaderCell>
            </Grid>

            {loading ? (
              [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
            ) : items.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                py="80px"
                gap={2}
                color="gray.400"
              >
                <FileText size={32} />
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  No assignments found
                </Text>
                <Text fontSize="sm">
                  {search
                    ? "Try a different search term"
                    : "Nothing here for this filter yet"}
                </Text>
              </Flex>
            ) : (
              items.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  onClick={() =>
                    router.push(
                      // Drafts have no submissions yet — reopen them in the builder.
                      a.status === "draft"
                        ? assignmentPaths.edit(a.id)
                        : assignmentPaths.details(a.id),
                    )
                  }
                />
              ))
            )}
          </Box>

          {/* Pagination */}
          {items.length > 0 ? (
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">
                Page {page} of {totalPages}
              </Text>
              <HStack gap={2}>
                <PagerButton
                  label="Previous"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
                <PagerButton
                  label="Next"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </HStack>
            </Flex>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
