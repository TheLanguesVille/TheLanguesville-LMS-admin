"use client";

import {
  Flex,
  HStack,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { UserCircle2 } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  user?: { name: string; role: string };
  loading?: boolean;
}

export function DashboardHeader({
  title,
  user,
  loading = false,
}: DashboardHeaderProps) {
  return (
    <Flex
      h="72px"
      w="full"
      align="center"
      justify="space-between"
      px={8}
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg="white"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Heading as="h1" size="lg" color="gray.900">
        {title}
      </Heading>

      <HStack gap={3}>
        <UserCircle2 size={36} color="#9CA3AF" strokeWidth={1.5} />
        {loading || !user ? (
          <Stack gap={1}>
            <Skeleton height="13px" width="100px" rounded="sm" />
            <Skeleton height="11px" width="60px" rounded="sm" />
          </Stack>
        ) : (
          <Stack gap={0} lineHeight="1.2">
            <Text fontSize="sm" fontWeight="semibold" color="gray.900">
              {user.name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {user.role}
            </Text>
          </Stack>
        )}
      </HStack>
    </Flex>
  );
}
