import "server-only";

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8000;

/** A non-2xx Google response, with enough detail for callers to tell transient
 *  failures (429/5xx) apart from permanent ones (e.g. a 400 invalid_grant on a
 *  revoked OAuth token) without re-parsing the message string. */
export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with full jitter over the top half of the window, capped at MAX_DELAY_MS. */
function backoffDelay(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
  return exp / 2 + Math.random() * (exp / 2);
}

/** Reads Retry-After as either delta-seconds or an HTTP-date, per RFC 9110. */
function retryAfterDelayMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(header);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : null;
}

/**
 * Wraps `fetch` with retry + exponential backoff for transient failures — a 429 rate
 * limit or a 5xx are retried (honoring `Retry-After` when Google sends one); other
 * 4xx statuses and the final attempt's failure are thrown immediately as a
 * GoogleApiError, since retrying a bad request or a rejected grant can't help.
 */
export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastNetworkErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      lastNetworkErr = err;
      if (attempt === MAX_ATTEMPTS) throw err;
      await sleep(backoffDelay(attempt));
      continue;
    }

    if (response.ok) return response;

    if (!isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS) {
      const body = await response.text();
      throw new GoogleApiError(`Request failed (${response.status}): ${body}`, response.status, body);
    }

    await sleep(retryAfterDelayMs(response) ?? backoffDelay(attempt));
  }

  // Unreachable — the loop always returns or throws — but keeps TypeScript happy.
  throw lastNetworkErr instanceof Error ? lastNetworkErr : new Error(String(lastNetworkErr));
}
