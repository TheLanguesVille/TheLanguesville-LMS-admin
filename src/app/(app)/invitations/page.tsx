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
import {
  Check,
  ChevronDown,
  EllipsisVertical,
  Mail,
  Plus,
  Search,
  Trash2,
  UserRound,
  UserRoundPen,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { InviteInstructorModal } from "@/components/invitations/invite-instructor-modal";
import { InviteOverlay } from "@/components/invitations/invite-shell";
import { InviteStudentModal } from "@/components/invitations/invite-student-modal";
import { Avatar } from "@/components/shared/avatar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type InvitationListItem,
  type InvitationRole,
  type InvitationStats,
  type InvitationStatus,
  cancelInvitation,
  deleteInvitation,
  getInvitationStats,
  listInvitations,
} from "@/lib/api/invitations";
import { formatDateShort } from "@/lib/format";
import { useAdmin } from "@/lib/hooks/use-admin";

const COLS = "1.3fr 1.5fr 0.8fr 0.9fr 1fr 0.9fr 0.5fr";
const PAGE_SIZE = 10;

const TABS: Array<{ value: InvitationStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const ROLE_FILTERS: Array<{ value: InvitationRole | null; label: string }> = [
  { value: null, label: "All Roles" },
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

const STATUS_STYLES: Record<InvitationStatus, { bg: string; color: string }> = {
  pending: { bg: "#FEF3C7", color: "#D97706" },
  accepted: { bg: "#DCFCE7", color: "#16A34A" },
  expired: { bg: "#F3F4F6", color: "#6B7280" },
  cancelled: { bg: "#FEE2E2", color: "#DC2626" },
};

function capitalize(value: string | null | undefined): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function InvitationStatusPill({ status }: { status: InvitationStatus }) {
  // Tolerate rows the API returns without a status.
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.expired;
  return (
    <HStack gap={1.5} px={3} py={1} rounded="full" bg={style.bg} w="fit-content">
      <Box w="6px" h="6px" rounded="full" bg={style.color} />
      <Text fontSize="sm" color={style.color} fontWeight="medium">
        {capitalize(status)}
      </Text>
    </HStack>
  );
}

function RowSkeleton() {
  return (
    <Grid templateColumns={COLS} gap={4} px={5} py={4} alignItems="center" borderTopWidth="1px" borderColor="gray.100">
      <HStack gap={3}>
        <Skeleton w="32px" h="32px" rounded="full" />
        <Skeleton h="14px" w="60%" rounded="md" />
      </HStack>
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} h="14px" w="70%" rounded="md" />
      ))}
      <Skeleton h="20px" w="20px" rounded="md" />
    </Grid>
  );
}

