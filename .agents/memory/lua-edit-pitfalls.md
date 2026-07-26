---
name: Lua file edit pitfalls
description: Known issues when editing Lua bot scripts in this project via the Edit tool
---

## Backslash regex literals get mangled by Edit tool
The Edit tool corrupts strings like `username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` when they appear in `old_string`. Use a Python `subprocess`/heredoc approach or `ShellExec` with a Python script to replace those lines instead.

**Why:** The Edit tool processes escape sequences in the old_string/new_string parameters, turning `\\` into `\` and breaking the regex literal.

**How to apply:** Whenever a JS file containing a regex with backslash literals needs editing around those lines, use `python3 - << 'PYEOF' ... PYEOF` in ShellExec to read and rewrite the file directly. Then verify with `node --check <file>`.

## Lua block nesting — always recount after structural edits
Lua uses `end` for every `if/while/for/function` block. Adding a new `if..end` wrapper (e.g., pcall error guard) requires exactly one extra `end` at the matching indentation level. Missing or extra `end` will cause a silent parse error in Roblox.

**Why:** The Edit tool can introduce an extra wrapping `if` that shifts all downstream `end` counts by one.

**How to apply:** After any structural Lua edit, manually trace the open/close pairs from the changed block to the enclosing `spawn(function()...end)` to verify the count is still balanced.

## ps99lua.lua duplicate script
The file previously had a full duplicate of itself pasted starting at what was line 1004 (after `GetSupported()` at end of script). This caused two conflicting trade loops to run simultaneously. Fixed by truncating with `head -n 1003`. If the file grows suspiciously long again, check for a second copy.
