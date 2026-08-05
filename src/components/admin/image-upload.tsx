"use client";

import * as React from "react";
import Image from "next/image";
import { UploadCloud, Loader2, ImageIcon, X } from "lucide-react";
import { uploadFoodImage, isStorageConfigured } from "@/lib/upload";
import { toast } from "@/components/ui/sonner";

/**
 * Drag-and-drop (or click-to-browse) image upload for menu items/categories.
 * Uploads to Supabase Storage and reports the public URL via onChange.
 */
export function ImageUpload({
  value,
  onChange,
  label = "Item photo",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  if (!isStorageConfigured()) {
    return (
      <p className="text-xs text-muted-foreground">
        Image uploads are disabled — Supabase storage keys are not set.
      </p>
    );
  }

  const uploadFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, WEBP…)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFoodImage(file);
      onChange(url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">
              Drag &amp; drop a photo here, or <span className="text-primary">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG or WEBP · max 5 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void uploadFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {(value || uploading) && (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          {value && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
              <Image src={value} alt="Preview" fill sizes="64px" className="object-cover" />
            </div>
          )}
          {!uploading && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{value || "Uploading…"}</p>
              {value && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <X className="h-3 w-3" /> Remove photo
                </button>
              )}
            </div>
          )}
          {!value && !uploading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> No photo set
            </p>
          )}
        </div>
      )}
    </div>
  );
}