/** "More" row-actions modal (⋮): cancel / delete the invitation. */
function MoreActionsModal({
  invitation,
  canManage,
  onCancelInvite,
  onDeleteInvite,
  onClose,
}: {
  invitation: InvitationListItem;
  canManage: boolean;
  onCancelInvite: () => void;
  onDeleteInvite: () => void;
  onClose: () => void;
}) {
  const actionStyles = {
    w: "full",
    gap: 3,
    px: 2,
    py: 3,
    rounded: "lg",
    cursor: "pointer",
    textAlign: "left" as const,
    _hover: { bg: "gray.50" },
  };

  return (
    <InviteOverlay onClose={onClose} maxW="440px">
      <Stack gap={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.900">
          More
        </Text>
        <Flex align="center" justify="space-between">
          <HStack gap={3}>
            <Avatar name={invitation.name || invitation.email} initials={invitation.initials} size={44} />
            <Stack gap={0}>
              <Text fontWeight="semibold" color="gray.900">
                {invitation.name || "—"}
              </Text>
              <HStack gap={1.5} fontSize="sm" color="gray.500">
                <Text>{invitation.email}</Text>
                <Text>•</Text>
                <Text>{capitalize(invitation.role)}</Text>
              </HStack>
            </Stack>
          </HStack>
          <InvitationStatusPill status={invitation.status} />
        </Flex>

        <Stack gap={1}>
          {canManage && invitation.status === "pending" ? (
            <HStack as="button" {...actionStyles} color="gray.800" onClick={onCancelInvite}>
              <X size={18} />
              <Text fontSize="sm" fontWeight="medium">
                Cancel invitation
              </Text>
            </HStack>
          ) : null}
          {canManage ? (
            <HStack as="button" {...actionStyles} color="#DC2626" onClick={onDeleteInvite}>
              <Trash2 size={18} />
              <Text fontSize="sm" fontWeight="medium">
                Delete invitation
              </Text>
            </HStack>
          ) : null}
        </Stack>

        <Button bg="#2E2F6F" color="white" rounded="full" h="48px" fontWeight="medium" _hover={{ bg: "#262760" }} onClick={onClose}>
          Cancel
        </Button>
      </Stack>
    </InviteOverlay>
  );
}

/** "Send invitation" chooser — pick student vs instructor wizard. */
function SendInvitationChooser({
  canInviteInstructor,
  onPick,
  onClose,
}: {
  canInviteInstructor: boolean;
  onPick: (kind: "student" | "instructor") => void;
  onClose: () => void;
}) {
  const options = [
    {
      kind: "student" as const,
      icon: UserRound,
      title: "Invite student",
      description: "Send invite link to a new student.",
      enabled: true,
    },
    {
      kind: "instructor" as const,
      icon: UserRoundPen,
      title: "Invite instructor",
      description: "Send invite link to a new instructor.",
      enabled: canInviteInstructor,
    },
  ].filter((o) => o.enabled);

  return (
    <InviteOverlay onClose={onClose} maxW="460px">
      <Stack gap={5}>
        <Stack gap={1}>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            Send invitation
          </Text>
          <Text fontSize="sm" color="gray.500">
            Send a join link to a new instructor or student
          </Text>
        </Stack>
        <Stack gap={3}>
          {options.map((option) => (
            <Flex
              key={option.kind}
              as="button"
              onClick={() => onPick(option.kind)}
              align="center"
              gap={3.5}
              px={4}
              py={4}
              borderWidth="1px"
              borderColor="gray.200"
              rounded="xl"
              cursor="pointer"
              textAlign="left"
              _hover={{ borderColor: "gray.300", bg: "gray.50" }}
            >
              <Flex w="40px" h="40px" rounded="full" bg="gray.100" align="center" justify="center" color="#2E2F6F" flexShrink={0}>
                <option.icon size={18} />
              </Flex>
              <Stack gap={0}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                  {option.title}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {option.description}
                </Text>
              </Stack>
            </Flex>
          ))}
        </Stack>
      </Stack>
    </InviteOverlay>
  );
}

export default function InvitationsPage() {
  const { admin, loading: adminLoading } = useAdmin();

  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [tab, setTab] = useState<InvitationStatus | "all">("all");
  const [role, setRole] = useState<InvitationRole | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasAny, setHasAny] = useState(true);

  const [moreFor, setMoreFor] = useState<InvitationListItem | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "cancel" | "delete"; invitation: InvitationListItem } | null>(null);
  const [invite, setInvite] = useState<"chooser" | "student" | "instructor" | null>(null);

  // Instructors can view invitations but not cancel/delete them (403),
  // and may only invite students.
  const canManage = admin?.role !== "instructor";

  const fetchStats = useCallback(async () => {
    const result = await getInvitationStats();
    if (result.success) setStats(result.data);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const result = await listInvitations({
      status: tab,
      role: role ?? undefined,
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setInvitations(result.data.invitations);
      setTotalPages(result.data.totalPages || 1);
      if (tab === "all" && !role && !search) setHasAny(result.data.total > 0);
      else if (result.data.total > 0) setHasAny(true);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load invitations"));
      setInvitations([]);
    }
    setLoading(false);
  }, [tab, role, search, page]);

  useEffect(() => {
    const id = setTimeout(fetchStats, 0);
    return () => clearTimeout(id);
  }, [fetchStats]);

  useEffect(() => {
    const id = setTimeout(fetchList, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchList, search]);

  const refresh = () => {
    fetchStats();
    fetchList();
  };

  const doCancel = async (invitation: InvitationListItem) => {
    const result = await cancelInvitation(invitation.id);
    if (result.success) {
      setConfirm(null);
      toast.success("Invitation cancelled");
      refresh();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't cancel this invitation"));
    }
  };

  const doDelete = async (invitation: InvitationListItem) => {
    const result = await deleteInvitation(invitation.id);
    if (result.success) {
      setConfirm(null);
      toast.success("Invitation deleted");
      refresh();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't delete this invitation"));
    }
  };

  const userChip = admin
    ? { name: `${admin.firstName} ${admin.lastName}`.trim(), role: roleLabel(admin.role) }
    : undefined;

  const statCards = [
    { label: "Pending", value: stats?.pending },
    { label: "Accepted", value: stats?.accepted },
    { label: "Expired", value: stats?.expired },
    { label: "Acceptance Rate", value: stats ? `${stats.acceptanceRate}%` : undefined },
  ];

  const inviteModals = (
    <>
      {invite === "chooser" ? (
        <SendInvitationChooser
          canInviteInstructor={canManage}
          onPick={(kind) => setInvite(kind)}
          onClose={() => setInvite(null)}
        />
      ) : null}
      {invite === "student" ? (
        <InviteStudentModal
          via="invitations"
          onClose={() => setInvite(null)}
          onSent={refresh}
          viewListLabel="View invitations"
          onViewList={() => setInvite(null)}
        />
      ) : null}
      {invite === "instructor" ? (
        <InviteInstructorModal
          via="invitations"
          onClose={() => setInvite(null)}
          onSent={refresh}
          viewListLabel="View invitations"
          onViewList={() => setInvite(null)}
        />
      ) : null}
    </>
  );

  // Fully empty state: no invitations at all, no filters active.
  // Rendered via a ternary inside one return so the invite modals keep their
  // tree position — and their state — when a refetch flips this flag.
  const showEmptyState = !loading && !hasAny && tab === "all" && !role && !search;

  return (
    <Box>
      <DashboardHeader title="Invitations" loading={adminLoading} user={userChip} />

      {showEmptyState ? (
        <Flex direction="column" align="center" justify="center" py="180px" gap={3} color="gray.400">
          <Mail size={40} />
          <Stack gap={1} textAlign="center">
            <Text fontWeight="semibold" color="gray.900">
              No invitations yet
            </Text>
            <Text fontSize="sm" maxW="320px">
              You haven&apos;t sent any invitations yet. Send an invitation to get started
            </Text>
          </Stack>
          <Button bg="#2E2F6F" color="white" rounded="full" h="48px" px={6} mt={3} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setInvite("chooser")}>
            <Plus size={18} />
            Send invitation
          </Button>
        </Flex>
      ) : (
      <Box px={8} py={6}>
        {/* Stat cards */}
        <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={7}>
          {statCards.map((card) => (
            <Box key={card.label} bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={5}>
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.700">
                  {card.label}
                </Text>
                {card.value === undefined ? (
                  <Skeleton h="32px" w="60px" rounded="md" />
                ) : (
                  <Heading as="p" size="2xl" color="gray.900" fontWeight="semibold">
                    {card.value}
                  </Heading>
                )}
              </Stack>
            </Box>
          ))}
        </Grid>

        {/* Tabs */}
        <HStack gap={6} borderBottomWidth="1px" borderColor="gray.200" mb={5}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <HStack
                key={t.value}
                as="button"
                gap={2}
                pb={3}
                cursor="pointer"
                borderBottomWidth="2px"
                borderColor={active ? "#2E2F6F" : "transparent"}
                mb="-1px"
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
              >
                <Text fontSize="sm" fontWeight={active ? "semibold" : "medium"} color={active ? "gray.900" : "gray.500"}>
                  {t.label}
                </Text>
                {t.value === "all" && stats ? (
                  <Flex px={2} py={0.5} rounded="full" bg={active ? "#2E2F6F" : "gray.100"} color={active ? "white" : "gray.600"} fontSize="xs" fontWeight="semibold" align="center">
                    {stats.total}
                  </Flex>
                ) : null}
              </HStack>
            );
          })}
        </HStack>

        {/* Search + role filter + new invitation */}
        <Flex justify="space-between" align="center" mb={6} gap={3} wrap="wrap">
          <HStack gap={3}>
            <Box position="relative" w="320px">
              <Box position="absolute" top="50%" left="14px" transform="translateY(-50%)" color="gray.400" zIndex={1}>
                <Search size={18} />
              </Box>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email"
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
            <Box position="relative">
              <Flex as="button" onClick={() => setRoleOpen((o) => !o)} align="center" gap={3} h="48px" px={4} borderWidth="1px" borderColor="gray.200" rounded="lg" bg="white" cursor="pointer">
                <Text fontSize="sm" color="gray.900">
                  {ROLE_FILTERS.find((r) => r.value === role)?.label}
                </Text>
                <ChevronDown size={16} color="#9CA3AF" />
              </Flex>
              {roleOpen ? (
                <Box position="absolute" top="52px" left={0} w="180px" bg="white" borderWidth="1px" borderColor="gray.200" rounded="lg" boxShadow="lg" zIndex={20} overflow="hidden">
                  {ROLE_FILTERS.map((option) => {
                    const selected = option.value === role;
                    return (
                      <Flex
                        key={option.label}
                        as="button"
                        w="full"
                        px={4}
                        py={2.5}
                        align="center"
                        justify="space-between"
                        cursor="pointer"
                        bg={selected ? "gray.50" : "white"}
                        _hover={{ bg: "gray.50" }}
                        onClick={() => {
                          setRole(option.value);
                          setPage(1);
                          setRoleOpen(false);
                        }}
                      >
                        <Text fontSize="sm" color="gray.800">
                          {option.label}
                        </Text>
                        {selected ? <Check size={15} color="#6366F1" /> : null}
                      </Flex>
                    );
                  })}
                </Box>
              ) : null}
            </Box>
          </HStack>
          <Button bg="#2E2F6F" color="white" rounded="full" h="48px" px={6} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setInvite("chooser")}>
            <Plus size={18} />
            New invitation
          </Button>
        </Flex>

        {/* Table */}
        <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
          <Grid templateColumns={COLS} gap={4} px={5} py={3.5} bg="gray.50" roundedTop="xl">
            {["Name", "Email", "Role", "Status", "Invitation Date", "Joined", "Actions"].map((h) => (
              <Text key={h} fontSize="sm" color="gray.500">
                {h}
              </Text>
            ))}
          </Grid>
          {loading ? (
            [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
          ) : invitations.length === 0 ? (
            <Flex direction="column" align="center" justify="center" py="80px" gap={2} color="gray.400">
              <Mail size={32} />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                No invitations found
              </Text>
              <Text fontSize="sm">Try a different search or filter</Text>
            </Flex>
          ) : (
            invitations.map((invitation) => (
              <Grid key={invitation.id} templateColumns={COLS} gap={4} px={5} py={4} alignItems="center" borderTopWidth="1px" borderColor="gray.100">
                <HStack gap={3}>
                  <Avatar name={invitation.name || invitation.email} initials={invitation.initials} size={32} />
                  <Text fontSize="sm" fontWeight="medium" color="gray.900">
                    {invitation.name || "—"}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.700" truncate>
                  {invitation.email}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {capitalize(invitation.role)}
                </Text>
                <InvitationStatusPill status={invitation.status} />
                <Text fontSize="sm" color="gray.700">
                  {formatDateShort(invitation.invitationDate)}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {formatDateShort(invitation.joinedAt)}
                </Text>
                <Box as="button" onClick={() => setMoreFor(invitation)} color="gray.500" cursor="pointer" w="fit-content" px={2} py={1} rounded="md" _hover={{ bg: "gray.50", color: "gray.700" }}>
                  <EllipsisVertical size={18} />
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

      {/* Modals */}
      {moreFor ? (
        <MoreActionsModal
          invitation={moreFor}
          canManage={canManage}
          onCancelInvite={() => {
            setConfirm({ kind: "cancel", invitation: moreFor });
            setMoreFor(null);
          }}
          onDeleteInvite={() => {
            setConfirm({ kind: "delete", invitation: moreFor });
            setMoreFor(null);
          }}
          onClose={() => setMoreFor(null)}
        />
      ) : null}
      {confirm?.kind === "cancel" ? (
        <ConfirmModal
          tone="warning"
          title="Cancel invitation?"
          body={
            <>
              Are you sure you want to cancel this invitation?{" "}
              <Text as="span" fontWeight="semibold" color="gray.900">
                {confirm.invitation.name || confirm.invitation.email}
              </Text>{" "}
              will no longer be able to accept
            </>
          }
          confirmLabel="Cancel invitation"
          onConfirm={() => doCancel(confirm.invitation)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm?.kind === "delete" ? (
        <ConfirmModal
          tone="danger"
          title="Delete invitation?"
          body={
            <>
              Are you sure you want to permanently remove the invitation for{" "}
              <Text as="span" fontWeight="semibold" color="gray.900">
                {confirm.invitation.email}
              </Text>
              ? This can&apos;t be undone.
            </>
          }
          confirmLabel="Delete invitation"
          onConfirm={() => doDelete(confirm.invitation)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {inviteModals}
    </Box>
  );
}
