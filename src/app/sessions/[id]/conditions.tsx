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

function Cell({ label, icon, value, sub }: { label: string; icon?: React.ReactNode; value: string; sub?: string | null }) {
  return (
    <div className="p-2.5 sm:p-3 border-r border-b border-line">
      <dt className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-dim mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="font-mono text-[15px] font-semibold text-bone">
        {value}
        {sub && <span className="text-dim font-normal ml-1.5">{sub}</span>}
      </dd>
    </div>
  );
}

export default function Conditions(props: Props) {
  const { waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, waterTemp } = props;

  if (!waveHeight && !windSpeed) return null;

  // One row on phones when there are up to three values, so the Find Me button stays on the first screen.
  const count = [waveHeight, wavePeriod, windSpeed, waterTemp].filter((v) => v != null).length;
  const cols = count <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";

  return (
    <section aria-label="Conditions during the session">
      <p className="hud mb-3">Conditions</p>
      <dl className={`grid ${cols} border-t border-l border-line`}>
        {waveHeight != null && (
          <Cell
            label="Swell"
            icon={<IconWave className="w-3.5 h-3.5" />}
            value={`${waveHeight.toFixed(1)} m`}
            sub={waveDirection != null ? degreesToCompass(waveDirection) : null}
          />
        )}
        {wavePeriod != null && <Cell label="Period" value={`${wavePeriod.toFixed(0)} s`} />}
        {windSpeed != null && (
          <Cell
            label="Wind"
            icon={<IconWind className="w-3.5 h-3.5" />}
            value={`${kmhToMs(windSpeed)} m/s`}
            sub={windDirection != null ? degreesToCompass(windDirection) : null}
          />
        )}
        {waterTemp != null && <Cell label="Water" value={`${waterTemp.toFixed(0)}°C`} />}
      </dl>
    </section>
  );
}
