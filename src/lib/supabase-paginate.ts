// PostgREST caps every read at 1000 rows by default (Supabase `max-rows`). For
// unbounded `.in(...)` reads — node shared pools, leaderboard tallies — that
// silently drops rows once a set crosses 1000: owners' contacts vanish from the
// pool and per-member counts read low (a freshly-onboarded member can show 0).
// fetchAllRows pages past the cap with .range() until the result is exhausted.

const PAGE_SIZE = 1000;

/** The minimal builder shape we depend on: a `.range()` that resolves to a
 *  PostgREST `{ data, error }` result. Structural typing avoids importing
 *  PostgREST's heavy generics — any Supabase filter builder satisfies it. */
interface RangeableQuery<T> {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
}

/** Read EVERY row a filter matches, paging past PostgREST's 1000-row cap.
 *  `makeQuery` MUST return a fresh builder per call (a builder is single-use
 *  once awaited). Throws on the first PostgREST error. */
export async function fetchAllRows<T>(
  makeQuery: () => RangeableQuery<T>,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}
