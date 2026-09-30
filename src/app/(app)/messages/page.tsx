"use client";

import {
  Box,
  Flex,
  HStack,
  Portal,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Inbox, MessagesSquare, PenSquare, Search, UserRound, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { CORAL, NAVY, ThreadPane, listTimeLabel } from "@/components/messages/thread";
import { Avatar } from "@/components/shared/avatar";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type ConversationSummary,
  type InboxData,
  type StudentParticipant,
  type ThreadData,
  getThread,
  listContacts,
  listConversations,
  lookupStudent,
  notifyUnreadChanged,
  sendReply,
  startConversation,
} from "@/lib/api/messages";
import { useAdmin } from "@/lib/hooks/use-admin";
import { studentPaths } from "@/lib/routes";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function ConversationItem({
  c,
  active,
  showStaff,
  onClick,
}: {
  c: ConversationSummary;
  active: boolean;
  showStaff: boolean;
  onClick: () => void;
}) {
  const unread = c.unreadCount > 0;
  return (
    <HStack
      as="button"
      onClick={onClick}
      w="full"
      textAlign="left"
      gap={3}
      px={4}
      py={3.5}
      position="relative"
      bg={active ? "#FFF1ED" : "transparent"}
      cursor="pointer"
      transition="background 0.15s"
      _hover={{ bg: active ? "#FFF1ED" : "gray.50" }}
      borderBottomWidth="1px"
      borderColor="gray.50"
    >
      {active ? (
        <Box position="absolute" left={0} top={2} bottom={2} w="3px" bg={CORAL} roundedRight="full" />
      ) : null}
      <Box position="relative" flexShrink={0}>
        <Avatar name={c.student.name} src={c.student.avatarUrl} initials={c.student.initials} size={44} />
        {unread ? (
          <Box position="absolute" top="-1px" right="-1px" w="12px" h="12px" rounded="full" bg={CORAL} borderWidth="2px" borderColor="white" />
        ) : null}
      </Box>
      <Stack gap={0.5} flex="1" minW={0}>
        <HStack justify="space-between" gap={2}>
          <Text fontSize="sm" fontWeight={unread ? "bold" : "semibold"} color="gray.900" lineClamp={1}>
            {c.student.name}
          </Text>
          <Text fontSize="11px" color={unread ? CORAL : "gray.400"} fontWeight={unread ? "semibold" : "normal"} flexShrink={0}>
            {listTimeLabel(c.lastMessage.at)}
          </Text>
        </HStack>
        {showStaff ? (
          <Text fontSize="11px" color="gray.500" lineClamp={1}>
            with {c.staff.name} · {c.staff.roleLabel}
          </Text>
        ) : null}
        <HStack justify="space-between" gap={2}>
          <Text fontSize="xs" color={unread ? "gray.800" : "gray.500"} fontWeight={unread ? "medium" : "normal"} lineClamp={1}>
            {c.lastMessage.fromMe ? "You: " : ""}
            {c.lastMessage.preview}
          </Text>
          {unread ? (
            <Flex minW="20px" h="20px" px={1.5} rounded="full" bg={CORAL} color="white" fontSize="11px" fontWeight="bold" align="center" justify="center" flexShrink={0}>
              {c.unreadCount > 99 ? "99+" : c.unreadCount}
            </Flex>
          ) : null}
        </HStack>
      </Stack>
    </HStack>
  );
}

