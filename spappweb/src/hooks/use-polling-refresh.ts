"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UsePollingRefreshOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

export function usePollingRefresh({
  intervalMs = 30_000,
  enabled = true,
}: UsePollingRefreshOptions = {}) {
  const router = useRouter();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(() => new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const enabledRef = useRef(enabled);

  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      router.refresh();
      setLastRefreshedAt(new Date());
    };

    const intervalId = setInterval(refresh, intervalMs);
    return () => clearInterval(intervalId);
  }, [router, intervalMs, enabled]);

  useEffect(() => {
    const tick = () => {
      setSecondsAgo(
        Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000),
      );
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [lastRefreshedAt]);

  return { lastRefreshedAt, secondsAgo };
}
