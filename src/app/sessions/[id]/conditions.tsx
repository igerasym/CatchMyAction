import { degreesToCompass } from "@/lib/marine-conditions";
import { IconWave, IconWind } from "@/app/components/icons";

interface Props {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  waterTemp: number | null;
}

/** km/h → m/s */
function kmhToMs(kmh: number): string {
  return (kmh / 3.6).toFixed(1);
}

export default function Conditions(props: Props) {
  const { waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, waterTemp } = props;

  if (!waveHeight && !windSpeed) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-white/40">
      {waveHeight != null && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded">
          <IconWave className="w-3.5 h-3.5 text-ocean-400/60" />
          {waveHeight.toFixed(1)}m
          {wavePeriod != null && <span className="text-white/25">@ {wavePeriod.toFixed(0)}s</span>}
          {waveDirection != null && <span className="text-white/20">{degreesToCompass(waveDirection)}</span>}
        </span>
      )}
      {windSpeed != null && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded">
          <IconWind className="w-3.5 h-3.5 text-white/30" />
          {kmhToMs(windSpeed)} m/s
          {windDirection != null && <span className="text-white/20">{degreesToCompass(windDirection)}</span>}
        </span>
      )}
      {waterTemp != null && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded">
          {waterTemp.toFixed(0)}°C
        </span>
      )}
    </div>
  );
}
