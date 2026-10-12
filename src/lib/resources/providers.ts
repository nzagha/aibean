import "server-only";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PROJECT_URL } from "../supabase/config";
import type { ResourceStore } from "./contracts";
export function resourceProviderConfigured() {
  return (
    process.env.AIBEAN_RESOURCE_UPLOADS === "1" &&
    Boolean(process.env.AIBEAN_RESOURCE_BUCKET) &&
    /^sb_secret_[a-zA-Z0-9_-]+$/.test(
      process.env.AIBEAN_RESOURCE_STORAGE_SECRET || "",
    ) &&
    /^\d+$/.test(process.env.AIBEAN_CLAMAV_PORT || "")
  );
}
export function privateResourceStore(): ResourceStore {
  if (!resourceProviderConfigured())
    throw new Error(
      "Private resource storage/scanning has not been configured.",
    );
  const bucket = process.env.AIBEAN_RESOURCE_BUCKET!;
  if (!/^[a-z0-9-]{3,63}$/.test(bucket))
    throw new Error("Invalid private resource bucket.");
  const client = createClient(
    SUPABASE_PROJECT_URL,
    process.env.AIBEAN_RESOURCE_STORAGE_SECRET!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const target = client.storage.from(bucket);
  return {
    assertPrivate: async () => {
      const { data, error } = await client.storage.getBucket(bucket);
      if (error || !data || data.public)
        throw new Error("A verified private resource bucket is required.");
    },
    upload: async (key, bytes, mime) => {
      const { error } = await target.upload(key, bytes, {
        contentType: mime,
        upsert: false,
        cacheControl: "0",
      });
      if (error) throw new Error("Private resource upload failed.");
    },
    remove: async (key) => {
      const { error } = await target.remove([key]);
      if (error) throw new Error("New resource object cleanup failed.");
    },
    sign: async (key, filename) => {
      const { data, error } = await target.createSignedUrl(key, 60, {
        download: filename,
      });
      if (error || !data)
        throw new Error("Private resource download unavailable.");
      const url = new URL(data.signedUrl);
      if (
        url.origin !== SUPABASE_PROJECT_URL ||
        !url.pathname.startsWith("/storage/v1/object/sign/" + bucket + "/")
      )
        throw new Error("Invalid signed download destination.");
      return url.href;
    },
    signImage: async (key) => {
      const {data,error}=await target.createSignedUrl(key,60);
      if(error||!data)throw new Error("Private image unavailable.");
      const url=new URL(data.signedUrl);
      if(url.origin!==SUPABASE_PROJECT_URL||!url.pathname.startsWith("/storage/v1/object/sign/"+bucket+"/"))throw new Error("Invalid private image origin.");
      return url.href;
    },
  };
}
export { loopbackResourceScanner } from "./clamav";
