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
import { Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  PermissionChecklist,
  PermissionChecklistSkeleton,
  PermissionCountHeading,
} from "@/components/settings/permission-checklist";
import { RoleEditorShell } from "@/components/settings/role-editor-shell";
import { SettingsModal } from "@/components/settings/settings-modal";
import { Avatar } from "@/components/shared/avatar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type Permission,
  type PermissionGroup,
  type RoleDetail,
  deleteRole,
  getPermissionCatalog,
  getRole,
  updateRole,
} from "@/lib/api/settings";
import { formatDateShort } from "@/lib/format";
import { useAdmin } from "@/lib/hooks/use-admin";
import { settingsPaths } from "@/lib/routes";

function sameSet(a: Set<Permission>, b: Set<Permission>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function RoleDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleId = searchParams.get("roleId");
  const { admin, loading: adminLoading } = useAdmin();

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  // Nothing to fetch without a roleId, so don't start in a loading state.
  const [loading, setLoading] = useState(Boolean(roleId));

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<Permission>>(new Set());
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = useCallback(
    () => router.push(settingsPaths.tab("roles")),
    [router],
  );

  useEffect(() => {
    if (!roleId) return;
    let cancelled = false;
    Promise.all([getRole(roleId), getPermissionCatalog()]).then(
      ([roleResult, catalogResult]) => {
        if (cancelled) return;
        if (roleResult.success) {
          setRole(roleResult.data);
          setName(roleResult.data.name);
          setSelected(new Set(roleResult.data.permissions));
        } else {
          toast.error(getApiErrorMessage(roleResult, "Couldn't load this role"));
        }
        if (catalogResult.success) {
          setGroups(catalogResult.data.groups);
          setCatalogTotal(catalogResult.data.total);
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  /**
   * The Super Admin role always holds every permission — the API rejects any
   * attempt to narrow it. `RoleDetail` doesn't expose the role's `kind`, so
   * identify it as the built-in role holding the whole catalog. The API stays
   * the source of truth: a rejected save still surfaces its message.
   */
  const permissionsLocked = Boolean(
    role?.isSystem && catalogTotal > 0 && role.permissions.length === catalogTotal,
  );

  const toggle = (permission: Permission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const dirty =
    role !== null &&
    (name.trim() !== role.name ||
      !sameSet(selected, new Set(role.permissions)));

  const save = async () => {
    if (!role || !dirty || saving) return;
    if (!name.trim()) {
      toast.error("Give the role a name");
      return;
    }
    setSaving(true);
    const result = await updateRole(role.id, {
      ...(name.trim() !== role.name ? { name: name.trim() } : {}),
      // Sending permissions for the Super Admin role would 400 — and its
      // checkboxes are read-only anyway, so there is nothing to send.
      ...(permissionsLocked ? {} : { permissions: [...selected] }),
    });
    if (result.success) {
      setRole(result.data);
      setName(result.data.name);
      setSelected(new Set(result.data.permissions));
      toast.success("Changes saved");
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't save this role"));
    }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!role) return;
    const result = await deleteRole(role.id);
    if (result.success) {
      setConfirmDelete(false);
      toast.success("Role deleted");
      back();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't delete this role"));
    }
  };

  const userChip = admin
    ? {
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        role: roleLabel(admin.role),
      }
    : undefined;

  if (!roleId) {
    return (
      <Box>
        <DashboardHeader
          title="Settings"
          loading={adminLoading}
          user={userChip}
        />
        <Flex direction="column" align="center" py="160px" gap={3}>
          <Text color="gray.600">No role selected.</Text>
          <Button variant="outline" rounded="full" onClick={back}>
            Back to Roles &amp; Permissions
          </Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHeader
        title="Settings"
        loading={adminLoading}
        user={userChip}
      />

      <RoleEditorShell
        current={role?.name ?? "Role"}
        onBack={back}
        title={
          loading ? (
            <Skeleton h="30px" w="180px" rounded="md" />
          ) : (
            <HStack gap={3}>
              <Text fontSize="3xl" fontWeight="bold" color="gray.900">
                {name || role?.name}
              </Text>
              <Box
                as="button"
                onClick={() => {
                  setNameDraft(name);
                  setRenaming(true);
                }}
                color="gray.400"
                cursor="pointer"
                display="flex"
                _hover={{ color: "#2E2F6F" }}
                aria-label="Rename role"
              >
                <Pencil size={17} />
              </Box>
            </HStack>
          )
        }
        subtitle={
          loading ? (
            <Skeleton h="14px" w="150px" rounded="md" />
          ) : (
            <Text fontSize="sm" color="gray.500">
              Updated {formatDateShort(role?.lastUpdated)}
            </Text>
          )
        }
        footerLeft={
          role && !role.isSystem ? (
            <Box
              as="button"
              onClick={() => setConfirmDelete(true)}
              fontSize="sm"
              fontWeight="medium"
              color="#DC2626"
              cursor="pointer"
              _hover={{ color: "#B91C1C" }}
            >
              Delete role
            </Box>
          ) : null
        }
        footerRight={
          <>
            <Button
              variant="outline"
              rounded="full"
              h="48px"
              px={8}
              fontWeight="medium"
              disabled={saving}
              onClick={back}
            >
              Cancel
            </Button>
            <Button
              rounded="full"
              h="48px"
              px={8}
              fontWeight="medium"
              bg={dirty ? "#2E2F6F" : "#E5E7EB"}
              color={dirty ? "white" : "#9CA3AF"}
              _hover={dirty ? { bg: "#262760" } : { bg: "#E5E7EB" }}
              cursor={dirty ? "pointer" : "not-allowed"}
              loading={saving}
              disabled={!dirty || saving}
              onClick={save}
            >
              Save changes
            </Button>
          </>
        }
      >
        <Stack gap={10}>
          {/* ---------- Active admins ---------- */}
          <Stack gap={4}>
            <Text fontSize="xl" fontWeight="bold" color="gray.900">
              Active admins
            </Text>

            {loading ? (
              <HStack gap={5}>
                {[...Array(3)].map((_, i) => (
                  <HStack key={i} gap={2}>
                    <Skeleton w="28px" h="28px" rounded="full" />
                    <Skeleton h="14px" w="90px" rounded="md" />
                  </HStack>
                ))}
              </HStack>
            ) : role && role.activeAdmins.length > 0 ? (
              <Flex gap={5} wrap="wrap">
                {role.activeAdmins.map((entry) => (
                  <HStack key={entry.id} gap={2.5}>
                    <Avatar
                      name={entry.name}
                      src={entry.avatarUrl}
                      initials={entry.initials}
                      size={30}
                    />
                    <Text fontSize="sm" color="gray.800">
                      {entry.isYou ? (
                        <Text as="span" fontWeight="semibold" color="gray.900">
                          (You){" "}
                        </Text>
                      ) : null}
                      {entry.name}
                    </Text>
                  </HStack>
                ))}
              </Flex>
            ) : (
              <Text fontSize="sm" color="gray.600">
                There are no active admins for this role. Add and remove active
                admins for this role in the{" "}
                <Text
                  as="button"
                  color="#F97461"
                  fontWeight="medium"
                  cursor="pointer"
                  textDecoration="underline"
                  onClick={() => router.push(settingsPaths.tab("admins"))}
                >
                  admin management
                </Text>{" "}
                page.
              </Text>
            )}
          </Stack>

          {/* ---------- Permissions ---------- */}
          <Stack gap={7}>
            <PermissionCountHeading count={selected.size} />
            {permissionsLocked ? (
              <Text fontSize="sm" color="gray.500" mt={-4}>
                The Super Admin role always holds every permission and can&apos;t
                be narrowed.
              </Text>
            ) : null}
            {loading ? (
              <PermissionChecklistSkeleton />
            ) : (
              <PermissionChecklist
                groups={groups}
                selected={selected}
                onToggle={permissionsLocked ? undefined : toggle}
                disabled={permissionsLocked}
              />
            )}
          </Stack>
        </Stack>
      </RoleEditorShell>

      {renaming ? (
        <SettingsModal
          title="Edit Role Name"
          saveDisabled={!nameDraft.trim()}
          onSave={() => {
            setName(nameDraft.trim());
            setRenaming(false);
          }}
          onClose={() => setRenaming(false)}
        >
          <Box>
            <Text fontSize="sm" color="gray.700" mb={2}>
              Role Name
            </Text>
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Enter role name"
              maxLength={60}
              h="48px"
              fontSize="sm"
              borderColor="gray.200"
              rounded="lg"
              _placeholder={{ color: "gray.400" }}
              _focus={{
                borderColor: "#2E2F6F",
                outline: "none",
                boxShadow: "none",
              }}
            />
          </Box>
        </SettingsModal>
      ) : null}

      {confirmDelete && role ? (
        <ConfirmModal
          tone="danger"
          title="Delete role?"
          body={
            <>
              Are you sure you want to delete{" "}
              <Text as="span" fontWeight="semibold" color="gray.900">
                {role.name}
              </Text>
              ? This action cannot be undone
            </>
          }
          confirmLabel="Delete role"
          onConfirm={doDelete}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </Box>
  );
}

export default function RoleDetailsPage() {
  return (
    <Suspense>
      <RoleDetailContent />
    </Suspense>
  );
}
