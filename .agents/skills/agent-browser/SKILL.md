---
name: agent-browser
description: "Vercel Labs agent-browser: AI-first browser automation CLI using CDP, accessibility snapshots and compact @eN element refs. Use for navigating, forms, screenshots, testing, scraping, and web app validation."
---

# agent-browser (Vercel Labs)

Fast, AI-optimized browser automation CLI. Uses Chrome/Chromium via Chrome DevTools Protocol (CDP) with accessibility-tree snapshots and compact `@eN` element references, minimizing token consumption.

## Quick Start & Core Workflow

The standard agent interaction follows the **Navigate -> Snapshot -> Interact -> Verify** loop:

```bash
# 1. Open URL
agent-browser open "https://example.com"
agent-browser wait --load networkidle

# 2. Get accessibility snapshot with interactive refs (@e1, @e2, ...)
agent-browser snapshot -i

# 3. Interact with elements via refs
agent-browser fill @e1 "usuario@exemplo.com"
agent-browser fill @e2 "senha123"
agent-browser click @e3

# 4. Verify & capture state
agent-browser wait --load networkidle
agent-browser screenshot ./screenshot.png
agent-browser get url
```

---

## Command Reference

### Navigation
- `agent-browser open <url>`: Navigate to URL
- `agent-browser reload`: Reload current page
- `agent-browser back` / `forward`: History navigation
- `agent-browser close`: Close the browser session

### Inspection & Snapshots
- `agent-browser snapshot -i`: Accessibility tree snapshot showing only interactive elements with `@eN` refs
- `agent-browser snapshot`: Full accessibility tree snapshot
- `agent-browser get text <ref|selector>`: Extract text content
- `agent-browser get title`: Page title
- `agent-browser get url`: Current URL
- `agent-browser screenshot [path] [--full]`: Capture screenshot (viewport or full page)
- `agent-browser pdf [path]`: Export page to PDF

### Interaction
- `agent-browser click <ref|selector>`: Click an element
- `agent-browser dblclick <ref|selector>`: Double-click
- `agent-browser fill <ref|selector> <text>`: Clear and type text into input
- `agent-browser type <ref|selector> <text>`: Type text without clearing
- `agent-browser press <key>`: Press a key (e.g., `Enter`, `Tab`, `Escape`)
- `agent-browser select <ref|selector> <value>`: Select dropdown option
- `agent-browser check <ref|selector>` / `uncheck`: Toggle checkboxes
- `agent-browser hover <ref|selector>`: Hover mouse over element
- `agent-browser scroll down|up [px]`: Scroll page or container
- `agent-browser upload <ref|selector> <filepath>`: Upload file to file input

### Waiting & Synchronization
- `agent-browser wait --load networkidle`: Wait until network connections are idle
- `agent-browser wait --url "<pattern>"`: Wait for URL matching pattern
- `agent-browser wait <ms>`: Pause for specified milliseconds

### State & Authentication
- `agent-browser state save <path>`: Save cookies and local storage to JSON
- `agent-browser state load <path>`: Restore session cookies and storage
- `agent-browser auth save <name> --url <url> ...`: Secure credential vault
- `agent-browser auth login <name>`: Auto-login with saved credentials

### Observation & Dashboard
- Port 4848: Local observability web dashboard (`http://localhost:4848`)
- Video recording: `agent-browser record start ./video.webm` / `agent-browser record stop`

---

## Detailed References

For full documentation and specialized patterns, consult:
- [Core Manual & Templates](references/core.md)
- [Dogfood & QA Testing](references/dogfood.md)
- [Vercel Sandbox microVMs](references/vercel-sandbox.md)
