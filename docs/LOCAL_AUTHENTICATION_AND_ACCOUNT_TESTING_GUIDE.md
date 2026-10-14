# Local authentication and account testing

This guide supersedes the earlier 110-minute preview and disabled-registration instructions. It applies only to the explicit development QA launcher, using the existing disposable PostgreSQL fixture. Hosted Supabase and production authentication are unchanged. No external email is sent.

## Open the website and credentials

From the repository root in the Codex integrated PowerShell terminal:

```powershell
powershell.exe -NoProfile -File scripts/local-website-qa/open-test-access.ps1
```

This checks the actual four login endpoints, prints their status and lease expiry, and opens the current protected credential handoff in Notepad. Passwords are never printed. If an endpoint reports rate limiting, wait 15 minutes; that result does not establish a stale password. Avoid repeated probes during that window.

| Persona | Username | Login | Control panel |
| --- | --- | --- | --- |
| User | qa-user@local-aibean.invalid | http://127.0.0.1:3000/login | http://127.0.0.1:3000/account |
| Admin | qa-admin@local-aibean.invalid | http://127.0.0.1:3002/login | http://127.0.0.1:3002/admin |
| Creator | qa-creator@local-aibean.invalid | http://127.0.0.1:3003/login | http://127.0.0.1:3003/creator |
| Vendor | qa-vendor@local-aibean.invalid | http://127.0.0.1:3004/login | http://127.0.0.1:3004/vendor |

Homepage: http://127.0.0.1:3000/. All four personas can also use the common 3000 origin and its appropriate panel. The other ports preserve previous bookmarks and separate development source snapshots. They share the local identity/session database; switching a login replaces the browser's active account. Use separate browser profiles for simultaneous personas. Cookies are host-scoped, not isolated by port. Server-side capability and ownership checks still apply.

## Register and confirm an ordinary User

1. Open http://127.0.0.1:3000/register. Use a fresh synthetic address ending in `.invalid`, never one of the four fixture usernames.
2. Enter a password and confirmation: 8–128 characters, including an uppercase letter, a number and a special character.
3. Submit. An eligible request produces a message in the local mailbox; duplicates receive the same generic response and cannot overwrite credentials.
4. Open http://127.0.0.1:3000/local-mailbox. Use the separate mailbox password in the protected handoff. Select the message matching your new address and click **Confirm email**.
5. Sign in at http://127.0.0.1:3000/login and open `/account`.

Unconfirmed accounts cannot sign in. New accounts have stable internal IDs and ordinary permissions only. Registration cannot assign Admin, Creator or Tool ownership. Remember your chosen password privately; newly registered passwords are not written to the four-persona handoff.

## Change a password

Sign in, follow **Account security** to http://127.0.0.1:3000/account/security, and enter the current password, new password and matching confirmation. An incorrect current password is rejected. A successful change returns to Login and revokes all prior access/recovery sessions and unused confirmation/reset tokens. Sign in with the new password; the old password must fail. Identity, capabilities and owned resources are preserved.

An explicit change/reset for a preconfigured persona updates its protected handoff. If the private handoff cannot be updated after the database commit, the redirect marks it stale; use the password you just chose and inspect the protected files before rotating. There is no automatic retry or credential reset.

## Recover a forgotten password

1. Open http://127.0.0.1:3000/forgot-password and request recovery for your confirmed synthetic account.
2. The response is generic for existing and absent accounts. Open the protected local mailbox and select your own recovery message.
3. Click **Continue password reset**. The single-use token is exchanged through POST into a separate, short-lived recovery cookie. No token appears in a public URL.
4. At http://127.0.0.1:3000/reset-password enter and confirm a new password. A bare reset page without a valid recovery session cannot replace any credential.
5. Sign in with the new password. Old credentials and prior sessions must fail. Expired or reused messages require a new request.

Confirmation/reset tokens and recovery sessions expire after 15 minutes. The owner mailbox session and normal access sessions last at most eight hours and are additionally bounded by the active QA lease. Mailbox access is an operator test transport with access to synthetic messages, not a production end-user mailbox or SMTP service. Do not screenshot hidden tokens or publish its contents.

## Start, stop and extend

```powershell
# Stop only the owned current QA processes; preserve data and credentials.
powershell.exe -NoProfile -File scripts/local-website-qa/stop.ps1
# Wait until the four listeners close, then resume the same fixture.
powershell.exe -NoProfile -File scripts/local-website-qa/start-account-testing.ps1 -LeaseHours 8
powershell.exe -NoProfile -File scripts/local-website-qa/open-test-access.ps1
```

LeaseHours accepts 1–12. Startup is asynchronous; the access helper reports when login is actually available. A normal restart preserves the database, registered identities, password hashes and four current passwords. It creates new source snapshots so code changes take effect. The runner is not a Windows service and does not survive reboot. Occupied ports stop startup without killing unrelated processes. Historical backups, recovery targets and snapshots are retained.

Never use ordinary `npm run dev` as this QA restart command: that can load the owner's different private configuration. The legacy `start.ps1` now delegates to the preserving launcher when the active manifest is v2. Do not remove the active manifest or initialize another fixture to resolve a stale password.

Deliberate four-persona rotation requires a separate operator action:

```powershell
powershell.exe -NoProfile -File scripts/local-website-qa/rotate-test-credentials.ps1 -ConfirmRotation
```

It preserves identities/resources, revokes their sessions, keeps private proposed/previous handoffs and writes new credentials only on a confirmed database commit. It is never run on restart. Do not run it concurrently with manual password changes. Current persona passwords were not rotated during this task; the rotation command is implemented but has not been executed against them.

## Limits and evidence

See [test results](LOCAL_AUTHENTICATION_TEST_RESULTS.md) and [manual panel checklist](FOUR_PANEL_MANUAL_TESTING_CHECKLIST.md). This is a strictly local QA adapter, not an operational hosted Supabase Auth release. Docker's Linux engine was unavailable during inspection, and the reviewed candidate configuration binds the hosted project; no Docker/provider settings were changed. Production source, frozen SQL/mechanisms and private `.env.local` remain unchanged.

The existing local TLS certificate has a finite validity period. After it expires, startup must stop for local certificate renewal/review; it must not disable certificate verification. Keep the ignored synthetic fixture files private. Real SMTP, payments, Storage/scanning, affiliates and hosted release gates remain separate.
