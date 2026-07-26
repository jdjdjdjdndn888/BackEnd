---
name: Routes require pattern
description: All controller requires must be at the top of routes.js; inlining require() next to a route causes duplicate-const SyntaxError.
---

**Rule:** Every `const xController = require(...)` must live at the top of `api/routes/routes.js` with all other requires.

**Why:** Adding a `const gamesController = require(...)` inline next to a `router.get()` line causes a `SyntaxError: Identifier 'gamesController' has already been declared` crash if that name was already required at the top, preventing the API from booting.

**How to apply:** When adding a new controller to routes.js, always place the require with the existing block at lines 1–20, not next to the route definition.
