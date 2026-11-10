/**
 * Phone selfies are often 5–12 MB; shrink to a ≤1600px JPEG (plenty for face matching, under the 5 MB API limit).
 * Browser-only (uses canvas). Returns the original file when the browser can't decode it (HEIC etc.), so the server can try.
 */
export async function prepareSelfie(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 4 * 1024 * 1024 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "selfie.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
