import sharp from "sharp";

/** Create a watermarked preview (max 1200px wide, 60% quality) */
export async function createPreview(
  inputBuffer: Buffer
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const width = Math.min(metadata.width || 1200, 1200);
  const height = Math.round(
    width * ((metadata.height || 800) / (metadata.width || 1200))
  );

  const fontSize = Math.round(width / 18);
  const smallFont = Math.round(fontSize * 0.45);

  // Stylish diagonal watermark pattern
  const svgWatermark = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .brand { 
            fill: rgba(255,255,255,0.18); 
            font-family: Arial, Helvetica, sans-serif;
            font-weight: 800;
            letter-spacing: 2px;
          }
          .sub {
            fill: rgba(255,255,255,0.12);
            font-family: Arial, Helvetica, sans-serif;
            font-weight: 400;
            letter-spacing: 4px;
          }
        </style>
      </defs>
      <!-- Center watermark -->
      <g transform="rotate(-25, ${width / 2}, ${height / 2})">
        <text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle"
              class="brand" font-size="${fontSize}">
          CATCH MY ACTION
        </text>
        <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
              class="sub" font-size="${smallFont}">
          catchmyaction.com
        </text>
      </g>
      <!-- Repeating pattern corners -->
      <g transform="rotate(-25, ${width * 0.2}, ${height * 0.2})">
        <text x="${width * 0.2}" y="${height * 0.2}" text-anchor="middle"
              class="sub" font-size="${smallFont}">
          CATCH MY ACTION
        </text>
      </g>
      <g transform="rotate(-25, ${width * 0.8}, ${height * 0.8})">
        <text x="${width * 0.8}" y="${height * 0.8}" text-anchor="middle"
              class="sub" font-size="${smallFont}">
          CATCH MY ACTION
        </text>
      </g>
      <g transform="rotate(-25, ${width * 0.15}, ${height * 0.75})">
        <text x="${width * 0.15}" y="${height * 0.75}" text-anchor="middle"
              class="sub" font-size="${smallFont}">
          CATCH MY ACTION
        </text>
      </g>
      <g transform="rotate(-25, ${width * 0.85}, ${height * 0.25})">
        <text x="${width * 0.85}" y="${height * 0.25}" text-anchor="middle"
              class="sub" font-size="${smallFont}">
          CATCH MY ACTION
        </text>
      </g>
    </svg>
  `;

  const buffer = await image
    .resize(width, height, { fit: "inside" })
    .composite([{ input: Buffer.from(svgWatermark), gravity: "center" }])
    .jpeg({ quality: 60 })
    .toBuffer();

  return { buffer, width, height };
}

/** Create a small thumbnail (400px wide) */
export async function createThumbnail(
  inputBuffer: Buffer
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(400, null, { fit: "inside" })
    .jpeg({ quality: 50 })
    .toBuffer();
}

/** Get image dimensions and size */
export async function getImageMetadata(
  inputBuffer: Buffer
): Promise<{ width: number; height: number; size: number }> {
  const metadata = await sharp(inputBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
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

