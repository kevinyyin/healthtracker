/**
 * Postgres `numeric` columns come back from Supabase/PostgREST as strings (to avoid
 * float precision loss), not JS numbers. Every numeric value read from a query result
 * must go through this before arithmetic — silent string-concatenation bugs otherwise.
 */
export function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
