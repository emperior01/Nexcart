import { db, authClient } from "../_lib/db.js";
import { validateSession, markStepUpVerified } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies } from "../_lib/cookies.js";
import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";

// Called when a sensitive action (like requesting a payout) has been
// blocked because the session's last password confirmation is too old.
// Re-checks the password and, on success, refreshes step_up_verified_at
// so the blocked action can be retried.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  const session = await validateSession(token);
  if (!session) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  // Password-guessing surface (re-checks the account password), so this
  // gets the strict tier. Keyed by user_id since the session is already
  // known here — a stolen/shared session token still gets throttled per
  // account, not per IP.
  if (await enforceRateLimit(req, res, "auth:verify-step-up", RATE_LIMIT_TIERS.AUTH_STRICT, session.user_id)) return;

  const { password } = (req.body ?? {}) as { password?: string };
  if (!password) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  // Same duplicate-type-declaration workaround as login.ts / session.ts.
  const { data: authUser } = await (db.auth as any).admin.getUserById(session.user_id);
  const email = authUser?.user?.email;
  if (!email) {
    res.status(500).json({ error: "Could not resolve account email." });
    return;
  }

  // Same duplicate-type-declaration workaround as login.ts / oauth-session.ts.
  const authAny = authClient.auth as any;
  const { error } = await authAny.signInWithPassword({ email, password });
  await authAny.signOut({ scope: "local" });

  if (error) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  await markStepUpVerified(session.id);
  res.status(200).json({ success: true });
}
