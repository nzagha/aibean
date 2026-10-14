import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
export function accountOverlays() {
  const map: Record<string, string> = {
    "src/lib/password-auth.ts": `import "server-only";
import { cookies } from "next/headers";
import { qaAuth, qaSettings } from "./local-qa-auth/runtime";
import { ACCESS_COOKIE, RECOVERY_COOKIE } from "./local-qa-auth/core";
export const PASSWORD_COOKIE=ACCESS_COOKIE;
export const passwordMode=()=>process.env.AIBEAN_AUTH_MODE==="password";
export function passwordConfiguration(){qaSettings();return {email:"Local QA account"};}
export async function passwordIdentity(){const store=await cookies();if(store.get(RECOVERY_COOKIE))return null;return qaAuth().identity(store.get(ACCESS_COOKIE)?.value);}
`,
    "src/components/auth-page.tsx": `export { LocalQaAuthPage as AuthPage } from "./local-qa-auth-page";\n`,
    "src/app/account/security/page.tsx": `import { LocalQaSecurity } from "@/components/local-qa-security";
export const dynamic="force-dynamic";
export const metadata={title:"Account security",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){return <LocalQaSecurity {...await searchParams}/>;}
`,
    "src/app/local-mailbox/page.tsx": `import { LocalQaMailbox } from "@/components/local-qa-mailbox";
export const dynamic="force-dynamic";
export const metadata={title:"Private local mailbox",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){return <LocalQaMailbox {...await searchParams}/>;}
`,
  };
  for (const [route, operation] of Object.entries({
    "api/auth/login": "login",
    "api/auth/register": "register",
    "api/auth/logout": "logout",
    "api/auth/reset": "reset",
    "api/local-qa/forgot": "forgot",
    "api/local-qa/exchange": "exchange",
    "api/local-qa/change": "change",
    "api/local-qa/mailbox": "mailbox",
  })) {
    map[`src/app/${route}/route.ts`] =
      `import type { NextRequest } from "next/server";
import { qaPost } from "@/lib/local-qa-auth/handler";
export const runtime="nodejs";
export function POST(request:NextRequest){return qaPost("${operation}",request);}
`;
  }
  for (const [route, view] of [
    ["forgot-password", "forgot"],
    ["reset-password", "reset"],
  ])
    map[`src/app/${route}/page.tsx`] =
      `import { AuthPage } from "@/components/auth-page";
export const dynamic="force-dynamic";
export const metadata={title:"Local account ${view}",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;status?:string}>}){return <AuthPage view="${view}" {...await searchParams}/>;}
`;
  map["src/lib/db/local-acceptance-config.ts"] = readFileSync(
    "src/lib/db/local-acceptance-config.ts",
    "utf8",
  ).replace("now + 2 * 3600_000", "now + 13 * 3600_000");
  map["src/app/account/page.tsx"] = readFileSync(
    "src/app/account/page.tsx",
    "utf8",
  ).replace(
    '<Link href="/pricing"',
    '<Link href="/account/security" className="text-link">Account security →</Link>\n        <Link href="/pricing"',
  );
  return map;
}
export function applyAccountOverlays(root: string) {
  for (const [path, body] of Object.entries(accountOverlays())) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
}
