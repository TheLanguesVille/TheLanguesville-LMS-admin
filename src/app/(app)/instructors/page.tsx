"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Heading,
  Input,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Plus, Search, Star, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { capitalize, InstructorStatusPill } from "@/components/instructors/status-pill";
import { InviteInstructorModal } from "@/components/invitations/invite-instructor-modal";
import { Avatar } from "@/components/shared/avatar";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type InstructorListItem,
  getInstructorStats,
  listInstructors,
} from "@/lib/api/instructors";
import { formatDateShort } from "@/lib/format";
import { useAdmin } from "@/lib/hooks/use-admin";
import { instructorPaths } from "@/lib/routes";

const COLS = "1.6fr 0.9fr 0.8fr 0.7fr 0.9fr 0.7fr 0.9fr";
const PAGE_SIZE = 10;

function RowSkeleton() {
  return (
    <Grid templateColumns={COLS} gap={4} px={5} py={4} alignItems="center" borderTopWidth="1px" borderColor="gray.100">
      <HStack gap={3}>
        <Skeleton w="32px" h="32px" rounded="full" />
        <Skeleton h="14px" w="60%" rounded="md" />
      </HStack>
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} h="14px" w="60%" rounded="md" />
      ))}
      <Skeleton h="28px" w="90px" rounded="md" />
    </Grid>
  );
}

export default function InstructorsListPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();

  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [instructors, setInstructors] = useState<InstructorListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasAny, setHasAny] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Instructors can view this list but not send instructor invites (403).
  const canInvite = admin?.role !== "instructor";

  const fetchStats = useCallback(async () => {
    const result = await getInstructorStats();
    if (result.success) setActiveCount(result.data.active);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const result = await listInstructors({
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setInstructors(result.data.instructors);
      setTotalPages(result.data.totalPages || 1);
      if (!search) setHasAny(result.data.total > 0);
      else if (result.data.total > 0) setHasAny(true);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load instructors"));
      setInstructors([]);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    const id = setTimeout(fetchStats, 0);
    return () => clearTimeout(id);
  }, [fetchStats]);

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

  const refresh = () => {
    fetchStats();
    fetchList();
  };

  const inviteModal = inviteOpen ? (
    <InviteInstructorModal
      onClose={() => setInviteOpen(false)}
      onSent={refresh}
      viewListLabel="View instructor list"
      onViewList={() => setInviteOpen(false)}
      via="admin"
    />
  ) : null;

  // Fully empty state: no instructors at all, with no active search.
  // Rendered via a ternary inside one return so the invite modal keeps its
  // tree position — and its state — when a refetch flips this flag.
  const showEmptyState = !loading && !hasAny && !search;

  return (
    <Box>
      <DashboardHeader title="Instructors" loading={adminLoading} user={userChip} />

      {showEmptyState ? (
        <Flex direction="column" align="center" justify="center" py="180px" gap={3} color="gray.400">
          <UsersRound size={40} />
          <Stack gap={1} textAlign="center">
            <Text fontWeight="semibold" color="gray.900">
              No instructors yet
            </Text>
            <Text fontSize="sm" maxW="300px">
              Instructors will appear here once they&apos;ve been added or accepted an invitation
            </Text>
          </Stack>
          {canInvite ? (
            <Button bg="#2E2F6F" color="white" rounded="full" h="48px" px={6} mt={3} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setInviteOpen(true)}>
              <Plus size={18} />
              Add instructor
            </Button>
          ) : null}
        </Flex>
      ) : (
      <Box px={8} py={6}>
        <Flex justify="space-between" align="flex-start" mb={6}>
          <Stack gap={1}>
            <Heading as="h2" size="xl" color="gray.900">
              {activeCount ?? "—"} active teaching staff
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Manage individual progress for each teaching staff
            </Text>
          </Stack>
          {canInvite ? (
            <Button bg="#2E2F6F" color="white" rounded="full" h="48px" px={6} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setInviteOpen(true)}>
              <Plus size={18} />
              Invite instructors
            </Button>
          ) : null}
        </Flex>

        {/* Search */}
        <Box position="relative" w="340px" mb={6}>
          <Box position="absolute" top="50%" left="14px" transform="translateY(-50%)" color="gray.400" zIndex={1}>
            <Search size={18} />
          </Box>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search an instructor..."
            h="48px"
            pl="44px"
            fontSize="sm"
            bg="white"
            borderColor="gray.200"
            rounded="lg"
            _placeholder={{ color: "gray.400" }}
            _focus={{ borderColor: "#2E2F6F", outline: "none", boxShadow: "none" }}
          />
        </Box>

        {/* Table */}
        <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
          <Grid templateColumns={COLS} gap={4} px={5} py={3.5} bg="gray.50" roundedTop="xl">
            {["Instructor", "Level", "Status", "Students", "Joined", "Rating", "Action"].map((h) => (
              <Text key={h} fontSize="sm" color="gray.500">
                {h}
              </Text>
            ))}
          </Grid>
          {loading ? (
            [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
          ) : instructors.length === 0 ? (
            <Flex direction="column" align="center" justify="center" py="80px" gap={2} color="gray.400">
              <UsersRound size={32} />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                No instructors found
              </Text>
              <Text fontSize="sm">Try a different search</Text>
            </Flex>
          ) : (
            instructors.map((instructor) => (
              <Grid key={instructor.id} templateColumns={COLS} gap={4} px={5} py={4} alignItems="center" borderTopWidth="1px" borderColor="gray.100">
                <HStack gap={3}>
                  <Avatar name={instructor.name} src={instructor.avatarUrl} initials={instructor.initials} size={36} />
                  <Stack gap={0}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.900">
                      {instructor.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {instructor.email}
                    </Text>
                  </Stack>
                </HStack>
                <Text fontSize="sm" color="gray.700">
                  {capitalize(instructor.teachingLevel)}
                </Text>
                <InstructorStatusPill status={instructor.status} />
                <Text fontSize="sm" color="gray.700">
                  {instructor.studentsCount}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {formatDateShort(instructor.joinedAt)}
                </Text>
                <HStack gap={1.5}>
                  <Star size={15} color="#F59E0B" fill="#F59E0B" />
                  <Text fontSize="sm" color="gray.700">
                    {instructor.rating ?? "-"}
                  </Text>
                </HStack>
                <Box as="button" onClick={() => router.push(instructorPaths.details(instructor.id))} px={4} py={1.5} rounded="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm" fontWeight="medium" color="gray.700" cursor="pointer" w="fit-content" _hover={{ bg: "gray.50" }}>
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
              <Box as="button" onClick={page <= 1 ? undefined : () => setPage((p) => Math.max(1, p - 1))} px={4} py={2} rounded="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm" fontWeight="medium" color="gray.700" opacity={page <= 1 ? 0.5 : 1} cursor={page <= 1 ? "not-allowed" : "pointer"} _hover={page <= 1 ? undefined : { bg: "gray.50" }}>
                Previous
              </Box>
              <Box as="button" onClick={page >= totalPages ? undefined : () => setPage((p) => Math.min(totalPages, p + 1))} px={4} py={2} rounded="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm" fontWeight="medium" color="gray.700" opacity={page >= totalPages ? 0.5 : 1} cursor={page >= totalPages ? "not-allowed" : "pointer"} _hover={page >= totalPages ? undefined : { bg: "gray.50" }}>
                Next
              </Box>
            </HStack>
          </Flex>
        </Box>
      </Box>
      )}

      {inviteModal}
    </Box>
  );
}
