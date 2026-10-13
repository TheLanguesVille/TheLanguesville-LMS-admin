"use client";

import { Box, Button, Flex, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InviteOverlay } from "@/components/invitations/invite-shell";
import { Avatar } from "@/components/shared/avatar";
import { isSuperAdmin } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type AdminDetail,
  type AdminListItem,
  type RoleListItem,
  changeAdminRole,
  listRoles,
} from "@/lib/api/settings";
import { useAdmin } from "@/lib/hooks/use-admin";
import { AdminStatusPill } from "./admin-status-pill";

/** The round marker on the right of each option — green tick when picked. */
function RadioMark({ selected }: { selected: boolean }) {
  return selected ? (
    <Flex
      w="18px"
      h="18px"
      rounded="full"
      bg="#039855"
      color="white"
      align="center"
      justify="center"
      flexShrink={0}
    >
      <Check size={11} strokeWidth={3.5} />
    </Flex>
  ) : (
    <Box
      w="18px"
      h="18px"
      rounded="full"
      borderWidth="1.5px"
      borderColor="gray.300"
      flexShrink={0}
    />
  );
}

/**
 * "Change role": moves an admin onto another named role. Their permissions
 * follow the role, so there's nothing else to pick — the summary line under
 * each option is what they'll be able to do once it's applied.
 */
export function ChangeRoleModal({
  admin,
  onClose,
  onChanged,
}: {
  admin: AdminListItem;
  onClose: () => void;
  /** Called with the updated admin once the API has applied the new role. */
  onChanged: (updated: AdminDetail) => void;
}) {
  const { admin: viewer } = useAdmin();
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(admin.roleId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listRoles().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setRoles(result.data.roles);
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't load roles"));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Only a superadmin can hand out the Super Admin role — the API refuses
  // anyone else, so don't offer it. Their current role always stays visible
  // so the starting selection makes sense.
  const viewerIsSuperAdmin = isSuperAdmin(viewer);
  const options = roles.filter(
    (role) =>
      viewerIsSuperAdmin || role.kind !== "superadmin" || role.id === admin.roleId,
  );

  const canApply = Boolean(selected) && selected !== admin.roleId && !saving;

  const apply = async () => {
    if (!selected || !canApply) return;
    setSaving(true);
    const result = await changeAdminRole(admin.id, selected);
    setSaving(false);
    if (result.success) {
      toast.success(`${admin.name} is now ${result.data.roleName}`);
      onChanged(result.data);
    } else {
      // Covers changing your own role, Super Admin targets, and demoting the
      // last superadmin.
      toast.error(getApiErrorMessage(result, "Couldn't change this admin's role"));
    }
  };

  return (
    <InviteOverlay onClose={saving ? undefined : onClose} maxW="460px">
      <Stack gap={6}>
        <Stack gap={1}>
          <Text fontSize="lg" fontWeight="bold" color="gray.900">
            Change role
          </Text>
          <Text fontSize="sm" color="gray.500">
            Pick a role. Permissions will update to match applied role
          </Text>
        </Stack>

        <HStack
          gap={3}
          px={4}
          py={3.5}
          bg="gray.50"
          borderWidth="1px"
          borderColor="gray.100"
          rounded="lg"
        >
          <Avatar
            name={admin.name}
            src={admin.avatarUrl}
            initials={admin.initials}
            size={44}
          />
          <Stack gap={0.5} minW={0} flex="1">
            <Text fontWeight="semibold" color="gray.900" truncate>
              {admin.name}
            </Text>
            <Text fontSize="sm" color="gray.600" truncate>
              {admin.email}
            </Text>
          </Stack>
          <AdminStatusPill status={admin.status} />
        </HStack>

        <Stack gap={3} maxH="320px" overflowY="auto">
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} h="76px" rounded="lg" />)
          ) : options.length === 0 ? (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={6}>
              No roles to choose from yet.
            </Text>
          ) : (
            options.map((role) => {
              const isSelected = role.id === selected;
              return (
                <HStack
                  key={role.id}
                  as="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={saving ? undefined : () => setSelected(role.id)}
                  gap={4}
                  px={4}
                  py={3.5}
                  borderWidth="1px"
                  borderColor="gray.200"
                  rounded="lg"
                  bg="white"
                  textAlign="left"
                  cursor={saving ? "default" : "pointer"}
                  _hover={{ bg: "gray.50" }}
                >
                  <Stack gap={0.5} minW={0} flex="1">
                    <Text fontWeight="medium" color="gray.900" truncate>
                      {role.name}
                    </Text>
                    <Text fontSize="sm" color="gray.600" truncate>
                      {role.permissionLabels.length > 0
                        ? role.permissionLabels.join(", ")
                        : "No permissions yet"}
                    </Text>
                  </Stack>
                  <RadioMark selected={isSelected} />
                </HStack>
              );
            })
          )}
        </Stack>

        <Stack gap={4}>
          <Button
            bg="#2E2F6F"
            color="white"
            rounded="full"
            h="48px"
            fontWeight="medium"
            _hover={{ bg: "#262760" }}
            _disabled={{
              bg: "#E5E7EB",
              color: "#9CA3AF",
              cursor: "not-allowed",
              _hover: { bg: "#E5E7EB" },
            }}
            loading={saving}
            disabled={!canApply}
            onClick={apply}
          >
            Apply role
          </Button>
          <Button
            variant="outline"
            rounded="full"
            h="48px"
            fontWeight="medium"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </InviteOverlay>
  );
}
