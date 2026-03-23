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

/** Index faces in a photo (called during upload) */
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
      MaxFaces: 10, // index up to 10 faces per photo
      QualityFilter: "AUTO",
    }));

    return result.FaceRecords?.length || 0;
  } catch (err: any) {
    console.error("Index faces error:", err.message);
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
  try {
    const result = await rekognition.send(new SearchFacesByImageCommand({
      CollectionId: `session-${sessionId}`,
      Image: { Bytes: selfieBuffer },
      FaceMatchThreshold: threshold,
      MaxFaces: 50,
    }));

    if (!result.FaceMatches) return [];

    // Group by photo (ExternalImageId) and take highest similarity per photo
    const photoMap = new Map<string, number>();
    for (const match of result.FaceMatches) {
      const photoId = match.Face?.ExternalImageId;
      const similarity = match.Similarity || 0;
      if (photoId && (!photoMap.has(photoId) || similarity > photoMap.get(photoId)!)) {
        photoMap.set(photoId, similarity);
      }
    }

    return Array.from(photoMap.entries())
      .map(([photoId, similarity]) => ({ photoId, similarity }))
      .sort((a, b) => b.similarity - a.similarity);
  } catch (err: any) {
    if (err.name === "InvalidParameterException" && err.message?.includes("no faces")) {
      return []; // No face detected in selfie
    }
    console.error("Search faces error:", err.message);
    throw err; // Let the caller handle it
  }
}

/** Delete face collection when session is deleted */
export async function deleteFaceCollection(sessionId: string): Promise<void> {
  if (!rekognition) return;
  try {
    await rekognition.send(new DeleteCollectionCommand({
      CollectionId: `session-${sessionId}`,
    }));
  } catch {
    // Collection might not exist
  }
}

/** Check image for prohibited content (returns labels if flagged) */
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

    const blocked = labels.some((l) =>
      ["Explicit Nudity", "Nudity", "Graphic Violence", "Violence", "Drugs", "Tobacco", "Alcohol"].some(
        (b) => l.toLowerCase().includes(b.toLowerCase())
      )
    );

    return { flagged: blocked, labels };
  } catch (err: any) {
    console.error("Moderation error:", err.message);
    return { flagged: false, labels: [] }; // Don't block on error
  }
}
