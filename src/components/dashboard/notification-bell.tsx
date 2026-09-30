"use client";

import { Box, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AdminNotification,
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { formatRelativeTime } from "@/lib/format";

const NAVY = "#2E2F6F";

/**
 * Unread count for the bell dot. Refreshed when the route changes or the
 * window regains focus — plain API calls, no polling (same as the Messages
 * badge in the sidebar).
 */
function useUnreadNotifications(pathname: string | null) {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    getNotificationUnreadCount().then((result) => {
      if (result.success) setUnread(result.data.unreadCount);
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(refresh, 0);
    return () => clearTimeout(id);
  }, [pathname, refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  return { unread, setUnread, refresh };
}

function NotificationsPopover({
  onClose,
  onUnreadChange,
}: {
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listNotifications(1, 10).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setItems(result.data.notifications);
        onUnreadChange(result.data.unreadCount);
      } else {
        setItems([]);
        toast.error(result.message || "Couldn't load notifications");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onUnreadChange]);

  const unreadInList = items?.filter((n) => !n.read).length ?? 0;

  const openNotification = async (n: AdminNotification) => {
    if (!n.read) {
      setItems((prev) =>
        prev ? prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : prev,
      );
      const result = await markNotificationRead(n.id);
      if (result.success) {
        getNotificationUnreadCount().then((r) => {
          if (r.success) onUnreadChange(r.data.unreadCount);
        });
      }
    }
    if (n.link) {
      onClose();
      router.push(n.link);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    const result = await markAllNotificationsRead();
    setMarkingAll(false);
    if (!result.success) {
      toast.error(result.message || "Couldn't mark notifications as read");
      return;
    }
    setItems((prev) => (prev ? prev.map((x) => ({ ...x, read: true })) : prev));
    onUnreadChange(0);
  };

  return (
    <Box
      position="absolute"
      top="calc(100% + 12px)"
      right={0}
      w="370px"
      maxW="calc(100vw - 32px)"
      bg="white"
      rounded="2xl"
      boxShadow="0 12px 40px rgba(0,0,0,0.12)"
      borderWidth="1px"
      borderColor="gray.100"
      overflow="hidden"
      zIndex={30}
      role="dialog"
      aria-label="Notifications"
    >
      <Box px={6} py={4} borderBottomWidth="1px" borderColor="gray.100">
        <Text fontWeight="semibold" color="gray.900">
          Notification List
        </Text>
      </Box>

      {items === null ? (
        <Flex justify="center" py={10}>
          <Spinner size="sm" color={NAVY} />
        </Flex>
      ) : items.length === 0 ? (
        <Box px={6} py={10} textAlign="center">
          <Text fontSize="sm" color="gray.500">
            No notifications yet
          </Text>
        </Box>
      ) : (
        <Stack gap={0} maxH="420px" overflowY="auto">
          {items.map((n) => {
            const clickable = !n.read || Boolean(n.link);
            return (
              <HStack
                key={n.id}
                as={clickable ? "button" : "div"}
                w="full"
                textAlign="left"
                align="flex-start"
                gap={3}
                px={6}
                py={4}
                borderBottomWidth="1px"
                borderColor="gray.100"
                cursor={clickable ? "pointer" : "default"}
                bg={n.read ? "white" : "#FAFBFF"}
                _hover={clickable ? { bg: "gray.50" } : undefined}
                onClick={clickable ? () => void openNotification(n) : undefined}
              >
                <Flex
                  w="40px"
                  h="40px"
                  rounded="full"
                  bg="#EEF0FA"
                  color={NAVY}
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Bell size={18} fill={NAVY} />
                </Flex>
                <Stack gap={0.5} flex="1" minW={0}>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.900">
                    {n.title}
                  </Text>
                  <Text fontSize="sm" color="gray.600" lineClamp={2}>
                    {n.body}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    {formatRelativeTime(n.createdAt)}
                  </Text>
                </Stack>
                {!n.read ? (
                  <Box
                    w="8px"
                    h="8px"
                    rounded="full"
                    bg="#EF4444"
                    mt={1.5}
                    flexShrink={0}
                    aria-label="Unread"
                  />
                ) : null}
              </HStack>
            );
          })}
        </Stack>
      )}

      <Box
        as="button"
        w="full"
        py={4}
        textAlign="center"
        fontSize="sm"
        fontWeight="medium"
        color={NAVY}
        cursor={unreadInList > 0 ? "pointer" : "default"}
        opacity={unreadInList > 0 && !markingAll ? 1 : 0.5}
        _hover={unreadInList > 0 ? { bg: "gray.50" } : undefined}
        onClick={unreadInList > 0 && !markingAll ? () => void markAll() : undefined}
      >
        Mark All As Read
      </Box>
    </Box>
  );
}

/** Header bell + "Notification List" dropdown. */
export function NotificationBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { unread, setUnread } = useUnreadNotifications(pathname);
  const close = useCallback(() => setOpen(false), []);
  // Covers the bell and the dropdown, so clicking the bell toggles instead of
  // closing on mousedown and reopening on click.
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <Box ref={wrapperRef} position="relative">
      <Box
        as="button"
        display="flex"
        position="relative"
        cursor="pointer"
        color="#374151"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={22} />
        {unread > 0 ? (
          <Box
            position="absolute"
            top="-2px"
            right="-2px"
            w="9px"
            h="9px"
            rounded="full"
            bg="#EF4444"
            borderWidth="2px"
            borderColor="white"
          />
        ) : null}
      </Box>
      {open ? (
        <NotificationsPopover onClose={close} onUnreadChange={setUnread} />
      ) : null}
    </Box>
  );
}
