import { degreesToCompass, metersToFeet } from "@/lib/marine-conditions";

interface Props {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  waterTemp: number | null;
}

export default function Conditions(props: Props) {
  const { waveHeight, wavePeriod, waveDirection, windSpeed, windDirection } = props;

  // Don't render if no data
  if (!waveHeight && !windSpeed) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {waveHeight != null && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500/10 border border-ocean-500/20 rounded-lg">
          <span className="text-sm">🌊</span>
          <span className="text-sm text-ocean-300 font-medium">{metersToFeet(waveHeight)}ft</span>
          {wavePeriod != null && (
            <span className="text-xs text-ocean-400/60">@ {wavePeriod.toFixed(0)}s</span>
          )}
          {waveDirection != null && (
            <span className="text-xs text-ocean-400/40">{degreesToCompass(waveDirection)}</span>
          )}
        </div>
      )}
      {windSpeed != null && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
          <span className="text-sm">💨</span>
          <span className="text-sm text-white/70 font-medium">{windSpeed.toFixed(0)} km/h</span>
          {windDirection != null && (
            <span className="text-xs text-white/40">{degreesToCompass(windDirection)}</span>
          )}
        </div>
      )}
    </div>
  );
}
