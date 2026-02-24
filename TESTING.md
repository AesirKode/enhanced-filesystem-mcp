# Testing — Enhanced Filesystem MCP Server

## Running Tests

```bash
npm test           # Run full vitest suite
npm run lint       # ESLint check
npm run format     # Prettier format
npm run build      # TypeScript compile (catches type errors)
```

## Manual Smoke Tests

After `npm run build`, verify core tools work:

```bash
# Start the server in dev mode
npm run dev
```

### Recommended checks after any major change:
- `efs_read` — read a file and confirm output
- `efs_write` + `efs_edit` — write then patch a file
- `efs_search` — search a directory for a known pattern
- `efs_exec` — run `node --version`
- `efs_git` — run `status` on a known repo
- `ollama_tool` — `list` operation (requires Ollama running)

## Environment Variables for Testing

```bash
ALLOWED_DIRS=D:\Projects,D:\Models
CACHE_SIZE=10
MAX_PARALLEL=4
MODELS_DIR=D:\Models       # Base path for download_tool auto-placement
```

## Notes

- All TypeScript changes require `npm run build` before the compiled server picks them up
- Use `npm run dev` (tsx) for instant feedback during development without a build step
- Node >= 22 required (see `.nvmrc`)
- ComfyUI tool was removed in v0.11.0 — tests referencing it are obsolete
