"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { getToken } from "@/lib/auth/session";

/**
 * The token cookie is shared by every tab on the domain, but cookies fire no
 * change event. Re-check it whenever a tab regains focus so a login or logout
 * in one tab is picked up by the others (e.g. a /login tab left open while you
 * signed in elsewhere now forwards to the dashboard).
 */
function subscribeToTokenChanges(onChange: () => void) {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * `null` until hydrated (server + first client render), then a boolean. Reading
 * the cookie via useSyncExternalStore keeps server and client markup in sync
 * without a hydration mismatch.
 */
function useHasToken(): boolean | null {
  return useSyncExternalStore(
    subscribeToTokenChanges,
    () => Boolean(getToken()),
    () => null,
  );
}

/** Query param carrying the page to return to after login. */
export const RETURN_TO_PARAM = "next";

/**
 * Where to send the user after login: the in-app page they were bounced from,
 * or the dashboard. Only same-origin paths are honoured (no `//evil.com`).
 */
export function getReturnTo(): string {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get(RETURN_TO_PARAM);
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

/**
 * Client-side gate for the authenticated app shell. Redirects to /login when
 * no token is present, remembering the requested page so login can return to
 * it. Expired/invalid tokens are caught separately by the API client, which
 * clears the session and redirects on a 401.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasToken = useHasToken();

  useEffect(() => {
    if (hasToken === false) {
      const here = window.location.pathname + window.location.search;
      router.replace(
        `/login?${RETURN_TO_PARAM}=${encodeURIComponent(here)}`,
      );
    }
  }, [hasToken, router]);

  if (!hasToken) return null;

  return <>{children}</>;
}

/**
 * Inverse of AuthGuard for the login screen: an already signed-in admin who
 * lands on /login (new tab, bookmark, back button) is sent straight into the
 * app instead of being asked to log in again.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasToken = useHasToken();

  useEffect(() => {
    if (hasToken === true) {
      router.replace(getReturnTo());
    }
  }, [hasToken, router]);

  if (hasToken !== false) return null;

  return <>{children}</>;
}