function NewMessageModal({
  isInstructor,
  onPick,
  onClose,
}: {
  isInstructor: boolean;
  onPick: (student: StudentParticipant) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [contacts, setContacts] = useState<StudentParticipant[] | null>(null);

  useEffect(() => {
    let active = true;
    listContacts(debounced.trim() || undefined).then((result) => {
      if (!active) return;
      if (result.success) setContacts(result.data.contacts);
      else {
        setContacts([]);
        toast.error(getApiErrorMessage(result, "Couldn't load students"));
      }
    });
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <Portal>
      <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={300} display="flex" alignItems="center" justifyContent="center" px={4} onClick={onClose}>
        <Box bg="white" rounded="2xl" w="full" maxW="460px" boxShadow="2xl" overflow="hidden" onClick={(e) => e.stopPropagation()}>
          <HStack justify="space-between" px={6} pt={6} pb={2}>
            <Stack gap={0.5}>
              <Text fontSize="lg" fontWeight="bold" color="gray.900">
                New message
              </Text>
              <Text fontSize="sm" color="gray.500">
                {isInstructor ? "Students enrolled in your courses" : "Any student on the platform"}
              </Text>
            </Stack>
            <Flex as="button" aria-label="Close" onClick={onClose} w="32px" h="32px" rounded="full" align="center" justify="center" color="gray.500" _hover={{ bg: "gray.100" }} cursor="pointer">
              <X size={16} />
            </Flex>
          </HStack>
          <Box px={6} py={3}>
            <SearchInput width="100%" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </Box>
          <Box maxH="360px" overflowY="auto" pb={3}>
            {contacts === null ? (
              <Stack px={6} gap={3} py={2}>
                {[0, 1, 2].map((i) => (
                  <HStack key={i} gap={3}>
                    <Skeleton w="40px" h="40px" rounded="full" />
                    <Stack gap={1.5} flex="1">
                      <Skeleton h="12px" w="40%" />
                      <Skeleton h="10px" w="60%" />
                    </Stack>
                  </HStack>
                ))}
              </Stack>
            ) : contacts.length === 0 ? (
              <Flex direction="column" align="center" py={10} gap={2} color="gray.400">
                <UserRound size={28} />
                <Text fontSize="sm">No students found</Text>
              </Flex>
            ) : (
              contacts.map((s) => (
                <HStack key={s.id} as="button" w="full" textAlign="left" gap={3} px={6} py={2.5} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => onPick(s)}>
                  <Avatar name={s.name} src={s.avatarUrl} initials={s.initials} size={40} />
                  <Stack gap={0} minW={0}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.900" lineClamp={1}>
                      {s.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500" lineClamp={1}>
                      {s.email}
                    </Text>
                  </Stack>
                </HStack>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </Portal>
  );
}

function MessagesPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("c");
  const pendingStudentId = params.get("student");
  const { admin, loading: adminLoading } = useAdmin();
  const isInstructor = admin?.role === "instructor";

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [inbox, setInbox] = useState<InboxData | null>(null);
  const [inboxLoading, setInboxLoading] = useState(true);

  const [loadedThread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  // A student picked for a brand-new thread (created on first send).
  const [pendingLookup, setPending] = useState<StudentParticipant | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedRef = useRef(selectedId);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  // Only trust loaded state that still matches the URL.
  const thread =
    loadedThread && loadedThread.conversation.id === selectedId ? loadedThread : null;
  const pending =
    !selectedId && pendingLookup && pendingLookup.id === pendingStudentId
      ? pendingLookup
      : null;

  const go = useCallback(
    (qs: string) => router.replace(`/messages${qs ? `?${qs}` : ""}`),
    [router],
  );

  const loadInbox = useCallback(async () => {
    const result = await listConversations({
      scope,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    });
    if (result.success) setInbox(result.data);
    else toast.error(getApiErrorMessage(result, "Couldn't load conversations"));
    setInboxLoading(false);
  }, [scope, debouncedSearch]);

  const loadThread = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setThreadLoading(true);
    const result = await getThread(id);
    if (selectedRef.current !== id) return;
    if (result.success) {
      setThread(result.data);
      // Opening a thread marks it read — reflect that locally and in the badge.
      setInbox((prev) =>
        prev
          ? {
              ...prev,
              conversations: prev.conversations.map((c) =>
                c.id === id ? { ...c, unreadCount: 0 } : c,
              ),
            }
          : prev,
      );
      notifyUnreadChanged();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't open this conversation"));
      setThread(null);
    }
    setThreadLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(loadInbox, 0);
    return () => clearTimeout(id);
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) return;
    const id = setTimeout(() => loadThread(selectedId), 0);
    return () => clearTimeout(id);
  }, [selectedId, loadThread]);

  // "Message this student" deep link: open the existing thread or a blank one.
  useEffect(() => {
    if (!pendingStudentId || selectedId) return;
    let active = true;
    lookupStudent(pendingStudentId).then((result) => {
      if (!active) return;
      if (!result.success) {
        toast.error(getApiErrorMessage(result, "You can't message this student"));
        go("");
        return;
      }
      if (result.data.conversationId) go(`c=${result.data.conversationId}`);
      else setPending(result.data.participant);
    });
    return () => {
      active = false;
    };
  }, [pendingStudentId, selectedId, go]);

  // No polling: pick up new messages whenever the tab regains focus.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      void loadInbox();
      if (selectedRef.current) void loadThread(selectedRef.current, true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadInbox, loadThread]);

  const handleSend = async (body: string): Promise<boolean> => {
    if (thread) {
      const result = await sendReply(thread.conversation.id, body);
      if (!result.success) {
        toast.error(getApiErrorMessage(result, "Message not sent"));
        return false;
      }
      setThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, result.data.message] } : prev,
      );
      void loadInbox();
      return true;
    }
    if (pending?.id) {
      const result = await startConversation(pending.id, body);
      if (!result.success) {
        toast.error(getApiErrorMessage(result, "Message not sent"));
        return false;
      }
      go(`c=${result.data.conversationId}`);
      void loadInbox();
      return true;
    }
    return false;
  };

  const loadEarlier = async () => {
    if (!thread || loadingEarlier || !thread.messages[0]) return;
    setLoadingEarlier(true);
    const result = await getThread(thread.conversation.id, thread.messages[0].id);
    if (result.success) {
      setThread((prev) =>
        prev
          ? { ...prev, messages: [...result.data.messages, ...prev.messages], hasMore: result.data.hasMore }
          : prev,
      );
    }
    setLoadingEarlier(false);
  };

  const conversations = inbox?.conversations ?? [];
  const canSeeAll = inbox?.canSeeAll ?? (admin?.role === "admin" || admin?.role === "superadmin");
  const showingThread = Boolean(selectedId || pending);
  const totalUnread = conversations.reduce((n, c) => n + c.unreadCount, 0);

  const conv = thread?.conversation;
  const readOnly = conv && !conv.participant;
  const threadPerson = conv
    ? {
        name: conv.student.name,
        initials: conv.student.initials,
        avatarUrl: conv.student.avatarUrl,
        subtitle: readOnly
          ? `Conversation with ${conv.staff.name} (${conv.staff.roleLabel})`
          : (conv.student.email ?? "Student"),
      }
    : pending
      ? { name: pending.name, initials: pending.initials, avatarUrl: pending.avatarUrl, subtitle: pending.email ?? "Student" }
      : null;
  const profileId = conv?.student.id ?? pending?.id ?? null;

  return (
    <Box>
      <DashboardHeader
        title="Messages"
        loading={adminLoading}
        user={admin ? { name: `${admin.firstName} ${admin.lastName}`.trim(), role: roleLabel(admin.role) } : undefined}
      />
      <Box px={{ base: 4, md: 8 }} py={6}>
        <Flex
          h="calc(100dvh - 72px - 48px)"
          minH="520px"
          bg="white"
          rounded="2xl"
          borderWidth="1px"
          borderColor="gray.200"
          overflow="hidden"
          boxShadow="0 1px 3px rgba(16,24,40,0.05)"
        >
          {/* Inbox */}
          <Flex
            direction="column"
            w={{ base: "full", lg: "360px" }}
            flexShrink={0}
            borderRightWidth={{ base: 0, lg: "1px" }}
            borderColor="gray.100"
            display={{ base: showingThread ? "none" : "flex", lg: "flex" }}
          >
            <Stack gap={3} px={4} pt={5} pb={3} borderBottomWidth="1px" borderColor="gray.100">
              <HStack justify="space-between">
                <HStack gap={2}>
                  <Text fontWeight="bold" color="gray.900" fontSize="lg">
                    Inbox
                  </Text>
                  {totalUnread > 0 ? (
                    <Box bg="#FFF1ED" color={CORAL} fontSize="xs" fontWeight="bold" px={2} py={0.5} rounded="full">
                      {totalUnread} new
                    </Box>
                  ) : null}
                </HStack>
                <HStack
                  as="button"
                  onClick={() => setPickerOpen(true)}
                  gap={1.5}
                  bg={NAVY}
                  color="white"
                  px={3.5}
                  h="34px"
                  rounded="full"
                  fontSize="xs"
                  fontWeight="semibold"
                  cursor="pointer"
                  _hover={{ bg: "#262760" }}
                >
                  <PenSquare size={14} />
                  <Text>New message</Text>
                </HStack>
              </HStack>
              {canSeeAll ? (
                <HStack bg="gray.100" p={1} rounded="full" gap={1}>
                  {(["mine", "all"] as const).map((s) => (
                    <Box
                      key={s}
                      as="button"
                      flex="1"
                      h="30px"
                      rounded="full"
                      fontSize="xs"
                      fontWeight="semibold"
                      bg={scope === s ? "white" : "transparent"}
                      color={scope === s ? NAVY : "gray.500"}
                      boxShadow={scope === s ? "sm" : "none"}
                      cursor="pointer"
                      onClick={() => {
                        setInboxLoading(true);
                        setScope(s);
                      }}
                    >
                      {s === "mine" ? "My inbox" : "All conversations"}
                    </Box>
                  ))}
                </HStack>
              ) : null}
              <SearchInput width="100%" placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Stack>

            <Box flex="1" overflowY="auto">
              {inboxLoading ? (
                <Stack gap={0}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <HStack key={i} gap={3} px={4} py={3.5}>
                      <Skeleton w="44px" h="44px" rounded="full" />
                      <Stack gap={2} flex="1">
                        <Skeleton h="12px" w="50%" />
                        <Skeleton h="10px" w="80%" />
                      </Stack>
                    </HStack>
                  ))}
                </Stack>
              ) : conversations.length === 0 ? (
                <Flex direction="column" align="center" justify="center" h="full" gap={3} px={8} textAlign="center" color="gray.400">
                  {search ? <Search size={28} /> : <Inbox size={32} />}
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    {search ? "No matches" : "No conversations yet"}
                  </Text>
                  <Text fontSize="xs">
                    {search
                      ? "Try another name or email."
                      : scope === "all"
                        ? "Conversations between students and staff will show up here."
                        : "Messages from students land here. Start one with “New message”."}
                  </Text>
                </Flex>
              ) : (
                conversations.map((c) => (
                  <ConversationItem
                    key={c.id}
                    c={c}
                    active={c.id === selectedId}
                    showStaff={scope === "all"}
                    onClick={() => go(`c=${c.id}`)}
                  />
                ))
              )}
            </Box>
          </Flex>

          {/* Thread */}
          <Flex flex="1" minW={0} display={{ base: showingThread ? "flex" : "none", lg: "flex" }}>
            {threadPerson ? (
              <ThreadPane
                other={threadPerson}
                // Reading someone else's thread: staff on the right, student left.
                messages={
                  readOnly
                    ? (thread?.messages ?? []).map((m) => ({ ...m, mine: m.senderType === "staff" }))
                    : (thread?.messages ?? [])
                }
                observed={
                  readOnly && conv
                    ? { name: conv.staff.name, initials: conv.staff.initials, avatarUrl: conv.staff.avatarUrl }
                    : undefined
                }
                loading={threadLoading && !thread}
                hasMore={thread?.hasMore ?? false}
                loadingEarlier={loadingEarlier}
                onLoadEarlier={loadEarlier}
                onRefresh={() => (selectedId ? loadThread(selectedId, true) : undefined)}
                onBack={() => go("")}
                onSend={handleSend}
                headerActions={
                  profileId ? (
                    <Box
                      as="button"
                      onClick={() => router.push(studentPaths.details(profileId))}
                      fontSize="xs"
                      fontWeight="semibold"
                      color={NAVY}
                      px={3}
                      h="32px"
                      rounded="full"
                      borderWidth="1px"
                      borderColor="gray.200"
                      cursor="pointer"
                      display={{ base: "none", md: "block" }}
                      _hover={{ bg: "gray.50" }}
                    >
                      View profile
                    </Box>
                  ) : null
                }
                readOnlyNotice={
                  readOnly && conv ? (
                    <>
                      You&apos;re viewing <b>{conv.student.name}</b>&apos;s conversation with{" "}
                      <b>{conv.staff.name}</b>. Only they can reply.
                    </>
                  ) : undefined
                }
              />
            ) : threadLoading ? null : (
              <Flex direction="column" align="center" justify="center" flex="1" gap={4} textAlign="center" px={8} bg="#F7F7FB">
                <Flex w="88px" h="88px" rounded="full" bg="white" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color={NAVY} boxShadow="sm">
                  <MessagesSquare size={36} />
                </Flex>
                <Stack gap={1}>
                  <Text fontWeight="bold" color="gray.900" fontSize="lg">
                    Your conversations
                  </Text>
                  <Text fontSize="sm" color="gray.500" maxW="340px">
                    Pick a conversation to read and reply, or start a new one. Students are emailed whenever you message them.
                  </Text>
                </Stack>
                <HStack
                  as="button"
                  onClick={() => setPickerOpen(true)}
                  gap={2}
                  bg={CORAL}
                  color="white"
                  px={5}
                  h="42px"
                  rounded="full"
                  fontSize="sm"
                  fontWeight="semibold"
                  cursor="pointer"
                  _hover={{ boxShadow: "0 6px 16px rgba(249,116,97,0.35)" }}
                >
                  <PenSquare size={16} />
                  <Text>New message</Text>
                </HStack>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Box>

      {pickerOpen ? (
        <NewMessageModal
          isInstructor={isInstructor}
          onClose={() => setPickerOpen(false)}
          onPick={(s) => {
            setPickerOpen(false);
            if (s.id) go(`student=${s.id}`);
          }}
        />
      ) : null}
    </Box>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesPageInner />
    </Suspense>
  );
}
