"use client";

import { useEffect, useRef, useState } from "react";
import { Share, Ellipsis, SquarePlus, ChevronDown, Pause, Play } from "lucide-react";

/** Inline icon + label, so "tap Share" shows exactly what to look for on the phone. */
export function Ico({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle px-1.5 py-0.5 mx-0.5 border border-line bg-char-2 text-bone text-[13px] font-semibold whitespace-nowrap">
      {children}
      <span>{label}</span>
    </span>
  );
}

const I = "w-3.5 h-3.5";

/** Steps with the second (in the clip /install/install-iphone.mp4) where each one starts. */
const STEPS: { at: number; body: React.ReactNode }[] = [
  { at: 0, body: <>In Safari tap <Ico label="More"><Ellipsis className={I} aria-hidden="true" /></Ico> at the bottom right.</> },
  { at: 2.15, body: <>Tap <Ico label="Share"><Share className={I} aria-hidden="true" /></Ico> (a square with an arrow up).</> },
  { at: 4.23, body: <>Tap <Ico label="View More"><ChevronDown className={I} aria-hidden="true" /></Ico> to see the full list.</> },
  { at: 6.54, body: <>Tap <Ico label="Add to Home Screen"><SquarePlus className={I} aria-hidden="true" /></Ico>.</> },
  { at: 8.36, body: <>Keep <strong className="text-bone">Open as Web App</strong> on and tap <strong className="text-bone">Add</strong>.</> },
  { at: 10.49, body: <>Open <strong className="text-bone">CatchMyAction</strong> from your home screen. It runs full-screen, like an app.</> },
];

function stepAt(t: number): number {
  let i = 0;
  STEPS.forEach((s, idx) => { if (t >= s.at) i = idx; });
  return i;
}

/**
 * The iPhone install flow as a short looping clip next to the written steps. The step being shown
 * in the clip is highlighted, and tapping a step jumps the clip there. No autoplay with reduced motion.
 */
export default function IphoneDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.play().catch(() => {}); // autoplay may be refused (low-power mode); the play button stays available
    }
  }, []);

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function jump(i: number) {
    const v = video.current;
    if (!v) return;
    v.currentTime = STEPS[i].at + 0.05;
    setActive(i);
    v.play().catch(() => {});
  }

  return (
    <div className="grid sm:grid-cols-[minmax(0,240px)_1fr] gap-6 sm:gap-8 items-start">
      <div className="relative mx-auto w-[220px] sm:w-full">
        <div className="relative rounded-[28px] border-[6px] border-char-3 bg-ink overflow-hidden shadow-lg aspect-[600/1226]">
          <video
            ref={video}
            className="block w-full h-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            poster="/install/install-iphone-poster.jpg"
            aria-label="Screen recording: adding CatchMyAction to the iPhone home screen from Safari"
            onTimeUpdate={(e) => setActive(stepAt(e.currentTarget.currentTime))}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src="/install/install-iphone.webm" type="video/webm" />
            <source src="/install/install-iphone.mp4" type="video/mp4" />
          </video>
        </div>
        <button onClick={toggle}
          className="mt-3 mx-auto flex items-center gap-2 hud hover:text-bone transition-colors">
          {playing ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <ol className="space-y-1 text-[15px]">
        {STEPS.map((s, i) => (
          <li key={i}>
            <button type="button" onClick={() => jump(i)} aria-current={i === active ? "step" : undefined}
              className={`w-full text-left flex gap-3 px-3 py-2.5 border-l-2 transition-colors ${
                i === active ? "border-l-rec bg-char-2 text-bone" : "border-l-transparent text-mute hover:text-bone"
              }`}>
              <span className="disp text-rec text-lg leading-6 w-5 flex-shrink-0">{i + 1}</span>
              <span className="leading-7">{s.body}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
