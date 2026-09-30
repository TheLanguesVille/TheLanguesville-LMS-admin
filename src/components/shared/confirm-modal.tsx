"use client";

import { Box, Button, Flex, Portal, Stack, Text } from "@chakra-ui/react";
import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { AppButton } from "@/components/ui/app-button";

type ConfirmTone = "warning" | "danger" | "success" | "info";

const TONES: Record<
  ConfirmTone,
  { icon: LucideIcon; color: string; bg: string }
> = {
  warning: { icon: AlertTriangle, color: "#D97706", bg: "#FEF3C7" },
  danger: { icon: CircleAlert, color: "#DC2626", bg: "#FEE2E2" },
  success: { icon: CircleCheck, color: "#16A34A", bg: "#DCFCE7" },
  info: { icon: Copy, color: "#2E2F6F", bg: "#E8E9F5" },
};

interface ConfirmModalProps {
  tone: ConfirmTone;
  title: string;
  /** Rich body — bold the person's name etc. */
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/**
 * Centered confirmation dialog (suspend/unsuspend/delete/cancel patterns):
 * tinted icon, title, description, stacked full-width confirm + Cancel.
 */
export function ConfirmModal({
  tone,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);
  const { icon: Icon, color, bg } = TONES[tone];

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.600"
        zIndex={300}
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={4}
        onClick={busy ? undefined : onClose}
      >
        <Box
          bg="white"
          rounded="2xl"
          w="full"
          maxW="460px"
          boxShadow="2xl"
          px={7}
          py={8}
          onClick={(e) => e.stopPropagation()}
        >
          <Stack gap={5} align="center" textAlign="center">
            <Flex w="56px" h="56px" rounded="full" bg={bg} align="center" justify="center" color={color}>
              <Icon size={26} />
            </Flex>
            <Stack gap={2}>
              <Text fontSize="xl" fontWeight="semibold" color="gray.900">
                {title}
              </Text>
              <Text fontSize="sm" color="gray.600" maxW="360px">
                {body}
              </Text>
            </Stack>
            <Stack gap={3} w="full" mt={1}>
              <AppButton onClick={confirm} isLoading={busy}>
                {confirmLabel}
              </AppButton>
              <Button
                variant="outline"
                rounded="full"
                h="48px"
                fontWeight="medium"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Portal>
  );
}
