// GET /api/health — used by uptime monitors and for manually verifying
// Redis outage / recovery behavior (see the docs' "Failure simulation" and
// "Recovery verification" sections). Deliberately NOT rate-limited itself:
// monitoring probes hit this frequently by design, and gating the endpoint
// that reports Redis's status behind the same Redis would be circular.

import { db } from "./_lib/db.js";
import { pingRedis, getHealthSnapshot } from "./_lib/redisHealth.js";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const [redisResult, databaseConnected] = await Promise.all([pingRedis(), checkDatabase()]);
  const redisHealth = getHealthSnapshot();

  const overallStatus: "healthy" | "degraded" | "unhealthy" = !databaseConnected
    ? "unhealthy"
    : redisResult.ok
      ? "healthy"
      : "degraded"; // DB is fine, Redis isn't — site stays up per the fail-open/fail-closed rules, so this is "degraded," not "unhealthy."

  res.status(overallStatus === "unhealthy" ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    api: { status: "ok" },
    database: { status: databaseConnected ? "connected" : "disconnected" },
    redis: {
      status: redisResult.ok ? "connected" : "disconnected",
      circuitState: redisHealth.circuitState,
      consecutiveFailures: redisHealth.consecutiveFailures,
      lastSuccessfulConnection: redisHealth.lastSuccessfulConnection,
      latencyMs: redisResult.latencyMs,
    },
  });
}

async function checkDatabase(): Promise<boolean> {
  try {
    const query = db.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("db health check timeout")), 2000));
    const result: any = await Promise.race([query, timeout]);
    return !result?.error;
  } catch {
    return false;
  }
}
