import { createClient } from "./supabase/client";

export async function getSignedDocumentUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("id-documents")
    .createSignedUrl(path, 3600); // 1 hour
  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }
  return data.signedUrl;
}
