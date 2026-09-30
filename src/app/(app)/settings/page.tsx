"use client";

import { Box, HStack, Skeleton, Text } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AdminsTab } from "@/components/settings/admins-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { ProfileTab } from "@/components/settings/profile-tab";
import { RolesTab } from "@/components/settings/roles-tab";
import { roleLabel } from "@/lib/api/auth";
import type { Permission } from "@/lib/api/settings";
import { useAdmin } from "@/lib/hooks/use-admin";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { settingsPaths } from "@/lib/routes";

type Tab = "profile" | "roles" | "admins" | "notifications";

/**
 * The two management tabs are gated on the permissions the signed-in admin
 * actually holds — not on their coarse account role, which no longer tells the
 * whole story once custom roles exist. Their endpoints 403 without these.
 */
const TABS: Array<{ value: Tab; label: string; requires?: Permission }> = [
  { value: "profile", label: "Profile" },
  {
    value: "roles",
    label: "Roles & Permissions",
    requires: "settings.manage_roles",
  },
  {
    value: "admins",
    label: "Admin Management",
    requires: "settings.manage_admins",
  },
  { value: "notifications", label: "Notifications" },
];

function isTab(value: string | null): value is Tab {
  return (
    value === "profile" ||
    value === "roles" ||
    value === "admins" ||
    value === "notifications"
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin, loading: adminLoading } = useAdmin();
  const { has, loading: permissionsLoading } = usePermissions();

  // The URL is the source of truth for the active tab, so the role screens can
  // link back into a specific tab and Back/Forward behave.
  const requested = searchParams.get("tab");
  const tab: Tab = isTab(requested) ? requested : "profile";

  const visibleTabs = TABS.filter(
    (entry) => !entry.requires || has(entry.requires),
  );

  // A deep link to a tab this admin can't see (or lost access to) falls back
  // to Profile rather than rendering a tab that would only 403.
  const activeTab = visibleTabs.some((entry) => entry.value === tab)
    ? tab
    : "profile";

  const select = (next: Tab) =>
    router.replace(settingsPaths.tab(next), { scroll: false });

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

      <Box px={8} py={6}>
        <Box borderBottomWidth="1px" borderColor="gray.200" mb={10}>
          {permissionsLoading ? (
            <HStack gap={8} pb={3}>
              {[80, 150, 140, 100].map((w) => (
                <Skeleton key={w} h="16px" w={`${w}px`} rounded="md" />
              ))}
            </HStack>
          ) : (
            <HStack gap={8}>
              {visibleTabs.map((entry) => {
                const active = activeTab === entry.value;
                return (
                  <Box
                    key={entry.value}
                    as="button"
                    onClick={() => select(entry.value)}
                    pb={3}
                    mb="-1px"
                    borderBottomWidth="2px"
                    borderColor={active ? "#2E2F6F" : "transparent"}
                    cursor="pointer"
                  >
                    <Text
                      fontSize="sm"
                      fontWeight={active ? "semibold" : "medium"}
                      color={active ? "#2E2F6F" : "gray.500"}
                      whiteSpace="nowrap"
                    >
                      {entry.label}
                    </Text>
                  </Box>
                );
              })}
            </HStack>
          )}
        </Box>

        {/* Wait for the gate before mounting a tab, so a gated tab never
            fires its requests only to 403. */}
        {permissionsLoading ? null : (
          <>
            {activeTab === "profile" ? <ProfileTab /> : null}
            {activeTab === "roles" ? <RolesTab /> : null}
            {activeTab === "admins" ? <AdminsTab /> : null}
            {activeTab === "notifications" ? <NotificationsTab /> : null}
          </>
        )}
      </Box>
    </Box>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
