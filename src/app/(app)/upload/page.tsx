"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import SpotAutocompleteShared from "@/app/components/spot-autocomplete";

interface UploadState {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [locationValue, setLocationValue] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    total: 0, completed: 0, failed: 0, inProgress: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/upload");
    if (status === "authenticated" && user?.role !== "PHOTOGRAPHER") router.push("/");
  }, [status, user, router]);

  if (status !== "authenticated" || user?.role !== "PHOTOGRAPHER") {
    return <p className="text-center py-12 text-white/40">Loading...</p>;
  }

  async function handleCreateSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        location: locationValue,
        date: form.get("date"),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        description: form.get("description"),
        photographerId: user.id,
      }),
    });
    const data = await res.json();
    if (data.id) setSessionId(data.id);
    else alert(data.error || "Failed to create session");
  }

  async function handleUploadPhotos() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0 || !sessionId) return;
    const fileArray = Array.from(files);
    setUploadState({ total: fileArray.length, completed: 0, failed: 0, inProgress: true });

    const batchSize = 3;
    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("sessionId", sessionId);
          const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;
      setUploadState((p) => ({ ...p, completed: p.completed + ok, failed: p.failed + fail }));
    }
    setUploadState((p) => ({ ...p, inProgress: false }));
  }

  async function handlePublish() {
    if (!sessionId) return;
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    window.location.href = `/sessions/${sessionId}`;
  }

  if (!sessionId) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create a Session</h1>
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white/50 mb-1">Session Title</label>
            <input id="title" name="title" required placeholder="Morning session at Pipeline"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
          </div>
          <SpotAutocompleteShared value={locationValue} onChange={setLocationValue} label="Location" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-white/50 mb-1">Date</label>
              <input id="date" name="date" type="date" required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-white/50 mb-1">Start</label>
              <input id="startTime" name="startTime" type="time" required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-white/50 mb-1">End</label>
              <input id="endTime" name="endTime" type="time" required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white/50 mb-1">Description (optional)</label>
            <textarea id="description" name="description" rows={3} placeholder="4-6ft, offshore winds..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
          </div>
          <button type="submit"
            className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors">
            Create Session
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Upload Photos</h1>
      <p className="text-white/40 mb-6">Select up to 500 photos. They will be automatically watermarked.</p>
      <div className="space-y-4">
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="w-full" />
        {uploadState.total > 0 && (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{uploadState.completed} / {uploadState.total} uploaded</span>
              {uploadState.failed > 0 && <span className="text-red-400">{uploadState.failed} failed</span>}
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="bg-ocean-500 h-2 rounded-full transition-all"
                style={{ width: `${(uploadState.completed / uploadState.total) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleUploadPhotos} disabled={uploadState.inProgress}
            className="flex-1 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors">
            {uploadState.inProgress ? "Uploading..." : "Upload Photos"}
          </button>
          {uploadState.completed > 0 && !uploadState.inProgress && (
            <button onClick={handlePublish}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Publish Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
