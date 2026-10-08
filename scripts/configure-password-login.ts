import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/password-crypto";

// Read credentials from stdin, never command-line arguments or source defaults.
async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error("Input is too large.");
  }
  const value = JSON.parse(input);
  if (
    typeof value.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
    typeof value.password !== "string"
  )
    throw new Error("Provide email and password.");
  const hash = await hashPassword(value.password);
  const keys: Record<string, string> = {
    AIBEAN_AUTH_MODE: "password",
    LOCAL_LOGIN_EMAIL: value.email.trim().toLowerCase(),
    LOCAL_LOGIN_PASSWORD_HASH: hash,
    LOCAL_SESSION_SECRET: randomBytes(48).toString("hex"),
  };
  let current = "";
  try {
    current = await readFile(".env.local", "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const lines = current
    .split(/\r?\n/)
    .filter(
      (line) => !Object.keys(keys).some((key) => line.startsWith(`${key}=`)),
    );
  if (!lines.some((line) => line.startsWith("NEXT_PUBLIC_APP_URL=")))
    lines.push("NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000");
  await writeFile(
    ".env.local",
    [
      ...lines,
      ...Object.entries(keys).map(([key, val]) => `${key}=${val}`),
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  console.log(
    "Password login configured. Only a salted password hash and a random signing secret were saved. Existing sessions are invalidated.",
  );
}
main().catch(() => {
  console.error(
    "Login setup failed. Check input format and password policy; credentials were not printed.",
  );
  process.exitCode = 1;
});
