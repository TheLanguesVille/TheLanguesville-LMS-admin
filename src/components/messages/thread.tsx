"use client";

import { Box, Flex, HStack, Skeleton, Stack, Text, Textarea } from "@chakra-ui/react";
import { ArrowLeft, Eye, MessageSquareText, RotateCw, Send } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Avatar } from "@/components/shared/avatar";
import type { ChatMessage } from "@/lib/api/messages";

export const NAVY = "#2E2F6F";
export const CORAL = "#F97461";
const MAX_LENGTH = 2000;
// Consecutive messages from one sender this close together share a group.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** "3:45 PM" today, "Yesterday", "Mon" this week, else "Jul 8". */
export function listTimeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / 86400000) + 1;
  if (d >= startOfToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays <= 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayLabel(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface ThreadPerson {
  name: string;
  initials?: string;
  avatarUrl?: string | null;
  subtitle?: string;
}

function Bubble({
  message,
  groupStart,
  groupEnd,
  other,
  observed,
}: {
  message: ChatMessage;
  groupStart: boolean;
  groupEnd: boolean;
  other: ThreadPerson;
  /** Read-only view: right-hand messages belong to this person, not "me". */
  observed?: ThreadPerson;
}) {
  const mine = message.mine;
  // Someone else's right-hand bubbles get a softer tint than your own.
  const rightBg = observed ? "#E8E9F5" : NAVY;
  const rightColor = observed ? NAVY : "white";
  return (
    <Flex
      justify={mine ? "flex-end" : "flex-start"}
      align="flex-end"
      gap={2}
      mt={groupStart ? 3 : 0.5}
    >
      {!mine ? (
        <Box w="28px" flexShrink={0}>
          {groupEnd ? (
            <Avatar
              name={other.name}
              src={other.avatarUrl}
              initials={other.initials}
              size={28}
            />
          ) : null}
        </Box>
      ) : null}
      <Stack gap={1} maxW="68%" align={mine ? "flex-end" : "flex-start"}>
        <Box
          bg={mine ? rightBg : "white"}
          color={mine ? rightColor : "gray.800"}
          borderWidth={mine ? 0 : "1px"}
          borderColor="gray.200"
          px={4}
          py={2.5}
          borderRadius="18px"
          borderBottomRightRadius={mine && groupEnd ? "6px" : "18px"}
          borderBottomLeftRadius={!mine && groupEnd ? "6px" : "18px"}
          boxShadow={mine && !observed ? "0 1px 2px rgba(46,47,111,0.25)" : "0 1px 2px rgba(16,24,40,0.04)"}
        >
          {message.subject ? (
            <Text
              fontSize="xs"
              fontWeight="semibold"
              mb={1}
              color={mine && !observed ? "whiteAlpha.800" : CORAL}
              textTransform="uppercase"
              letterSpacing="0.04em"
            >
              {message.subject}
            </Text>
          ) : null}
          <Text fontSize="sm" lineHeight="1.55" whiteSpace="pre-wrap" wordBreak="break-word">
            {message.body}
          </Text>
        </Box>
        {groupEnd ? (
          <Text fontSize="10px" color="gray.400" px={1}>
            {observed && mine ? `${observed.name} · ` : ""}
            {timeLabel(message.createdAt)}
          </Text>
        ) : null}
      </Stack>
      {mine && observed ? (
        <Box w="28px" flexShrink={0}>
          {groupEnd ? (
            <Avatar
              name={observed.name}
              src={observed.avatarUrl}
              initials={observed.initials}
              size={28}
            />
          ) : null}
        </Box>
      ) : null}
    </Flex>
  );
}

function Composer({
  placeholder,
  onSend,
}: {
  placeholder: string;
  onSend: (body: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !sending;

  // Grow with the text up to ~6 lines.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    const ok = await onSend(value.trim());
    setSending(false);
    if (ok) {
      setValue("");
      ref.current?.focus();
    }
  };

  return (
    <Box px={5} py={4} borderTopWidth="1px" borderColor="gray.100" bg="white">
      <HStack
        align="flex-end"
        gap={2}
        borderWidth="1px"
        borderColor="gray.200"
        rounded="2xl"
        pl={4}
        pr={1.5}
        py={1.5}
        bg="gray.50"
        transition="all 0.15s"
        _focusWithin={{ borderColor: NAVY, bg: "white", boxShadow: `0 0 0 3px ${NAVY}14` }}
      >
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          resize="none"
          border="none"
          bg="transparent"
          px={0}
          py={2}
          minH="24px"
          fontSize="sm"
          _focus={{ outline: "none", boxShadow: "none" }}
          _focusVisible={{ outline: "none", boxShadow: "none" }}
          aria-label="Message"
        />
        <Flex
          as="button"
          aria-label="Send message"
          onClick={() => void submit()}
          w="38px"
          h="38px"
          rounded="full"
          flexShrink={0}
          align="center"
          justify="center"
          bg={canSend ? CORAL : "gray.200"}
          color={canSend ? "white" : "gray.400"}
          cursor={canSend ? "pointer" : "not-allowed"}
          transition="all 0.15s"
          _hover={canSend ? { transform: "translateY(-1px)", boxShadow: "0 4px 10px rgba(249,116,97,0.35)" } : undefined}
        >
          <Send size={16} />
        </Flex>
      </HStack>
      <Flex justify="space-between" mt={1.5} px={1}>
        <Text fontSize="11px" color="gray.400">
          Enter to send · Shift + Enter for a new line
        </Text>
        {value.length > MAX_LENGTH - 200 ? (
          <Text fontSize="11px" color={value.length >= MAX_LENGTH ? "red.500" : "gray.400"}>
            {value.length}/{MAX_LENGTH}
          </Text>
        ) : null}
      </Flex>
    </Box>
  );
}

/**
 * The right-hand pane: header, message history (grouped into day sections
 * and sender runs), "load earlier", and the composer.
 */
export function ThreadPane({
  other,
  headerActions,
  messages,
  loading,
  hasMore,
  loadingEarlier,
  onLoadEarlier,
  onRefresh,
  onBack,
  onSend,
  readOnlyNotice,
  observed,
  emptyHint,
}: {
  other: ThreadPerson;
  headerActions?: ReactNode;
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  loadingEarlier: boolean;
  onLoadEarlier: () => void;
  onRefresh: () => void;
  onBack?: () => void;
  onSend: (body: string) => Promise<boolean>;
  /** When set, the thread is read-only and this explains why. */
  readOnlyNotice?: ReactNode;
  /** Read-only view: who the right-hand ("mine") messages belong to. */
  observed?: ThreadPerson;
  emptyHint?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const prevFirstId = useRef<string | null>(null);
  const prevHeight = useRef(0);

  // Stick to the bottom for new messages; keep position when older ones load.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstId = messages[0]?.id ?? null;
    const prepended =
      prevFirstId.current !== null &&
      firstId !== prevFirstId.current &&
      messages.length > prevCount.current &&
      messages.some((m) => m.id === prevFirstId.current);
    if (prepended) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
    } else if (messages.length !== prevCount.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevCount.current = messages.length;
    prevFirstId.current = firstId;
    prevHeight.current = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    prevCount.current = 0;
    prevFirstId.current = null;
  }, [other.name]);

  const rows: ReactNode[] = [];
  let lastDay = "";
  messages.forEach((m, i) => {
    const d = new Date(m.createdAt);
    const day = dayLabel(d);
    if (day !== lastDay) {
      rows.push(
        <Flex key={`day-${m.id}`} justify="center" my={4}>
          <Text
            fontSize="11px"
            fontWeight="semibold"
            color="gray.500"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            px={3}
            py={1}
            rounded="full"
            letterSpacing="0.02em"
          >
            {day}
          </Text>
        </Flex>,
      );
      lastDay = day;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameAs = (a?: ChatMessage) =>
      !!a &&
      a.mine === m.mine &&
      a.senderId === m.senderId &&
      dayLabel(new Date(a.createdAt)) === day &&
      Math.abs(new Date(a.createdAt).getTime() - d.getTime()) < GROUP_WINDOW_MS;
    rows.push(
      <Bubble
        key={m.id}
        message={m}
        other={other}
        observed={observed}
        groupStart={!sameAs(prev)}
        groupEnd={!sameAs(next)}
      />,
    );
  });

  return (
    <Flex direction="column" h="full" minW={0} flex="1">
      {/* Header */}
      <HStack
        px={5}
        h="72px"
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="gray.100"
        bg="white"
        gap={3}
      >
        {onBack ? (
          <Box
            as="button"
            aria-label="Back to conversations"
            onClick={onBack}
            color="gray.500"
            display={{ base: "block", lg: "none" }}
            cursor="pointer"
          >
            <ArrowLeft size={20} />
          </Box>
        ) : null}
        <Avatar name={other.name} src={other.avatarUrl} initials={other.initials} size={40} />
        <Stack gap={0} flex="1" minW={0}>
          <Text fontWeight="semibold" color="gray.900" lineClamp={1}>
            {other.name}
          </Text>
          {other.subtitle ? (
            <Text fontSize="xs" color="gray.500" lineClamp={1}>
              {other.subtitle}
            </Text>
          ) : null}
        </Stack>
        {headerActions}
        <Flex
          as="button"
          aria-label="Refresh conversation"
          title="Check for new messages"
          onClick={onRefresh}
          w="36px"
          h="36px"
          rounded="full"
          align="center"
          justify="center"
          color="gray.500"
          borderWidth="1px"
          borderColor="gray.200"
          cursor="pointer"
          _hover={{ color: NAVY, bg: "gray.50" }}
        >
          <RotateCw size={15} />
        </Flex>
      </HStack>

      {/* History */}
      <Box
        ref={scrollRef}
        flex="1"
        overflowY="auto"
        px={5}
        pb={4}
        bg="#F7F7FB"
        backgroundImage="radial-gradient(#E6E7F2 1px, transparent 1px)"
        backgroundSize="18px 18px"
      >
        {loading ? (
          <Stack gap={4} pt={6}>
            <Skeleton h="40px" w="45%" rounded="2xl" />
            <Skeleton h="56px" w="55%" rounded="2xl" alignSelf="flex-end" />
            <Skeleton h="40px" w="35%" rounded="2xl" />
            <Skeleton h="40px" w="40%" rounded="2xl" alignSelf="flex-end" />
          </Stack>
        ) : messages.length === 0 ? (
          <Flex direction="column" align="center" justify="center" h="full" gap={3} textAlign="center" px={6}>
            <Flex w="64px" h="64px" rounded="full" bg="white" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color={CORAL}>
              <MessageSquareText size={28} />
            </Flex>
            <Text fontWeight="semibold" color="gray.900">
              Start the conversation
            </Text>
            <Text fontSize="sm" color="gray.500" maxW="320px">
              {emptyHint ?? `Say hello to ${other.name.split(" ")[0]}. They'll get an email letting them know.`}
            </Text>
          </Flex>
        ) : (
          <>
            {hasMore ? (
              <Flex justify="center" pt={4}>
                <Box
                  as="button"
                  onClick={onLoadEarlier}
                  fontSize="xs"
                  fontWeight="semibold"
                  color={NAVY}
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  px={3.5}
                  py={1.5}
                  rounded="full"
                  cursor="pointer"
                  opacity={loadingEarlier ? 0.6 : 1}
                  _hover={{ bg: "gray.50" }}
                >
                  {loadingEarlier ? "Loading…" : "Load earlier messages"}
                </Box>
              </Flex>
            ) : null}
            {rows}
          </>
        )}
      </Box>

      {readOnlyNotice ? (
        <HStack px={5} py={4} gap={3} borderTopWidth="1px" borderColor="gray.100" bg="#EEF0FB">
          <Flex w="32px" h="32px" rounded="full" bg="white" color={NAVY} align="center" justify="center" flexShrink={0}>
            <Eye size={16} />
          </Flex>
          <Text fontSize="sm" color="gray.700">
            {readOnlyNotice}
          </Text>
        </HStack>
      ) : (
        <Composer placeholder={`Message ${other.name.split(" ")[0]}…`} onSend={onSend} />
      )}
    </Flex>
  );
}
