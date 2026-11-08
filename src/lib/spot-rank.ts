/** Ordering and grouping of autocomplete results. Pure, so it can be tested without a database. */

/** "1 spot" / "12 spots". */
export function spotsLabel(n: number): string {
  return `${n} spot${n === 1 ? "" : "s"}`;
}

/**
 * Region / country suggestions: biggest first, and only groups with at least `min` spots. A region holding
 * a single spot would just repeat that spot ("Mundaka · 1 spots"), so it is left out.
 */
export function pickGroups<T extends { count: number }>(groups: T[], limit: number, min = 2): T[] {
  return groups
    .filter((g) => g.count >= min)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Lower is better. Spots for the sport being entered come first, then name-prefix matches, then
 * substring matches. Spots with no sport on record are not penalised: the catalogue is not fully tagged.
 */
export function spotRank(name: string, query: string, spotSports: string[] | undefined, sport?: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  const textRank = n.startsWith(q) ? 0 : n.includes(q) ? 1 : 2;
  const sportRank = !sport || !spotSports?.length || spotSports.includes(sport) ? 0 : 1;
  return sportRank * 10 + textRank;
}
