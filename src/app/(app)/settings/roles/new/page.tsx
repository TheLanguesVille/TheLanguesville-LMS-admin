"use client";

import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  PermissionChecklist,
  PermissionChecklistSkeleton,
  PermissionCountHeading,
} from "@/components/settings/permission-checklist";
import { RoleEditorShell } from "@/components/settings/role-editor-shell";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type Permission,
  type PermissionGroup,
  createRole,
  getPermissionCatalog,
} from "@/lib/api/settings";
import { useAdmin } from "@/lib/hooks/use-admin";
import { settingsPaths } from "@/lib/routes";

export default function NewRolePage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<Permission>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPermissionCatalog().then((result) => {
      if (result.success) {
        setGroups(result.data.groups);
      } else {
        toast.error(
          getApiErrorMessage(result, "Couldn't load the permission list"),
        );
      }
      setLoadingCatalog(false);
    });
  }, []);

  const toggle = (permission: Permission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  const back = () => router.push(settingsPaths.tab("roles"));

  const submit = async () => {
    if (saving) return;
    if (!name.trim()) {
      toast.error("Give the role a name");
      return;
    }
    setSaving(true);
    // An empty permission set is allowed — boxes can be ticked later on the
    // role detail page.
    const result = await createRole({
      name: name.trim(),
      permissions: [...selected],
    });
    if (result.success) {
      toast.success(`"${result.data.name}" created`);
      router.push(settingsPaths.roleDetail(result.data.id));
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't create this role"));
      setSaving(false);
    }
  };

  return (
    <Box>
      <DashboardHeader
        title="Settings"
        loading={adminLoading}
        user={
          admin
            ? {
                name: `${admin.firstName} ${admin.lastName}`.trim(),
                role: roleLabel(admin.role),
              }
            : undefined
        }
      />

      <RoleEditorShell
        current="New role"
        onBack={back}
        title={
          <Text fontSize="3xl" fontWeight="bold" color="gray.900">
            Add new role
          </Text>
        }
        subtitle={
          <Text fontSize="sm" color="gray.500">
            New roles are immediately available for all admins.
          </Text>
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
              bg="#2E2F6F"
              color="white"
              rounded="full"
              h="48px"
              px={8}
              fontWeight="medium"
              _hover={{ bg: "#262760" }}
              _disabled={{
                bg: "#E5E7EB",
                color: "#9CA3AF",
                cursor: "not-allowed",
                _hover: { bg: "#E5E7EB" },
              }}
              loading={saving}
              disabled={saving || !name.trim()}
              onClick={submit}
            >
              Create role
            </Button>
          </>
        }
      >
        <Stack gap={10}>
          <Box maxW="100%">
            <Text fontSize="sm" color="gray.700" mb={2}>
              Role Name
            </Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter role name"
              maxLength={60}
              h="52px"
              fontSize="sm"
              bg="white"
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

          <Stack gap={7}>
            <PermissionCountHeading count={selected.size} />
            {loadingCatalog ? (
              <PermissionChecklistSkeleton />
            ) : (
              <PermissionChecklist
                groups={groups}
                selected={selected}
                onToggle={toggle}
              />
            )}
          </Stack>
        </Stack>
      </RoleEditorShell>
    </Box>
  );
}
