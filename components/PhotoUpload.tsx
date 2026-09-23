"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

export async function uploadFile(file: File, folder: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("vehicle-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message || "Upload fail hua");
  const { data } = supabase.storage.from("vehicle-images").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

function PhotoPreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Uploaded photo" className="h-full w-full object-contain" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-full bg-stone-900/70 p-1 text-white hover:bg-red-600"
        aria-label="Remove photo"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function PhotoUpload({
  urls,
  onChange,
  folder,
  max = 10,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - urls.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setError("");
    const newUrls: string[] = [];
    try {
      for (const file of toUpload) {
        const { url } = await uploadFile(file, folder);
        newUrls.push(url);
      }
      onChange([...urls, ...newUrls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fail hua. Dobara try karo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map((url, i) => (
          <PhotoPreview
            key={url}
            url={url}
            onRemove={() => onChange(urls.filter((_, idx) => idx !== i))}
          />
        ))}
        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-video flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-stone-400 transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {uploading ? <Spinner /> : (
              <>
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <span className="mt-1 text-xs font-medium">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-1.5 text-xs text-stone-400">
        {urls.length}/{max} photos • JPG / PNG, up to 10 MB each
      </p>
    </div>
  );
}