"use client";

import { useEffect, useState } from "react";
import { type AdminProfile, getMe } from "@/lib/api/auth";
import { PROFILE_CACHE_KEY as CACHE_KEY, getToken } from "@/lib/auth/session";

// The cached profile is tagged with the token it was fetched for, so a
// different sign-in (or an expired session followed by a new login) can never
// render the previous account's name and role.
function readCache(): AdminProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { token?: string; profile?: AdminProfile };
    const token = getToken();
    return token && cached.token === token && cached.profile
      ? cached.profile
      : null;
  } catch {
    return null;
  }
}

function writeCache(profile: AdminProfile) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ token: getToken(), profile }),
    );
  } catch {}
}

export function useAdmin() {
  const [admin, setAdmin] = useState<AdminProfile | null>(() => readCache());
  const [loading, setLoading] = useState(() => readCache() === null);

  useEffect(() => {
    if (!loading) return;
    getMe().then((result) => {
      if (result.success) {
        writeCache(result.data);
        setAdmin(result.data);
      }
      setLoading(false);
    });
  }, [loading]);

  return { admin, loading };
}
