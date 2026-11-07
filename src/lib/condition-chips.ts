/** Short condition chips for session lists, each with a plain-language label for hover and screen readers. */

export interface Chip {
  text: string;
  label: string;
}

export interface ChipSource {
  waveHeight?: number | null;
  wavePeriod?: number | null;
  windSpeed?: number | null; // km/h
}

export function conditionChips(s: ChipSource): Chip[] {
  const out: Chip[] = [];
  if (s.waveHeight != null) {
    out.push({ text: `H ${s.waveHeight.toFixed(1)}m`, label: `Wave height ${s.waveHeight.toFixed(1)} metres` });
  }
  if (s.wavePeriod != null) {
    out.push({ text: `T ${Math.round(s.wavePeriod)}s`, label: `Wave period ${Math.round(s.wavePeriod)} seconds` });
  }
  if (s.windSpeed != null) {
    const kn = Math.round(s.windSpeed / 1.852);
    out.push({ text: `${kn}kn`, label: `Wind ${kn} knots` });
  }
  return out;
}

/** One line explaining the chips, shown once above a list instead of on every row. */
export const CHIP_LEGEND = "H wave height · T period · kn wind";
