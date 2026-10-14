> Current local account testing: the eight-hour preserving launcher, registration, password management and protected mailbox supersede the previous preview restrictions. See [the current account guide](LOCAL_AUTHENTICATION_AND_ACCOUNT_TESTING_GUIDE.md). The observations below are the historical first preview results.

# Private local QA account handoff

Four genuine synthetic password-mode personas were provisioned in a new disposable local PostgreSQL database. No hosted User or Supabase Auth account was created. Normal server authorization is unchanged. The two peer isolation fixtures have no login handoff.

| Persona | Login URL | Synthetic identity | Effective capability | Expected allowed / denied |
| --- | --- | --- | --- | --- |
| Ordinary User | http://127.0.0.1:3000/login | qa-user@local-aibean.invalid | Ordinary User | Account, own Stacks/saves; denied Admin, Creator publication and another owner's Tool |
| Admin | http://127.0.0.1:3002/login | qa-admin@local-aibean.invalid | Explicit local Admin; not Creator | Admin operations and own account; no automatic Creator capability |
| Creator | http://127.0.0.1:3003/login | qa-creator@local-aibean.invalid | Explicit Creator, approved application/profile | Own content/profile/analytics; denied Admin and another Creator's private draft |
| Vendor | http://127.0.0.1:3004/login | qa-vendor@local-aibean.invalid | Ordinary User with one independently approved Tool-owner relationship | Own Tool requests/analytics; denied Admin, Creator capability and peer-owned Tool |

Each has a distinct cryptographically generated strong password, scrypt password hash and session secret. No magic password, registration escalation or production authentication contract change was introduced. Fixture capability assignment is explicitly audited and cannot select a hosted connection.

## Retrieve passwords privately

Run this from the repository root in Codex Desktop's integrated PowerShell terminal:

```powershell
$qa = Get-Content .\test-results\local-website-qa-active.json -Raw | ConvertFrom-Json
notepad.exe $qa.credentialsPath
```

Open the file privately and copy the matching persona's email/password into its **exact** login URL. Do not paste the file into chat, run a terminal command that prints its contents, upload it or commit it. The credentials file is inside an owner-and-SYSTEM-only protected directory under Windows LocalAppData, outside OneDrive and outside the repository. `local-website-qa-active.json` identifies the exact current local location without embedding machine-specific private paths in this public report. A final check found workspace ACL inheritance had been reintroduced after setup, so the active handoff was moved outside the workspace and its restricted ACL was independently checked again.

Use `127.0.0.1`, not `localhost`. The application validates the trusted origin. Login/logout succeeded for all four personas in the actual HTTP suite. Real browser sign-ins and panel rendering were also exercised; screenshots contain only synthetic data.

Sessions use an HttpOnly, SameSite=Lax signed cookie. HTTP loopback development does not set the HTTPS-only Secure flag. Cookie hosts do not distinguish ports: signing in as one persona replaces the shared-host cookie in that browser profile, while the other previews reject its different signature. Use one persona at a time, or separate browser profiles for simultaneous testing. Ordinary account access still exists alongside approved Creator and Vendor workspaces.

Passwords and fixture data are regenerated on restart. The active preview lasts at most 110 minutes from setup, independently of the normal session's eight-hour cookie lifetime. Use the [recovery procedure](LOCAL_WEBSITE_RECOVERY_RESULT.md) when it expires. Previous fixture directories are retained privately, not published.

## Fixtures and boundary expectations

- Published Tool slugs: `acceptance-tool-1` (QA Vendor owned) and `acceptance-tool-2` (peer owned). Dynamic Tool IDs are visible through the Vendor workspace links; never reuse IDs from an older fixture.
- Approved Creator: `acceptance-creator`; published `acceptance-skill`, `acceptance-playbook`, `acceptance-event`, `acceptance-resource`.
- Another Creator owns `other-creator-private-draft`; it must not appear to the guest or QA Creator.
- There is a private User Stack and explicit audit history. HTTP/browser tests add a synthetic Admin draft, User Stack, Creator draft and pending Vendor edit request in their tested fixture only.
- Local fixtures intentionally use synthetic Tool/taxonomy labels. They do not modify the approved taxonomy source files or hosted taxonomy.
- Registration is deliberately unavailable in transitional password mode. Supabase Auth, SMTP, payments, uploads and external affiliates remain disabled/unconfigured for this preview.
