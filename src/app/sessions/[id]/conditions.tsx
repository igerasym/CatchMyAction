import { conditionsAttribution, degreesToCompass } from "@/lib/marine-conditions";
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

// Static class names so Tailwind keeps them in the build.
const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

function Cell({
  label,
  icon,
  value,
  sub,
  compact,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  sub?: string | null;
  compact: boolean;
}) {
  // compact: four cells share one row on a phone, so tighten padding/type and put the compass point under the value.
  return (
    <div className={`${compact ? "p-2" : "p-2.5"} sm:p-3 border-r border-b border-line min-w-0`}>
      <dt
        className={`font-mono text-[10.5px] ${compact ? "tracking-[0.06em]" : "tracking-[0.12em]"} sm:tracking-[0.12em] uppercase text-dim mb-1.5 flex items-center gap-1.5`}
      >
        {icon}
        {label}
      </dt>
      <dd
        className={`font-mono ${compact ? "text-[13px]" : "text-[15px]"} sm:text-[15px] font-semibold text-bone flex flex-wrap items-baseline gap-x-1.5`}
      >
        <span className="whitespace-nowrap">{value}</span>
        {sub && <span className={`text-dim font-normal ${compact ? "basis-full sm:basis-auto" : ""}`}>{sub}</span>}
      </dd>
    </div>
  );
}

export default function Conditions(props: Props) {
  const { waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, waterTemp } = props;

  if (!waveHeight && !windSpeed) return null;

  const credit = conditionsAttribution();

  // Always one row, also on phones, so the Find Me button stays on the first screen.
  const count = [waveHeight, wavePeriod, windSpeed, waterTemp].filter((v) => v != null).length;
  const cols = COLS[count] ?? "grid-cols-4";
  const compact = count >= 4;

  return (
    <section aria-label="Conditions during the session">
      <p className="hud mb-3">Conditions</p>
      <dl className={`grid ${cols} border-t border-l border-line`}>
        {waveHeight != null && (
          <Cell compact={compact}
            label="Swell"
            icon={<IconWave className="w-3.5 h-3.5" />}
            value={`${waveHeight.toFixed(1)} m`}
            sub={waveDirection != null ? degreesToCompass(waveDirection) : null}
          />
        )}
        {wavePeriod != null && <Cell compact={compact} label="Period" value={`${wavePeriod.toFixed(0)} s`} />}
        {windSpeed != null && (
          <Cell compact={compact}
            label="Wind"
            icon={<IconWind className="w-3.5 h-3.5" />}
            value={`${kmhToMs(windSpeed)} m/s`}
            sub={windDirection != null ? degreesToCompass(windDirection) : null}
          />
        )}
        {waterTemp != null && <Cell compact={compact} label="Water" value={`${waterTemp.toFixed(0)}°C`} />}
      </dl>
      <p className="font-mono text-[10.5px] text-dim mt-1.5">
        <a href={credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {credit.text}
        </a>
      </p>
    </section>
  );
}
