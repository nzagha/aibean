# Saved versions

## Version 1.1

`aibean-version-1.1.zip` was saved on October 7, 2026, before behavioral interaction changes. It preserves tool logos, featured placements, the corrected responsive top menu, and the current brand/layout. `version-1.1.json` contains its SHA-256 checksum and file count. The restore procedure and exclusions below apply to both archives.

## Version 1

`aibean-version-1.zip` is the immutable brand/layout baseline saved on October 6, 2026, before adding tool logos. `version-1.json` records its SHA-256 checksum and file count.

The archive includes application source, original brand assets and fonts, dependency lockfile, database migrations, documentation, scripts and tests. It includes the featured placement work present at snapshot time. This is a source checkpoint, not a certification that every service is configured or launch-ready.

It excludes private environment files, database contents, dependencies, generated build output and original reference attachments. To restore for comparison, extract into a separate directory, run `npm ci`, provide any needed local configuration, and run `npm run dev` on an available port. Keep the current workspace intact when comparing versions.

The working project now adds individual logos while retaining this baseline's brand palette, typography, sections and card layout.
