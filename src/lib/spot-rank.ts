/** Ordering of autocomplete results. Pure, so it can be tested without a database. */

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
