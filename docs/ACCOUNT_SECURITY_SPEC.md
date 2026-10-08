# Account security and MFA specification

Planned behavior; not implemented in the Stage 1 repository foundation. Supabase manages credentials and factors. No second identity service, enterprise login, anonymous identity or wallet method is permitted.

## Account changes and recovery

Password changes require fresh verified identity and provider-supported reauthentication. Forgot-password requests return a uniform response; reset requires a valid recovery flow and handles expired/replayed links. Preserve the owner-approved password minimum in both client/server validation and provider configuration. Do not log passwords, OTPs, session tokens, recovery links or factor secrets.

Email changes require the provider's verification workflow; the old identity remains canonical until confirmation. Phone changes require provider delivery and verification of the new international number; a display change is not proof of ownership. Keep internal User IDs and ownership stable throughout.

Logout uses a POST action with origin protection and explicit local/global Supabase scope. Session refresh must preserve cookies and avoid public caches. Revocation does not guarantee instant invalidation of already-issued access JWTs: define expiry/revocation checks for sensitive operations and test copied/revoked token behavior. Do not label cookie removal alone as complete session revocation.

## MFA

TOTP: enroll -> display secret/QR only to the current user -> challenge/verify -> mark verified -> enforce AAL2 where required. Cancel and clean up incomplete enrollment safely. Rate-limit invalid codes; never persist factor secrets in application records/logs.

Phone MFA: enable only when the project supports it and a tested delivery provider/channel exists. Validate numbers, resend cooldown, expiration, failed delivery and rate limits. Do not imply SMS/WhatsApp is operational from SDK types alone.

Factor removal and identity unlinking require recent proof, appropriate AAL and assurance that an approved sign-in/recovery method remains. Privileged accounts must not downgrade themselves around mandatory step-up. Test enrollment from AAL1, challenge to AAL2, invalid/expired/replayed codes, foreign factor IDs and failed removal.

Recovery policy: encourage an additional supported factor/recovery sign-in method. Do not invent Supabase recovery-code support or use a Magic Link as an automatic MFA bypass. Lost-all-factor cases need an audited operator procedure with strong ownership verification; the precise support process is a pre-release decision. No unattended privilege reset based on matching email.

## Connected identities and passkeys

Link only eligible providers using Supabase's authenticated linking workflow. Never accept a target internal User ID from the client to merge accounts. Reject conflicts without transferring existing ownership. Test same-account continuity, cross-account attempts, provider cancellation and last-method unlinking.

Passkeys remain explicitly experimental and disabled until selected SDK/project compatibility is demonstrated. Enrollment requires a confirmed existing identity. Verify HTTPS/browser support, stable RP ID/origins, registration, sign-in, listing/removal and recovery on a second device. Production activation needs explicit validation. Preserve an approved alternative sign-in method.

Every security route uses the current branded form components with accessible loading, error, success and retry states. Registration/provider availability is an operator decision; normal users cannot configure custom issuers or elevate capabilities.
