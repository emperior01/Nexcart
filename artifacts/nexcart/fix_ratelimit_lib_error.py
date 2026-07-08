#!/usr/bin/env python3
"""
Fixes the Vercel build error:
  api/_lib/rateLimit.ts(59,12): error TS2339: Property 'ok' does not exist on type 'Response'.

Also adds the Upstash-unreachable timeout protection that was discussed
but hadn't actually landed in your copy yet (your rateLimit.ts was still
the very first version from the initial apply_rate_limits.py run).

Cause of the TS error: api/tsconfig.json compiles with lib: ["es2022"]
(no "dom"), so the ambient global Response type in scope there is an
incomplete fallback. Fix: annotate the fetch result as `any` locally in
rateLimit.ts, rather than adding "dom" to the shared api/tsconfig.json
(which would affect all 12 routes for one file's sake).

Run from inside artifacts/nexcart (same folder as apply_rate_limits.py).
"""

import os
import sys

BASE = os.getcwd()
target = os.path.join(BASE, "api", "_lib", "rateLimit.ts")
if not os.path.isfile(target):
    print(f"ERROR: {target} not found. Run this from artifacts/nexcart.")
    sys.exit(1)

OLD = '''async function upstashPipeline(commands: (string | number)[][]): Promise<any[]> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Upstash pipeline failed: ${res.status}`);
  }
  const data = (await res.json()) as { result: any; error?: string }[];
  return data.map((entry) => entry.result);
}'''

NEW = '''async function upstashPipeline(commands: (string | number)[][]): Promise<any[]> {
  // Without a timeout, a genuinely unreachable Upstash (network partition,
  // DNS failure) would hang this fetch on the OS-level TCP/TLS timeout \u2014
  // tens of seconds \u2014 stalling every protected route, including login and
  // checkout. That would turn "fail open for availability" into an outage
  // caused by an unrelated service. 1.5s is generous for a same-region
  // Redis REST call but short enough that a real outage fails fast.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    // Typed `any` deliberately: api/tsconfig.json compiles with
    // `lib: ["es2022"]` (no "dom"), so the ambient global `Response` type
    // in scope here is an incomplete fallback missing `.ok`/`.status`/
    // `.json()`. Rather than adding "dom" to the shared api/tsconfig.json
    // (which would affect all 12 routes for one file's sake), this keeps
    // the workaround local to the one place that needs it.
    const res: any = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstash pipeline failed: ${res.status}`);
    }
    const data = (await res.json()) as { result: any; error?: string }[];
    return data.map((entry) => entry.result);
  } finally {
    clearTimeout(timeout);
  }
}'''

with open(target, "r") as f:
    src = f.read()

count = src.count(OLD)
if count != 1:
    print(f"ERROR: expected 1 match, found {count}. File content drifted further \u2014 check manually.")
    sys.exit(1)

src = src.replace(OLD, NEW, 1)
with open(target, "w") as f:
    f.write(src)

print("PATCHED: api/_lib/rateLimit.ts (added timeout protection + fixed TS build error)")
