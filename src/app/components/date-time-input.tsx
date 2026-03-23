"use client";

import { useRef } from "react";
import { Calendar, Clock } from "lucide-react";

interface Props {
  type: "date" | "time";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

export default function DateTimeInput({ type, value, onChange, required, min, max, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const Icon = type === "date" ? Calendar : Clock;

  return (
    <div className="relative">
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        className={`${className} pr-10 [&::-webkit-calendar-picker-indicator]{opacity:0;position:absolute;right:0;width:100%;height:100%;cursor:pointer}`}
      />
      <button
        type="button"
        onClick={() => ref.current?.showPicker?.()}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-400/50 hover:text-ocean-400 transition-colors pointer-events-none"
        tabIndex={-1}
      >
        <Icon className="w-4 h-4" />
      </button>
    </div>
  );
}
