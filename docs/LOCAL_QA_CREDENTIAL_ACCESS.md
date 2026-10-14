# Private local QA credential access

Use the current protected handoff rather than an old browser-saved password:

```powershell
powershell.exe -NoProfile -File scripts/local-website-qa/open-desktop-test-access.ps1
```

The helper verifies actual login/logout for each persona and opens Notepad. It reports active/expired lease, stopped or stale runner PID, verified credentials, rejected/stale credentials, rate limiting or unreachable server. No password, token or database URL is logged.

To open the file directly without printing it:

```powershell
$qa = Get-Content .\test-results\local-website-qa-active.json -Raw | ConvertFrom-Json
powershell.exe -NoProfile -File scripts/local-website-qa/open-desktop-test-access.ps1
```

`$qa.credentialsPath` is the worker's virtual path, verified beneath the owner-and-SYSTEM-only Windows LocalAppData QA directory, outside OneDrive and Git. Packaged Codex Desktop redirects AppData into its private package cache; the shorter virtual path may not exist in the owner's desktop view. The new helper resolves the existing file handle's physical path, validates its scope and owner/SYSTEM ACL, and opens that exact file in Notepad. It does not copy credentials or widen permissions. Do not paste the virtual path directly into an external editor.

The handoff contains four distinct persona passwords and a separate local-mailbox password. Do not upload it, paste it into chat or use `Get-Content` to print the credential file. Registered User passwords are hashed in the private local schema and never added to this handoff.

During the synthetic browser acceptance journey only, open its separately protected test inputs with:

```powershell
powershell.exe -NoProfile -File scripts/local-website-qa/open-desktop-test-access.ps1 -Kind BrowserJourney
```

The original v2 `open-test-access.ps1` remains historical source for its sealed proposal; use the desktop-aware helper above. No historical installer mechanism was regenerated.

Normal restarts preserve passwords. Explicit fixture changes/resets update the handoff; reopen it afterward. If a prior saved password fails, first confirm the lease/server status, then use the current handoff. The helper does not compare against browser password-manager storage. It verifies the currently saved handoff against the actual endpoint and tells you when older copies may be stale. Rate-limited verification is inconclusive; wait before retrying.

See [the account guide](LOCAL_AUTHENTICATION_AND_ACCOUNT_TESTING_GUIDE.md) for startup, shutdown and deliberate rotation. Failed or uncertain rotations retain private candidate/previous files and require operator inspection; never retry automatically. The current four fixture passwords were preserved.
