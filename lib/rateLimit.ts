/**
 * A fixed-window rate limiter, in memory.
 *
 * Be clear about what this is and is not. It counts per serverless instance,
 * so on Vercel a burst spread across many warm lambdas gets a fresh allowance
 * on each one, and a genuinely distributed attack walks straight through it.
 * It is not a security boundary.
 *
 * What it is: the thing that stops one script, or one bored person with curl,
 * from draining a prepaid balance in an afternoon. The real ceiling is that the
 * Anthropic balance is prepaid with auto-reload off, so the worst case is
 * bounded at whatever is sitting in the account rather than at whatever a card
 * will absorb. This limiter makes reaching that ceiling take deliberate effort
 * instead of a for-loop.
 *
 * Upstash or Vercel's own edge rate limiting would count globally and would be
 * the right answer for a real launch. Both cost either money or an account, and
 * the budget for this project is zero.
 */

interface Window {
  count: number;
  /** When this window opened, in epoch milliseconds. */
  start: number;
}

export interface Bucket {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  readonly hits: Map<string, Window>;
}

export const bucket = (limit: number, windowMs: number): Bucket => ({
  limit,
  windowMs,
  hits: new Map(),
});

// A single instance should never accumulate many callers. If it does, this is
// being abused, and dropping the oldest entries is better than growing without
// bound - the worst it costs an honest caller is a reset allowance.
const MAX_KEYS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets, for the Retry-After header. */
  retryAfter: number;
}

export function take(b: Bucket, key: string): RateLimitResult {
  const now = Date.now();
  const existing = b.hits.get(key);

  if (!existing || now - existing.start >= b.windowMs) {
    if (b.hits.size >= MAX_KEYS) {
      const oldest = b.hits.keys().next().value;
      if (oldest !== undefined) b.hits.delete(oldest);
    }
    b.hits.set(key, { count: 1, start: now });
    return { allowed: true, retryAfter: 0 };
  }

  const retryAfter = Math.ceil((existing.start + b.windowMs - now) / 1000);
  if (existing.count >= b.limit) return { allowed: false, retryAfter };

  existing.count += 1;
  return { allowed: true, retryAfter };
}

/**
 * Who is asking.
 *
 * Vercel sets `x-forwarded-for` and the leftmost entry is the client. This is
 * spoofable in general, which is another reason the limiter above is a speed
 * bump rather than a wall - but behind Vercel's proxy the header is rewritten,
 * so it is good enough for the job it has.
 */
export function callerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
