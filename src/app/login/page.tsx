"use client";

import { Button, Heading, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminBadge } from "@/components/onboarding/admin-badge";
import { FormField } from "@/components/onboarding/form-field";
import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { PasswordField } from "@/components/onboarding/password-field";
import { GuestGuard, getReturnTo } from "@/components/auth/auth-guard";
import { OtpInput } from "@/components/login/otp-input";
import { AppButton } from "@/components/ui/app-button";
import { getApiErrorMessage } from "@/lib/api/client";
import { login, verifyOtp } from "@/lib/api/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;
const RESEND_SECONDS = 59;

function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Please enter a valid email address";
  return undefined;
}

function formatMmSs(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LoginForm() {
  const router = useRouter();
  // The OTP step is rendered in-place (not a separate route) so the password
  // stays in memory and "resend" can re-call /admin/login with it.
  const [step, setStep] = useState<"credentials" | "otp">("credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const emailError = validateEmail(email);
  const passwordError = password ? undefined : "Password is required";

  const showEmailError =
    (touched.email || submitted) && emailError ? emailError : undefined;
  const showPasswordError =
    (touched.password || submitted) && passwordError
      ? passwordError
      : undefined;

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step, secondsLeft]);

  const requestOtp = async (): Promise<boolean> => {
    const result = await login(email, password);
    if (result.success) return true;
    toast.error(getApiErrorMessage(result, "Login failed. Please try again."));
    return false;
  };

  const handleLogin = async () => {
    setSubmitted(true);
    if (emailError || passwordError) return;
    setIsSubmitting(true);

    const ok = await requestOtp();
    setIsSubmitting(false);
    if (ok) {
      setCode("");
      setSecondsLeft(RESEND_SECONDS);
      setStep("otp");
      toast.success("OTP sent to your email.");
    }
  };

  const handleVerify = async (fullCode: string) => {
    setIsVerifying(true);
    const result = await verifyOtp(email, fullCode);

    if (result.success) {
      toast.success("Verified! Redirecting…");
      router.replace(getReturnTo());
    } else {
      setIsVerifying(false);
      setCode("");
      toast.error(getApiErrorMessage(result, "Invalid code. Please try again."));
    }
  };

  const handleResend = async () => {
    setCode("");
    const ok = await requestOtp();
    if (ok) {
      setSecondsLeft(RESEND_SECONDS);
      toast.success("A new code has been sent to your email.");
    }
  };

  if (step === "otp") {
    return (
      <OnboardingCard
        footer={
          <Text fontSize="xs" color="gray.600">
            {secondsLeft > 0 ? (
              <>
                Didn&apos;t receive a code?{" "}
                <Text as="span" color="#EF4444" fontWeight="semibold">
                  {formatMmSs(secondsLeft)}
                </Text>
              </>
            ) : (
              <Button
                variant="plain"
                size="xs"
                type="button"
                onClick={handleResend}
                color="#EF4444"
                fontWeight="semibold"
                p={0}
                h="auto"
                minH={0}
                _hover={{ textDecoration: "underline" }}
              >
                Resend code
              </Button>
            )}
          </Text>
        }
      >
        <Stack gap={6}>
          <Stack gap={3} align="center" textAlign="center">
            <AdminBadge />
            <Stack gap={0.5}>
              <Heading as="h1" size="md" color="gray.900">
                Verify your email
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Enter the 6-digit code we sent to {email}.
              </Text>
            </Stack>
          </Stack>

          <OtpInput
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            disabled={isVerifying}
          />

          <Button
            variant="plain"
            size="sm"
            type="button"
            onClick={() => setStep("credentials")}
            color="gray.600"
            fontWeight="medium"
            _hover={{ textDecoration: "underline" }}
          >
            Use a different email
          </Button>
        </Stack>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard
      footer={
        <Text fontSize="xs" color="gray.600">
          Forgot password?{" "}
          <Link
            as={NextLink}
            href="/forgot-password"
            color="#EF4444"
            fontWeight="semibold"
            _hover={{ textDecoration: "underline" }}
          >
            Reset here
          </Link>
        </Text>
      }
    >
      <Stack gap={6}>
        <Stack gap={3} align="center" textAlign="center">
          <AdminBadge />
          <Stack gap={0.5}>
            <Heading as="h1" size="md" color="gray.900">
              Welcome back
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Login to your admin account.
            </Text>
          </Stack>
        </Stack>

        <Stack gap={4}>
          <FormField
            label="Email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            error={showEmailError}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
          <PasswordField
            label="Password"
            placeholder="Enter your password"
            value={password}
            error={showPasswordError}
            onChange={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          />
        </Stack>

        <AppButton onClick={handleLogin} isLoading={isSubmitting}>
          Login
        </AppButton>
      </Stack>
    </OnboardingCard>
  );
}

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginForm />
    </GuestGuard>
  );
}
