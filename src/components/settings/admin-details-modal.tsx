"use client";

import { Box, Button, Flex, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InviteOverlay } from "@/components/invitations/invite-shell";
import { Avatar } from "@/components/shared/avatar";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type AdminDetail,
  type AdminListItem,
  getAdmin,
} from "@/lib/api/settings";
import { formatDateShort } from "@/lib/format";
import { AdminStatusPill } from "./admin-status-pill";

/**
 * The "Details" modal: who the admin is, and the permissions their named role
 * resolves to — exactly the set the backend guards enforce.
 */
export function AdminDetailsModal({
  admin,
  onClose,
  onToggleStatus,
  onChangeRole,
  onOpenRoleSettings,
}: {
  /** The list row, shown immediately while the full detail loads. */
  admin: AdminListItem;
  onClose: () => void;
  onToggleStatus: (admin: AdminListItem) => void;
  onChangeRole: (admin: AdminListItem) => void;
  onOpenRoleSettings: (roleId: string | null) => void;
}) {
  const [detail, setDetail] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAdmin(admin.id).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setDetail(result.data);
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't load this admin"));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [admin.id]);

  const status = detail?.status ?? admin.status;
  const deactivating = status === "active";

  return (
    <InviteOverlay onClose={onClose} maxW="460px">
      <Stack gap={5}>
        <Text fontSize="lg" fontWeight="bold" color="gray.900">
          Details
        </Text>

        <HStack gap={3.5} align="flex-start">
          <Avatar
            name={admin.name}
            src={admin.avatarUrl}
            initials={admin.initials}
            size={46}
          />
          <Stack gap={1} minW={0}>
            <HStack gap={2.5}>
              <Text fontWeight="semibold" color="gray.900">
                {admin.name}
              </Text>
              <AdminStatusPill status={status} />
            </HStack>
            <Text fontSize="sm" color="gray.500">
              {admin.email} &middot; Joined {formatDateShort(admin.joinedAt)}
            </Text>
          </Stack>
        </HStack>

        <Stack gap={3}>
          <Stack gap={0.5}>
            <HStack gap={2.5}>
              <Text fontWeight="semibold" color="gray.900">
                Permissions
              </Text>
              <Flex
                minW="20px"
                h="20px"
                px={1.5}
                rounded="6px"
                bg="#E36A5C"
                color="white"
                fontSize="xs"
                fontWeight="semibold"
                align="center"
                justify="center"
              >
                {loading ? "—" : (detail?.permissionCount ?? 0)}
              </Flex>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Based on {detail?.roleName ?? admin.roleName} role
              {/* Your own role is off-limits here — the API refuses it too. */}
              {admin.isYou ? null : (
                <>
                  {" "}
                  <Text
                    as="button"
                    color="#F97461"
                    fontWeight="medium"
                    textDecoration="underline"
                    cursor="pointer"
                    onClick={() => onChangeRole(admin)}
                  >
                    Change role
                  </Text>
                </>
              )}
            </Text>
          </Stack>

          {loading ? (
            <Stack gap={2}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} h="14px" w="180px" rounded="md" />
              ))}
            </Stack>
          ) : detail && detail.permissions.length > 0 ? (
            <Stack gap={2} maxH="220px" overflowY="auto">
              {detail.permissions.map((permission) => (
                <HStack key={permission.key} gap={3}>
                  <Box color="gray.500" display="flex" flexShrink={0}>
                    <Check size={15} strokeWidth={2.5} />
                  </Box>
                  <Text fontSize="sm" color="gray.800">
                    {permission.label}
                  </Text>
                </HStack>
              ))}
            </Stack>
          ) : (
            <Text fontSize="sm" color="gray.500">
              This role holds no permissions yet.
            </Text>
          )}
        </Stack>

        <Box bg="gray.50" borderWidth="1px" borderColor="gray.100" rounded="lg" px={4} py={3}>
          <Text fontSize="sm" color="gray.600">
            Manage permissions applied to roles in the{" "}
            <Text
              as="button"
              color="#F97461"
              fontWeight="medium"
              textDecoration="underline"
              cursor="pointer"
              onClick={() => onOpenRoleSettings(admin.roleId)}
            >
              role settings
            </Text>{" "}
            page.
          </Text>
        </Box>

        <Stack gap={3}>
          {/* You can't deactivate your own account — the API refuses it too. */}
          {admin.isYou ? null : (
            <Button
              bg="#2E2F6F"
              color="white"
              rounded="full"
              h="48px"
              fontWeight="medium"
              _hover={{ bg: "#262760" }}
              onClick={() => onToggleStatus(admin)}
            >
              {deactivating ? "Deactivate" : "Reactivate"}
            </Button>
          )}
          <Button
            variant="outline"
            rounded="full"
            h="48px"
            fontWeight="medium"
            onClick={onClose}
          >
            Close
          </Button>
        </Stack>
      </Stack>
    </InviteOverlay>
  );
}
