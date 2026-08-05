import { getSupabase } from "@/lib/realtime";

const BUCKET = "food-images";

export function isStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Uploads an image to the public `food-images` bucket and returns its public
 * URL. Client-side only (menu admin UI).
 */
export async function uploadFoodImage(file: File, folder = "menu"): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || `image/${safeExt}`,
  });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}