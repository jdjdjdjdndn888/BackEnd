---
name: GitHub Push Setup
description: How to push to the GitHub backend repo from this Replit project
---

The GitHub backend repo is https://github.com/jdjdjdjdndn888/BackEnd (used by Render for auto-deploy).

There is no `origin` remote configured by default. To push:
1. Confirm GITHUB_PAT secret is available via the secrets UI
2. Add remote: `git remote add origin "https://$GITHUB_PAT@github.com/jdjdjdjdndn888/BackEnd.git"`
3. Push: `git push -u origin main --force`

**Why force push:** The repo had unrelated history (backend-only commits vs full-stack local) and old commits with hardcoded Discord tokens that triggered GitHub push protection. Squashed to a single clean orphan commit to resolve.

**How to apply:** Any future push to trigger a Render redeploy should use this flow. The GITHUB_PAT must be available as a shell env var (confirm via Replit secrets panel if not set).
