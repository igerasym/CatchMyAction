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
