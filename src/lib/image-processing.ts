import sharp from "sharp";

const WATERMARK_TEXT = "© SurfShots";

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

  // Create SVG watermark overlay
  const svgWatermark = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          fill: rgba(255, 255, 255, 0.4);
          font-size: ${Math.round(width / 15)}px;
          font-family: Arial, sans-serif;
          font-weight: bold;
        }
      </style>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
            class="watermark" transform="rotate(-30, ${width / 2}, ${height / 2})">
        ${WATERMARK_TEXT}
      </text>
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
