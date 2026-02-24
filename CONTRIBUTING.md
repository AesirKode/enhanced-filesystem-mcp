# Contributing

Thanks for your interest! This project welcomes bug reports, feature ideas, and pull requests.

## Getting Started

```bash
git clone https://github.com/AesirKode/enhanced-filesystem-mcp
cd enhanced-filesystem-mcp
npm install
npm run build
```

Requires **Node.js >= 22** (see `.nvmrc`).

## Development Workflow

```bash
npm run dev      # Run directly with tsx — no build needed
npm run build    # Compile TypeScript
npm run lint     # ESLint
npm run format   # Prettier
npm test         # Vitest
```

## Project Structure

- `src/index.ts` — Server entry point, tool registration, request routing
- `src/core/` — Core logic modules (one file per domain)
- `src/tools/` — Tool schema definitions and thin handlers
- `src/process/` — Shell/Python execution helpers

See `CLAUDE.md` for the full architecture reference.

## Adding a New Tool

1. Add core logic to a new or existing file in `src/core/`
2. Add the tool schema (concise description, no inline examples) to `src/tools/`
3. Import and register in `src/index.ts` — use the `wrap()` helper for simple pass-throughs
4. Run `npm run build` and verify it compiles
5. Update the tool count and changelog in `CLAUDE.md`

## Pull Request Guidelines

- Keep tool `description` strings concise — one or two sentences, no inline JSON examples (these inflate the MCP `ListTools` token cost for every session)
- No hardcoded local paths — use environment variables
- `npm run build` and `npm run lint` must pass
- Update `CLAUDE.md` changelog if bumping the version

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template.
For security issues, see [SECURITY.md](SECURITY.md).
