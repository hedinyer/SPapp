type MobileLogPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

export function mobileLog(payload: MobileLogPayload) {
  const body = JSON.stringify({
    sessionId: "ce99ac",
    timestamp: Date.now(),
    ...payload,
  });
  // #region agent log
  fetch("/api/debug-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
  // #endregion
}
