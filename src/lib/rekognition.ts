import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DeleteCollectionCommand,
  DeleteFacesCommand,
  ListFacesCommand,
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

// Which collection a session's faces live in is decided in src/lib/face-collections.ts (one per spot, else per session).

/** Create a face collection (no-op when it already exists). */
export async function createFaceCollection(collectionId: string): Promise<boolean> {
  if (!rekognition) return false;
  try {
    await rekognition.send(new CreateCollectionCommand({ CollectionId: collectionId }));
    return true;
  } catch (err: any) {
    if (err.name === "ResourceAlreadyExistsException") return true;
    console.error("Create collection error:", err.message);
    return false;
  }
}

/**
 * Index the faces in a photo into a collection (called during upload).
 * Uses an S3 reference, so no download. Returns the FaceIds created; store them so the faces can be deleted exactly.
 */
export async function indexFacesInPhoto(collectionId: string, photoId: string, s3Key: string): Promise<string[]> {
  if (!rekognition) return [];
  try {
    await createFaceCollection(collectionId);

    const result = await rekognition.send(new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { S3Object: { Bucket: ORIGINALS_BUCKET, Name: s3Key } },
      ExternalImageId: photoId, // a cuid: already within [a-zA-Z0-9_.\-:]
      DetectionAttributes: ["DEFAULT"],
      MaxFaces: 10,
      QualityFilter: "AUTO",
    }));

    const ids = (result.FaceRecords || []).map((r) => r.Face?.FaceId).filter((x): x is string => !!x);
    if (ids.length > 0) console.log(`Indexed ${ids.length} face(s) in photo ${photoId} into ${collectionId}`);
    return ids;
  } catch (err: any) {
    // Don't fail upload if face indexing fails
    console.error(`Index faces error for photo ${photoId}:`, err.message);
    return [];
  }
}

/**
 * Search a collection with a selfie. Returns photos (ExternalImageId) with their best similarity. A shared spot
 * collection holds many sessions, so ask for plenty of matches: callers filter them to the sessions they want.
 */
export async function searchFacesBySelfie(
  collectionId: string,
  selfieBuffer: Buffer,
  threshold = 70,
  maxFaces = 200
): Promise<{ photoId: string; similarity: number }[]> {
  if (!rekognition) return [];

  const result = await rekognition.send(new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: { Bytes: selfieBuffer },
    FaceMatchThreshold: threshold,
    MaxFaces: maxFaces,
  }));

  if (!result.FaceMatches || result.FaceMatches.length === 0) return [];

  // Group by photo (ExternalImageId) and take highest similarity per photo
  const photoMap = new Map<string, number>();
  for (const match of result.FaceMatches) {
    const photoId = match.Face?.ExternalImageId;
    if (!photoId) continue;
    const similarity = match.Similarity || 0;
    if (!photoMap.has(photoId) || similarity > photoMap.get(photoId)!) {
      photoMap.set(photoId, similarity);
    }
  }

  return Array.from(photoMap.entries())
    .map(([photoId, similarity]) => ({ photoId, similarity }))
    .sort((a, b) => b.similarity - a.similarity);
}

/** Delete a whole face collection (only ever a per-session one, never a shared spot collection). */
export async function deleteFaceCollection(collectionId: string): Promise<void> {
  if (!rekognition) return;
  try {
    await rekognition.send(new DeleteCollectionCommand({ CollectionId: collectionId }));
  } catch {
    // Collection might not exist — that's fine
  }
}

/** Delete faces by FaceId (Rekognition takes up to 4096 per call). */
export async function deleteFaces(collectionId: string, faceIds: string[]): Promise<void> {
  if (!rekognition || faceIds.length === 0) return;
  for (let i = 0; i < faceIds.length; i += 4000) {
    try {
      await rekognition.send(new DeleteFacesCommand({ CollectionId: collectionId, FaceIds: faceIds.slice(i, i + 4000) }));
    } catch (err: any) {
      if (err?.name !== "ResourceNotFoundException") console.error("Delete faces error:", err.message);
    }
  }
}

/**
 * Delete the faces of one photo by scanning the collection. Only for legacy photos indexed before FaceIds were kept
 * (their collection is that session's own, so it is small). Pages through ALL faces; the old version looked at the
 * first 100 only and silently left the rest behind.
 */
export async function deleteFacesForPhotoByScan(collectionId: string, photoId: string): Promise<void> {
  if (!rekognition) return;
  try {
    const faceIds: string[] = [];
    let next: string | undefined;
    do {
      const page = await rekognition.send(new ListFacesCommand({ CollectionId: collectionId, MaxResults: 4096, NextToken: next }));
      for (const f of page.Faces || []) if (f.ExternalImageId === photoId && f.FaceId) faceIds.push(f.FaceId);
      next = page.NextToken;
    } while (next);
    await deleteFaces(collectionId, faceIds);
  } catch {
    // Non-critical — don't fail photo deletion
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

    // Block explicit content — allow shirtless athletes (normal for action sports)
    const blockedCategories = [
      "explicit nudity", "sexual activity", "graphic violence",
      "drugs", "tobacco", "graphic female nudity", "graphic male nudity",
      "sexual situations",
    ];
    // Explicitly allow these (common in action sports photos)
    const allowedLabels = [
      "exposed male nipple", "barechested male", "male swimwear",
      "female swimwear", "revealing clothes",
    ];
    const flagged = labels.some((l) => {
      const lower = l.toLowerCase();
      if (allowedLabels.some((a) => lower.includes(a))) return false;
      return blockedCategories.some((b) => lower.includes(b));
    });

    return { flagged, labels };
  } catch (err: any) {
    console.error("Moderation error:", err.message);
    return { flagged: false, labels: [] }; // Don't block upload on moderation error
  }
}
