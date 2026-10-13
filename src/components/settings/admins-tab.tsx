"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Input,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/shared/avatar";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type AdminListItem,
  deactivateAdmin,
  listAdmins,
  reactivateAdmin,
} from "@/lib/api/settings";
import { settingsPaths } from "@/lib/routes";
import { AdminDetailsModal } from "./admin-details-modal";
import { AdminStatusModal } from "./admin-status-modal";
import { AdminStatusPill } from "./admin-status-pill";
import { ChangeRoleModal } from "./change-role-modal";
import { InviteAdminModal } from "./invite-admin-modal";

const COLS = "1.3fr 1.5fr 0.9fr 0.8fr 0.9fr";
const PAGE_SIZE = 10;

function RowSkeleton() {
  return (
    <Grid
      templateColumns={COLS}
      gap={4}
      px={5}
      py={4}
      alignItems="center"
      borderTopWidth="1px"
      borderColor="gray.100"
    >
      <HStack gap={3}>
        <Skeleton w="32px" h="32px" rounded="full" />
        <Skeleton h="14px" w="60%" rounded="md" />
      </HStack>
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} h="14px" w="70%" rounded="md" />
      ))}
      <Skeleton h="34px" w="100px" rounded="md" />
    </Grid>
  );
}

export function AdminsTab() {
  const router = useRouter();

  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [detailsFor, setDetailsFor] = useState<AdminListItem | null>(null);
  const [statusFor, setStatusFor] = useState<AdminListItem | null>(null);
  const [roleFor, setRoleFor] = useState<AdminListItem | null>(null);
  const [inviting, setInviting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const result = await listAdmins({
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setAdmins(result.data.admins);
      setTotalPages(result.data.totalPages || 1);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load admins"));
      setAdmins([]);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    // Debounce only while typing — page/filter changes should feel immediate.
    const id = setTimeout(fetchAdmins, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchAdmins, search]);

  const toggleStatus = async (admin: AdminListItem) => {
    const result =
      admin.status === "active"
        ? await deactivateAdmin(admin.id)
        : await reactivateAdmin(admin.id);

    if (result.success) {
      setStatusFor(null);
      setDetailsFor(null);
      toast.success(
        admin.status === "active" ? "Admin deactivated" : "Admin reactivated",
      );
      fetchAdmins();
    } else {
      // Covers "you cannot deactivate your own account" and the
      // last-active-Super-Admin guard.
      toast.error(getApiErrorMessage(result, "Couldn't update this admin"));
    }
  };

  return (
    <Box>
      <Stack gap={2} mb={7}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.900">
          Admin Management
        </Text>
        <Text fontSize="sm" color="gray.500">
          Manage administrator accounts.
        </Text>
      </Stack>

      <Flex justify="space-between" align="center" gap={4} mb={6} wrap="wrap">
        <Box position="relative" w="320px">
          <Box
            position="absolute"
            top="50%"
            left="14px"
            transform="translateY(-50%)"
            color="gray.400"
            zIndex={1}
          >
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

        <Button
          bg="#2E2F6F"
          color="white"
          rounded="full"
          h="48px"
          px={6}
          fontWeight="medium"
          _hover={{ bg: "#262760" }}
          onClick={() => setInviting(true)}
        >
          <Plus size={18} />
          New admin
        </Button>
      </Flex>

      <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
        <Grid
          templateColumns={COLS}
          gap={4}
          px={5}
          py={3.5}
          bg="#F6F7F9"
          roundedTop="xl"
        >
          {["Name", "Email", "Role", "Status", "Actions"].map((h) => (
            <Text key={h} fontSize="sm" color="#667085">
              {h}
            </Text>
          ))}
        </Grid>

        {loading ? (
          [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
        ) : admins.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            py="80px"
            gap={2}
            color="gray.400"
          >
            <Users size={32} />
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              No admins found
            </Text>
            <Text fontSize="sm">
              {search ? "Try a different search" : "Invite an admin to get started"}
            </Text>
          </Flex>
        ) : (
          admins.map((admin) => (
            <Grid
              key={admin.id}
              templateColumns={COLS}
              gap={4}
              px={5}
              py={4}
              alignItems="center"
              borderTopWidth="1px"
              borderColor="gray.100"
            >
              <HStack
                as="button"
                gap={3}
                minW={0}
                cursor="pointer"
                textAlign="left"
                onClick={() => setDetailsFor(admin)}
                _hover={{ "& p": { color: "#2E2F6F" } }}
              >
                <Avatar
                  name={admin.name}
                  src={admin.avatarUrl}
                  initials={admin.initials}
                  size={32}
                />
                <Text fontSize="sm" fontWeight="medium" color="gray.900" truncate>
                  {admin.isYou ? "(You) " : ""}
                  {admin.name}
                </Text>
              </HStack>

              <Text fontSize="sm" color="gray.700" truncate>
                {admin.email}
              </Text>
              <Text fontSize="sm" color="gray.700" truncate>
                {admin.roleName}
              </Text>
              <AdminStatusPill status={admin.status} />

              {/* No self-service deactivation — the API rejects it anyway. */}
              {admin.isYou ? (
                <Text fontSize="sm" color="gray.400">
                  —
                </Text>
              ) : (
                <Box
                  as="button"
                  onClick={() => setStatusFor(admin)}
                  px={4}
                  py={2}
                  w="fit-content"
                  rounded="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                  bg="white"
                  fontSize="sm"
                  fontWeight="medium"
                  color="#344054"
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                >
                  {admin.status === "active" ? "Deactivate" : "Reactivate"}
                </Box>
              )}
            </Grid>
          ))
        )}

        <Flex
          justify="space-between"
          align="center"
          px={5}
          py={4}
          borderTopWidth="1px"
          borderColor="gray.100"
        >
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
              onClick={
                page >= totalPages
                  ? undefined
                  : () => setPage((p) => Math.min(totalPages, p + 1))
              }
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

      {/* ---------------- Modals ---------------- */}
      {detailsFor ? (
        <AdminDetailsModal
          admin={detailsFor}
          onClose={() => setDetailsFor(null)}
          onToggleStatus={(admin) => {
            setDetailsFor(null);
            setStatusFor(admin);
          }}
          onChangeRole={(admin) => {
            setDetailsFor(null);
            setRoleFor(admin);
          }}
          onOpenRoleSettings={(roleId) =>
            router.push(
              roleId ? settingsPaths.roleDetail(roleId) : settingsPaths.tab("roles"),
            )
          }
        />
      ) : null}

      {statusFor ? (
        <AdminStatusModal
          admin={statusFor}
          onConfirm={() => toggleStatus(statusFor)}
          onClose={() => setStatusFor(null)}
        />
      ) : null}

      {/* Opened from Details, so both ways out lead back there — with the
          new role's permissions once one has been applied. */}
      {roleFor ? (
        <ChangeRoleModal
          admin={roleFor}
          onClose={() => {
            setRoleFor(null);
            setDetailsFor(roleFor);
          }}
          onChanged={(updated) => {
            setRoleFor(null);
            setDetailsFor(updated);
            fetchAdmins();
          }}
        />
      ) : null}

      {inviting ? (
        <InviteAdminModal
          onClose={() => setInviting(false)}
          onSent={fetchAdmins}
        />
      ) : null}
    </Box>
  );
}
