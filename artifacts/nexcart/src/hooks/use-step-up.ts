import { useCallback, useRef, useState } from "react";

/**
 * Wraps any fetch-based request that might come back with a
 * { error: "step_up_required" } 403. On that response, shows the
 * password-confirmation dialog and automatically retries the exact same
 * request once verified — the caller just awaits runWithStepUp() and gets
 * back the eventual (successful or failed) Response either way.
 */
export function useStepUp() {
  const [open, setOpen] = useState(false);
  const pendingRetry = useRef<(() => void) | null>(null);

  const runWithStepUp = useCallback(async (request: () => Promise<Response>): Promise<Response> => {
    const res = await request();
    if (res.status === 403) {
      const data = await res.clone().json().catch(() => ({}));
      if (data.error === "step_up_required") {
        return new Promise<Response>((resolve) => {
          pendingRetry.current = () => {
            request().then(resolve);
          };
          setOpen(true);
        });
      }
    }
    return res;
  }, []);

  const handleVerified = useCallback(() => {
    pendingRetry.current?.();
    pendingRetry.current = null;
  }, []);

  return { open, setOpen, runWithStepUp, handleVerified };
}
