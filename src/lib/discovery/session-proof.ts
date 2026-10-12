import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function analyticsToken(secret: string, old: string, now = Date.now()) {
  if (secret.length < 32)
    throw new Error("Private analytics secret is required.");
  const mac = (s: string) =>
    createHmac("sha256", secret).update(s).digest("hex");
  const parts = old.split("."),
    [nonce, time, signature] = parts,
    base = nonce + "." + time;
  const valid =
    parts.length === 3 &&
    /^[a-f0-9]{32}$/.test(nonce || "") &&
    /^\d{13}$/.test(time || "") &&
    /^[a-f0-9]{64}$/.test(signature || "") &&
    Number(time) <= now &&
    now - Number(time) < 1800000 &&
    timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(mac(base), "hex"),
    );
  const token = valid ? base : randomBytes(16).toString("hex") + "." + now;
  return {
    value: token + "." + mac(token),
    hash: createHash("sha256").update(token).digest("hex"),
    renew: !valid,
  };
}
