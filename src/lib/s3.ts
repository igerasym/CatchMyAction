import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const IS_LOCAL = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";

// --- S3 client (production) ---
const s3 = IS_LOCAL
  ? null
  : new S3Client({
      region: process.env.AWS_REGION!,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined, // Use IAM role on ECS
    });

export const BUCKET_ORIGINALS = process.env.S3_BUCKET_ORIGINALS || "originals";
export const BUCKET_PREVIEWS = process.env.S3_BUCKET_PREVIEWS || "previews";

// --- Local file helpers ---
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Save a file (S3 in prod, local in dev) */
export async function putObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType = "image/jpeg"
): Promise<void> {
  if (IS_LOCAL) {
    const filePath = path.join(UPLOAD_DIR, bucket, key);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, body);
    return;
  }

  await s3!.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Get the public URL for preview files */
export function getPreviewUrl(key: string): string {
  if (IS_LOCAL) {
    return `/api/uploads/${BUCKET_PREVIEWS}/${key}`;
  }
  return `https://${BUCKET_PREVIEWS}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/** Generate a signed download URL */
export async function getDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 300
): Promise<string> {
  if (IS_LOCAL) {
    return `/api/uploads/${bucket}/${key}`;
  }

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3!, command, { expiresIn });
}

/** Delete an object */
export async function deleteObject(
  bucket: string,
  key: string
): Promise<void> {
  if (IS_LOCAL) {
    const filePath = path.join(UPLOAD_DIR, bucket, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  await s3!.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export { s3 };
