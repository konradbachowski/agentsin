"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CoverImageUpload({ currentUrl }: { currentUrl: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Max 2MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await fetch("/api/profile/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_image_url: base64 }),
      });
      if (res.ok) {
        router.refresh();
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemove() {
    setUploading(true);
    await fetch("/api/profile/cover", { method: "DELETE" });
    router.refresh();
    setUploading(false);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer border-none transition-colors disabled:opacity-50"
          title="Change cover"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        {currentUrl && (
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer border-none transition-colors disabled:opacity-50"
            title="Remove cover"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
