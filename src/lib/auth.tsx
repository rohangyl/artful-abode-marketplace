import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmailOnce } from "@/lib/emails.functions";

const IDLE_TIMEOUT_MS = 60_000;
const ACTIVITY_STORAGE_PREFIX = "artful-abode:last-activity:";
const ACTIVITY_PERSIST_INTERVAL_MS = 5_000;

type AuthCtx = { user: User | null; isAdmin: boolean; loading: boolean };
const Ctx = createContext<AuthCtx>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange?: () => void;
}) {
  const [state, setState] = useState<AuthCtx>({ user: null, isAdmin: false, loading: true });
  const sendWelcome = useServerFn(sendWelcomeEmailOnce);

  useEffect(() => {
    let authEventVersion = 0;
    let activeUserId: string | null = null;
    let lastActivityAt = 0;
    let lastPersistedAt = 0;
    let timeoutId: number | undefined;
    let storageAvailable = true;
    let expired = false;

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const storageKey = (userId: string) => `${ACTIVITY_STORAGE_PREFIX}${userId}`;

    const readStoredActivity = (key: string): number | null => {
      if (!storageAvailable) return null;
      try {
        const value = window.localStorage.getItem(key);
        const timestamp = value === null ? NaN : Number(value);
        return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
      } catch (error) {
        storageAvailable = false;
        console.error("Could not read login activity timestamp", error);
        return null;
      }
    };

    const persistActivity = (timestamp: number, force = false) => {
      if (!activeUserId || (!force && timestamp - lastPersistedAt < ACTIVITY_PERSIST_INTERVAL_MS))
        return;
      if (!storageAvailable) return;
      try {
        window.localStorage.setItem(storageKey(activeUserId), String(timestamp));
        lastPersistedAt = timestamp;
      } catch (error) {
        storageAvailable = false;
        console.error("Could not save login activity timestamp", error);
      }
    };

    const expireSession = async () => {
      if (!activeUserId || expired) return;
      expired = true;
      clearTimer();
      try {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) console.error("Automatic logout after inactivity failed", error);
      } catch (error) {
        console.error("Automatic logout after inactivity failed", error);
      }
    };

    const scheduleExpiry = () => {
      clearTimer();
      if (!activeUserId || expired) return;
      const key = storageKey(activeUserId);
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt);
      timeoutId = window.setTimeout(
        () => {
          const storedActivity = readStoredActivity(key);
          if (storedActivity !== null && storedActivity > lastActivityAt) {
            lastActivityAt = storedActivity;
            lastPersistedAt = storedActivity;
          }
          if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
            void expireSession();
          } else {
            scheduleExpiry();
          }
        },
        Math.max(remaining, 0),
      );
    };

    const startIdleTimer = (userId: string | null) => {
      clearTimer();
      activeUserId = userId;
      expired = false;
      if (!userId) return;

      const now = Date.now();
      const storedActivity = readStoredActivity(storageKey(userId));
      lastActivityAt = storedActivity ?? now;
      lastPersistedAt = storedActivity ?? 0;
      if (storedActivity === null) persistActivity(now, true);
      scheduleExpiry();
    };

    const stopIdleTimer = () => {
      const previousUserId = activeUserId;
      clearTimer();
      activeUserId = null;
      expired = false;
      if (!previousUserId || !storageAvailable) return;
      try {
        window.localStorage.removeItem(storageKey(previousUserId));
      } catch (error) {
        storageAvailable = false;
        console.error("Could not clear login activity timestamp", error);
      }
    };

    const recordActivity = () => {
      if (!activeUserId || expired) return;
      lastActivityAt = Date.now();
      persistActivity(lastActivityAt);
      scheduleExpiry();
    };

    const persistBeforePageHide = () => {
      persistActivity(lastActivityAt, true);
    };

    const handleStorage = (event: StorageEvent) => {
      if (!activeUserId || event.key !== storageKey(activeUserId) || event.newValue === null)
        return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp) || timestamp <= lastActivityAt) return;
      lastActivityAt = timestamp;
      lastPersistedAt = timestamp;
      scheduleExpiry();
    };

    const activityEvents = [
      "keydown",
      "pointerdown",
      "pointermove",
      "scroll",
      "touchstart",
    ] as const;
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pagehide", persistBeforePageHide);

    const load = async (user: User | null) => {
      let isAdmin = false;
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!data;
      }
      if (user?.email && user.email_confirmed_at) {
        void sendWelcome({ data: {} }).catch((error: unknown) => {
          console.error("Welcome email could not be sent", error);
        });
      }
      setState({ user, isAdmin, loading: false });
    };
    supabase.auth.getUser().then(({ data }) => {
      if (authEventVersion === 0) startIdleTimer(data.user?.id ?? null);
      return load(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        authEventVersion += 1;
        stopIdleTimer();
      } else if (event === "SIGNED_IN") {
        authEventVersion += 1;
        startIdleTimer(session?.user.id ?? null);
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      load(session?.user ?? null);
      onChange?.();
    });
    return () => {
      clearTimer();
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity);
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pagehide", persistBeforePageHide);
      sub.subscription.unsubscribe();
    };
  }, [onChange, sendWelcome]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
