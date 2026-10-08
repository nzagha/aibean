# Temporary email and password login

The requested test account is configured locally in the ignored `.env.local`. No plaintext password is saved in application source or browser storage. Other sign-in providers and public registration are disabled while `AIBEAN_AUTH_MODE=password`.

Password setup requires 8–128 characters, at least one uppercase ASCII letter, one digit, and one special character. The user’s request for “1 character” is interpreted as a special character. Setup enforces this policy server-side; the form also shows and enforces it in the browser.

Passwords are stored as salted scrypt hashes. Authentication sets an HMAC-signed, HttpOnly, SameSite=Lax cookie valid for eight hours (Secure on HTTPS). Sessions are bound to the current account and password hash. Reconfiguring the password or signing secret invalidates existing sessions. Logout clears the browser cookie. Cookie verification takes place on the server, never in localStorage.

Login/logout accept same-origin POST requests only. The temporary single-process server allows ten login attempts per fifteen-minute window. This intentionally simple limiter must be replaced with a shared durable limiter before scaling beyond one process. Do not treat this single test account as a full public account system.

## Reconfiguration

`npx tsx scripts/configure-password-login.ts` reads a JSON object containing `email` and `password` from stdin. It validates the policy, writes a fresh hash and signing secret to `.env.local`, preserves unrelated environment entries, and never prints credentials. Restart the server after changes if automatic environment reload does not occur. Never include `.env.local` in version archives.

Set `AIBEAN_AUTH_MODE=clerk` and configure Clerk keys when implementing the later provider version. Password cookies are ignored in Clerk mode. The temporary user always begins without administrator or creator permissions. If PostgreSQL is configured later, ordinary roles are read from the existing users table; credentials alone never grant privileges.

Without PostgreSQL, `/account` confirms the signed-in identity and provides discovery links. Database-dependent requests redirect to the account setup status rather than throwing an error or pretending to save records. Browser exploration and comparisons continue to work independently. Database-backed saved tools, reviews, stacks and billing still require the planned service setup.

Validation includes password policy, salt uniqueness, wrong-password rejection, session tampering/expiry/rotation, actual HTTP login/logout, origin checks, protected account access, safe redirects and exclusion from admin access.
