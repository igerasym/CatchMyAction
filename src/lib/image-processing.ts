import sharp from "sharp";

/**
 * Display size after applying EXIF orientation. Orientations 5–8 are rotated 90°/270°,
 * so the stored width/height are swapped relative to how the photo is meant to be seen.
 */
function orientedSize(meta: sharp.Metadata): { width: number; height: number } {
  const w = meta.width || 0;
  const h = meta.height || 0;
  return (meta.orientation ?? 1) >= 5 ? { width: h, height: w } : { width: w, height: h };
}

const PREVIEW_LONG_SIDE = 1000; // enough for a phone screen, too small to publish as a full-res story/print
const FEATURED_LONG_SIDE = 800; // homepage/OG showcase: clean, but not worth stealing

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Target size that fits the oriented image inside a long-side box (never upscales). */
function fitLongSide(size: { width: number; height: number }, longSide: number) {
  const w = size.width || longSide;
  const h = size.height || Math.round(longSide * 0.66);
  const scale = Math.min(1, longSide / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * Watermarked preview: long side 1000px, JPEG q70, a tiled diagonal "CATCHMYACTIONS.COM" pattern
 * across the whole frame (can't be cropped away), white text with a thin dark outline so it reads on
 * bright water and dark rock alike, plus a small credit line along the bottom.
 */
export async function createPreview(
  inputBuffer: Buffer,
  opts: { credit?: string | null } = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // .rotate() with no args applies EXIF orientation (portrait shots were coming out sideways)
  const { width, height } = fitLongSide(orientedSize(await sharp(inputBuffer).metadata()), PREVIEW_LONG_SIDE);

  const font = Math.max(14, Math.round(Math.max(width, height) / 42));
  // Tile wider than the text (~16 font-widths) so marks in a row never run into each other
  const tileW = Math.round(font * 20);
  const tileH = Math.round(font * 6);
  const credit = opts.credit ? `© ${escapeXml(opts.credit.slice(0, 60))} · PREVIEW` : "PREVIEW";
  const creditFont = Math.max(11, Math.round(font * 0.62));
  const mark = (x: number, y: number) =>
    `<text x="${x}" y="${y}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${font}" letter-spacing="2" fill="rgba(255,255,255,0.30)" stroke="rgba(0,0,0,0.16)" stroke-width="1">CATCHMYACTIONS.COM</text>`;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      ${mark(0, Math.round(tileH * 0.45))}
      ${mark(Math.round(tileW / 2), Math.round(tileH * 0.95))}
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
  <rect x="0" y="${Math.round(height - creditFont * 2.4)}" width="${width}" height="${Math.round(creditFont * 2.4)}" fill="rgba(0,0,0,0.38)"/>
  <text x="${creditFont}" y="${Math.round(height - creditFont * 0.85)}" font-family="DejaVu Sans Mono, monospace" font-size="${creditFont}" letter-spacing="1" fill="rgba(255,255,255,0.85)">${credit}</text>
</svg>`;

  const buffer = await sharp(inputBuffer)
    .rotate()
    .resize(width, height, { fit: "inside" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();

  return { buffer, width, height };
}

/**
 * Clean showcase rendition for photos the photographer explicitly featured (homepage, OG cards):
 * long side 800px, no pattern, only a small corner mark.
 */
export async function createFeatured(inputBuffer: Buffer, opts: { credit?: string | null } = {}): Promise<Buffer> {
  const { width, height } = fitLongSide(orientedSize(await sharp(inputBuffer).metadata()), FEATURED_LONG_SIDE);
  const f = Math.max(10, Math.round(Math.max(width, height) / 70));
  const label = escapeXml(opts.credit ? `CATCHMYACTIONS.COM · ${opts.credit.slice(0, 40)}` : "CATCHMYACTIONS.COM");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width - f}" y="${height - f}" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="${f}" letter-spacing="1" fill="rgba(255,255,255,0.75)" stroke="rgba(0,0,0,0.25)" stroke-width="0.6">${label}</text>
</svg>`;
  return sharp(inputBuffer)
    .rotate()
    .resize(width, height, { fit: "inside" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/** Create a small thumbnail (400px wide) */
export async function createThumbnail(
  inputBuffer: Buffer
): Promise<Buffer> {
  return sharp(inputBuffer)
    .rotate()
    .resize(400, null, { fit: "inside" })
    .jpeg({ quality: 50 })
    .toBuffer();
}

/** Get image dimensions and size */
export async function getImageMetadata(
  inputBuffer: Buffer
): Promise<{ width: number; height: number; size: number }> {
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = orientedSize(metadata);
  return {
    width,
    height,
    size: inputBuffer.length,
  };
}

export interface ExifData {
  takenAt: Date | null;
  cameraMake: string | null;
  cameraModel: string | null;
  focalLength: number | null;
  iso: number | null;
  shutterSpeed: string | null;
  aperture: number | null;
  gpsLat: number | null;
  gpsLng: number | null;
}

/** Extract useful EXIF metadata from image */
export async function extractExif(inputBuffer: Buffer): Promise<ExifData> {
  const metadata = await sharp(inputBuffer).metadata();
  const exif = metadata.exif ? parseExifBuffer(metadata.exif) : null;

  return {
    takenAt: exif?.DateTimeOriginal ? parseExifDate(exif.DateTimeOriginal) : null,
    cameraMake: exif?.Make?.trim() || null,
    cameraModel: exif?.Model?.trim() || null,
    focalLength: exif?.FocalLength ? parseFloat(exif.FocalLength) : null,
    iso: exif?.ISOSpeedRatings ? parseInt(exif.ISOSpeedRatings) : null,
    shutterSpeed: exif?.ExposureTime || null,
    aperture: exif?.FNumber ? parseFloat(exif.FNumber) : null,
    gpsLat: exif?.GPSLatitude ? parseDMS(exif.GPSLatitude, exif.GPSLatitudeRef) : null,
    gpsLng: exif?.GPSLongitude ? parseDMS(exif.GPSLongitude, exif.GPSLongitudeRef) : null,
  };
}

function parseExifBuffer(exifBuffer: Buffer): Record<string, any> | null {
  try {
    // Simple EXIF parser — extract key tags from IFD0 and EXIF IFD
    const str = exifBuffer.toString("binary");
    const tags: Record<string, any> = {};

    // Look for common EXIF strings
    const patterns: [string, RegExp][] = [
      ["Make", /Make\x00[^\x00]{0,2}([A-Za-z][A-Za-z0-9 .]+)/],
      ["Model", /Model\x00[^\x00]{0,2}([A-Za-z][A-Za-z0-9 .\-/]+)/],
      ["DateTimeOriginal", /(\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2})/],
    ];

    for (const [key, regex] of patterns) {
      const match = str.match(regex);
      if (match) tags[key] = match[1];
    }

    return Object.keys(tags).length > 0 ? tags : null;
  } catch {
    return null;
  }
}

function parseExifDate(dateStr: string): Date | null {
  try {
    // EXIF format: "2024:03:15 07:23:45"
    const fixed = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const d = new Date(fixed);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function parseDMS(dms: string, ref: string): number | null {
  try {
    const parts = dms.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length < 3) return null;
    let decimal = parts[0] + parts[1] / 60 + parts[2] / 3600;
    if (ref === "S" || ref === "W") decimal = -decimal;
    return decimal;
  } catch {
    return null;
  }
}

