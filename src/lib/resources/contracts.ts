import { createHash, randomUUID } from "node:crypto";
import { AdminWorkflowError } from "../admin/contracts";
import { PROPOSED_PRICING } from "../pricing/config";
export const MAX_RESOURCE_BYTES = PROPOSED_PRICING.fileMaxBytes;
const types: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
export function validateResource(file: {
  name: string;
  mime: string;
  bytes: Uint8Array;
}) {
  if (
    file.name.length > 150 ||
    /[\\/]/.test(file.name) ||
    Array.from(file.name).some((c) => c.charCodeAt(0) < 32)
  )
    throw new AdminWorkflowError(
      "Use a simple filename without folders or control characters.",
    );
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = types[extension];
  if (!mime || file.mime !== mime)
    throw new AdminWorkflowError(
      "Upload a PDF, UTF-8 TXT/CSV, PNG, JPEG or WebP with its matching MIME type.",
    );
  if (!file.bytes.length || file.bytes.length > MAX_RESOURCE_BYTES)
    throw new AdminWorkflowError(
      "Files must be nonempty and no larger than 5 MB.",
    );
  const b = Buffer.from(file.bytes);
  let valid: boolean;
  if (extension === "pdf")
    valid =
      b.subarray(0, 5).toString() === "%PDF-" &&
      b.subarray(-1024).toString().includes("%%EOF");
  else if (extension === "png")
    valid = b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  else if (extension === "jpg" || extension === "jpeg")
    valid =
      b.length >= 4 &&
      b[0] === 255 &&
      b[1] === 216 &&
      b[2] === 255 &&
      b[b.length - 2] === 255 &&
      b[b.length - 1] === 217;
  else if (extension === "webp")
    valid =
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WEBP";
  else {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(b);
      valid =
        !b.includes(0) &&
        !/<\s*(?:script|html|svg|iframe|object|embed)\b/i.test(text);
    } catch {
      valid = false;
    }
  }
  if (!valid)
    throw new AdminWorkflowError(
      "The file contents do not match the permitted type. HTML, SVG and executable files are not allowed.",
    );
  const id = randomUUID(),
    filename = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_");
  return {
    id,
    filename,
    mime,
    bytes: b.length,
    sha256: createHash("sha256").update(b).digest("hex"),
    objectKey: "resources/" + id + "/" + randomUUID() + "." + extension,
  };
}
export type ResourceStore = {
  signImage?: (key: string) => Promise<string>;
  assertPrivate: () => Promise<void>;
  upload: (key: string, bytes: Uint8Array, mime: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  sign: (key: string, filename: string) => Promise<string>;
};
export type ResourceScanner = {
  scan: (bytes: Uint8Array) => Promise<"clean" | "infected">;
};
