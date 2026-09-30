"use client";

import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Mail,
  MessagesSquare,
  Settings,
  Star,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UNREAD_CHANGED_EVENT, getUnreadCount } from "@/lib/api/messages";
import { logout } from "@/lib/api/auth";
import type { Permission } from "@/lib/api/settings";
import { usePermissions } from "@/lib/hooks/use-permissions";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, the entry only renders if the admin holds this permission. */
  requires?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Assignment", href: "/assignment", icon: Star },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    requires: "analytics.view",
  },
  { label: "Students", href: "/students", icon: GraduationCap },
  { label: "Messages", href: "/messages", icon: MessagesSquare },
  { label: "Instructors", href: "/instructors", icon: UsersRound },
  { label: "Invitations", href: "/invitations", icon: Mail },
];

const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

const sharedItemStyles = {
  gap: 3,
  px: 3,
  py: 2.5,
  rounded: "md",
  fontSize: "sm",
} as const;

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  badge?: number;
}

function NavLink({ item, active, badge }: NavLinkProps) {
  const Icon = item.icon;
  return (
    <NextLink href={item.href} style={{ textDecoration: "none" }}>
      <HStack
        {...sharedItemStyles}
        bg={active ? "#F97461" : "transparent"}
        color={active ? "white" : "whiteAlpha.800"}
        fontWeight={active ? "semibold" : "medium"}
        _hover={{ bg: active ? "#F97461" : "whiteAlpha.200" }}
        transition="background 0.15s"
      >
        <Icon size={18} />
        <Text flex="1">{item.label}</Text>
        {badge ? (
          <Box
            minW="20px"
            h="20px"
            px={1.5}
            rounded="full"
            bg={active ? "white" : "#F97461"}
            color={active ? "#F97461" : "white"}
            fontSize="11px"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            justifyContent="center"
            aria-label={`${badge} unread`}
          >
            {badge > 99 ? "99+" : badge}
          </Box>
        ) : null}
      </HStack>
    </NextLink>
  );
}

/**
 * Unread message count for the sidebar badge. Refreshed when the route
 * changes, the window regains focus, or a screen reports it changed — plain
 * API calls, no polling.
 */
function useUnreadMessages(pathname: string | null): number {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    getUnreadCount().then((result) => {
      if (result.success) setUnread(result.data.unread);
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(refresh, 0);
    return () => clearTimeout(id);
  }, [pathname, refresh]);

  useEffect(() => {
    window.addEventListener(UNREAD_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(UNREAD_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return unread;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { has, loading: permissionsLoading } = usePermissions();
  const unreadMessages = useUnreadMessages(pathname);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname?.startsWith(href);

  // Hold gated entries back until permissions resolve — appearing a beat late
  // is less jarring than rendering then yanking one away.
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requires || (!permissionsLoading && has(item.requires)),
  );

  return (
    <Flex
      direction="column"
      w="240px"
      flexShrink={0}
      // Exactly one viewport tall, and pinned there. Without `alignSelf` the
      // sidebar stretches to the full document height (it's a flex child of a
      // row container), which pushes Settings/Logout to the bottom of the
      // *page* — on a long screen you'd have to scroll to reach them.
      h="100dvh"
      alignSelf="flex-start"
      position="sticky"
      top={0}
      bg="#2E2F6F"
      color="white"
      px={4}
      py={5}
    >
      {/* Logo */}
      <HStack gap={2} px={2} mb={8} h="40px">
        <Box
          w="32px"
          h="32px"
          rounded="md"
          bg="whiteAlpha.300"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontWeight="bold"
        >
          L
        </Box>
        <Text fontWeight="bold" letterSpacing="tight">
          Languesville
        </Text>
      </HStack>

      {/* Main nav — `minH={0}` lets it shrink below its content so it, rather
          than the sidebar, absorbs the overflow on a short viewport. */}
      <Stack gap={1} flex="1" minH={0} overflowY="auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            badge={item.href === "/messages" ? unreadMessages : undefined}
          />
        ))}
      </Stack>

      {/* Footer nav — always in view, never scrolled away. */}
      <Stack
        gap={1}
        pt={4}
        flexShrink={0}
        borderTopWidth="1px"
        borderColor="whiteAlpha.200"
      >
        <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} />
        <HStack
          as="button"
          onClick={handleLogout}
          {...sharedItemStyles}
          w="full"
          textAlign="left"
          bg="transparent"
          color="whiteAlpha.800"
          fontWeight="medium"
          _hover={{ bg: "whiteAlpha.200" }}
          transition="background 0.15s"
          cursor="pointer"
        >
          <LogOut size={18} />
          <Text>Logout</Text>
        </HStack>
      </Stack>
    </Flex>
  );
}
