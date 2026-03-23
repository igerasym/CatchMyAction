import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DeleteCollectionCommand,
  DetectModerationLabelsCommand,
} from "@aws-sdk/client-rekognition";

const IS_LOCAL = !process.env.AWS_REGION || process.env.USE_LOCAL_STORAGE === "true";

const rekognition = IS_LOCAL
  ? null
  : new RekognitionClient({
      region: process.env.AWS_REGION!,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined, // IAM role on EC2
    });

const ORIGINALS_BUCKET = process.env.S3_BUCKET_ORIGINALS || "originals";

// Rekognition ExternalImageId only allows [a-zA-Z0-9_.\-:]
function sanitizeExternalId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_.\-:]/g, "_");
}

/** Create a face collection for a session */
export async function createFaceCollection(sessionId: string): Promise<boolean> {
  if (!rekognition) return false;
  try {
    await rekognition.send(new CreateCollectionCommand({
      CollectionId: `session-${sessionId}`,
    }));
    return true;
  } catch (err: any) {
    if (err.name === "ResourceAlreadyExistsException") return true;
    console.error("Create collection error:", err.message);
    return false;
  }
}

/** Index faces in a photo (called during upload).
 *  Uses S3 reference — no need to download the image. */
export async function indexFacesInPhoto(
  sessionId: string,
  photoId: string,
  s3Key: string
): Promise<number> {
  if (!rekognition) return 0;
  try {
    // Ensure collection exists
    await createFaceCollection(sessionId);

    const result = await rekognition.send(new IndexFacesCommand({
      CollectionId: `session-${sessionId}`,
      Image: {
        S3Object: {
          Bucket: ORIGINALS_BUCKET,
          Name: s3Key,
        },
      },
      ExternalImageId: photoId,
      DetectionAttributes: ["DEFAULT"],
      MaxFaces: 10,
      QualityFilter: "AUTO",
    }));

    const indexed = result.FaceRecords?.length || 0;
    if (indexed > 0) {
      console.log(`Indexed ${indexed} face(s) in photo ${photoId} for session ${sessionId}`);
    }
    return indexed;
  } catch (err: any) {
    // Don't fail upload if face indexing fails
    console.error(`Index faces error for photo ${photoId}:`, err.message);
    return 0;
  }
}

/** Search for matching faces using a selfie image buffer */
export async function searchFacesBySelfie(
  sessionId: string,
  selfieBuffer: Buffer,
  threshold = 70
): Promise<{ photoId: string; similarity: number }[]> {
  if (!rekognition) return [];

  const result = await rekognition.send(new SearchFacesByImageCommand({
    CollectionId: `session-${sessionId}`,
    Image: { Bytes: selfieBuffer },
    FaceMatchThreshold: threshold,
    MaxFaces: 50,
  }));

  if (!result.FaceMatches || result.FaceMatches.length === 0) return [];

  // Group by photo (ExternalImageId) and take highest similarity per photo
  const photoMap = new Map<string, number>();
  for (const match of result.FaceMatches) {
    const rawId = match.Face?.ExternalImageId;
    if (!rawId) continue;
    // Restore original photoId (underscores back to hyphens if needed)
    const photoId = rawId;
    const similarity = match.Similarity || 0;
    if (!photoMap.has(photoId) || similarity > photoMap.get(photoId)!) {
      photoMap.set(photoId, similarity);
    }
  }

  return Array.from(photoMap.entries())
    .map(([photoId, similarity]) => ({ photoId, similarity }))
    .sort((a, b) => b.similarity - a.similarity);
}

/** Delete face collection when session is deleted */
export async function deleteFaceCollection(sessionId: string): Promise<void> {
  if (!rekognition) return;
  try {
    await rekognition.send(new DeleteCollectionCommand({
      CollectionId: `session-${sessionId}`,
    }));
  } catch {
    // Collection might not exist — that's fine
  }
}

/** Check image for prohibited content */
export async function moderateImage(
  imageBytes: Buffer
): Promise<{ flagged: boolean; labels: string[] }> {
  if (!rekognition) return { flagged: false, labels: [] };
  try {
    const result = await rekognition.send(new DetectModerationLabelsCommand({
      Image: { Bytes: imageBytes },
      MinConfidence: 70,
    }));

    const labels = (result.ModerationLabels || [])
      .filter((l) => l.Confidence && l.Confidence >= 70)
      .map((l) => l.Name || "Unknown");

    // Block explicit content categories
    const blockedCategories = [
      "explicit nudity", "nudity", "graphic violence",
      "violence", "drugs", "tobacco",
    ];
    const flagged = labels.some((l) =>
      blockedCategories.some((b) => l.toLowerCase().includes(b))
    );

    return { flagged, labels };
  } catch (err: any) {
    console.error("Moderation error:", err.message);
    return { flagged: false, labels: [] }; // Don't block upload on moderation error
  }
}
