"use client";

import { roleLabel } from "@/lib/api/auth";
import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { UserCircle2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useAdmin } from "@/lib/hooks/use-admin";
import { NotificationBell } from "@/components/dashboard/notification-bell";

/** Any badge state the assignment screens can render. */
type BadgeStatus =
  | "active"
  | "overdue"
  | "draft"
  | "archived"
  | "published"
  | "submitted"
  | "graded"
  | "pending";

/** Top bar with the notification bell + user chip (no page title). */
export function PageTopBar() {
  const { admin } = useAdmin();
  const name = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "—";
  const role = roleLabel(admin?.role);
  return (
    <Flex
      h="72px"
      w="full"
      align="center"
      justify="flex-end"
      px={8}
      bg="#F9FAFB"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <HStack gap={5}>
        <NotificationBell />
        <Box w="1px" h="28px" bg="gray.200" />
        <HStack gap={3}>
          <UserCircle2 size={32} color="#9CA3AF" strokeWidth={1.5} />
          <Stack gap={0} lineHeight="1.2">
            <Text fontSize="sm" fontWeight="semibold" color="gray.900">
              {name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {role}
            </Text>
          </Stack>
        </HStack>
      </HStack>
    </Flex>
  );
}

const STATUS_STYLES: Record<
  BadgeStatus,
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active", color: "#16A34A", bg: "#DCFCE7" },
  published: { label: "Active", color: "#16A34A", bg: "#DCFCE7" },
  overdue: { label: "Overdue", color: "#EF4444", bg: "#FEE2E2" },
  draft: { label: "Draft", color: "#6B7280", bg: "#F3F4F6" },
  archived: { label: "Archived", color: "#6B7280", bg: "#F3F4F6" },
  submitted: { label: "Submitted", color: "#F97461", bg: "#FFF1ED" },
  graded: { label: "Graded", color: "#3B82F6", bg: "#DBEAFE" },
  pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7" },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <HStack
      gap={1.5}
      bg={s.bg}
      color={s.color}
      px={2.5}
      py={1}
      rounded="full"
      display="inline-flex"
      w="fit-content"
    >
      <Box w="6px" h="6px" rounded="full" bg={s.color} />
      <Text fontSize="xs" fontWeight="medium">
        {s.label}
      </Text>
    </HStack>
  );
}

/** A green pill toggle matching the designs. */
export function Toggle({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <Box
      as="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      w="44px"
      h="24px"
      rounded="full"
      bg={checked ? "#22C55E" : "#E5E7EB"}
      position="relative"
      transition="background 0.15s"
      flexShrink={0}
      cursor="pointer"
    >
      <Box
        position="absolute"
        top="2px"
        left={checked ? "22px" : "2px"}
        w="20px"
        h="20px"
        rounded="full"
        bg="white"
        boxShadow="sm"
        transition="left 0.15s"
      />
    </Box>
  );
}

/** Icon + label card used for assignment type / submission type / grading method. */
export function SelectableCard({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Stack
      as="button"
      onClick={onClick}
      flex="1"
      minW={0}
      gap={1}
      align="center"
      textAlign="center"
      borderWidth="1px"
      borderColor={selected ? "#F97461" : "gray.200"}
      bg={selected ? "#FFF1ED" : "white"}
      rounded="lg"
      px={4}
      py={4}
      cursor="pointer"
      transition="all 0.15s"
      _hover={selected ? undefined : { borderColor: "gray.300" }}
    >
      <Box color="gray.900">
        <Icon size={20} />
      </Box>
      <Text fontSize="sm" fontWeight="medium" color="gray.900">
        {label}
      </Text>
      {description ? (
        <Text fontSize="xs" color="gray.500">
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}

/** Label/value pair used in the assignment detail meta row. */
export function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={1} minW="120px">
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium" color="gray.900">
        {children}
      </Text>
    </Stack>
  );
}

/** Simple white card with a label + big number (assignment list & overview). */
export function NumberCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Box
      bg="white"
      rounded="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={5}
      flex="1"
      minW="0"
    >
      <Stack gap={4}>
        <Text fontSize="sm" color="gray.700" fontWeight="medium">
          {label}
        </Text>
        <Text fontSize="3xl" fontWeight="bold" color="gray.900" lineHeight="1">
          {value}
        </Text>
      </Stack>
    </Box>
  );
}
