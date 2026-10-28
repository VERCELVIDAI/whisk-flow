"use client";

import * as React from "react";

/**
 * Show a clear setup message when the deployment has no usable database.
 * Login would otherwise fail after the user submits credentials.
 */
export function DeploymentStatus() {
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
        } | null;
        if (!cancelled && payload?.ok === false) {
          setMessage(payload.message ?? "The studio database is unavailable.");
        }
      })
      .catch(() => {
        // Individual form submissions still report network failures.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-100"
    >
      <span className="font-semibold">Studio setup needed.</span> {message}
    </p>
  );
}
