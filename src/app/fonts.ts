import { Archivo, JetBrains_Mono } from "next/font/google";

/** Display + UI: Archivo variable (width axis lets us go wide for headlines, normal for UI). */
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

/** HUD / data: monospace for timestamps, coordinates, counts. */
export const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});
