// Self-updating check for the pinned API catalogue (open item O-19).
// api_search reads co-cddo/api-catalogue compiled at one commit. The monthly workflow
// (.github/workflows/refresh-api-catalogue.yml) proposes a fresh pin; this decides when an old pin must be
// said out loud (warn) and when the build must refuse to publish it as current (fail).
//
// WARN_DAYS = 35: one missed monthly refresh plus a few days' grace.
// FAIL_DAYS = 100: roughly three missed refreshes; past that, results can no longer be called current.

export const WARN_DAYS = 35;
export const FAIL_DAYS = 100;

/**
 * @param {string} commitDate  the pinned commit's date, e.g. "2026-11-02"
 * @param {Date} today          the build date
 * @returns {{ status: "fresh" | "warn" | "fail", ageDays: number, message: string }}
 */
export function catalogueStaleness(commitDate, today = new Date()) {
  const pinned = new Date(`${commitDate}T00:00:00Z`);
  if (Number.isNaN(pinned.getTime())) return { status: "fail", ageDays: NaN, message: `the catalogue pin date "${commitDate}" is not a date` };
  const ageDays = Math.floor((today.getTime() - pinned.getTime()) / 86_400_000);
  if (ageDays < 0) return { status: "fail", ageDays, message: `the catalogue pin date ${commitDate} is in the future` };
  if (ageDays > FAIL_DAYS) return { status: "fail", ageDays, message: `the API catalogue was pinned ${ageDays} days ago (limit ${FAIL_DAYS}); merge the refresh pull request or run the refresh workflow` };
  if (ageDays > WARN_DAYS) return { status: "warn", ageDays, message: `the API catalogue was pinned ${ageDays} days ago (refresh due after ${WARN_DAYS})` };
  return { status: "fresh", ageDays, message: `the API catalogue was pinned ${ageDays} days ago` };
}
