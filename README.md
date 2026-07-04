# 🚣 airo

> Anchor your AI coding assistant to the packages you actually use.

airo reads your `package.json`, pulls each installed package's README from `node_modules`, and uses an LLM to generate **decision-making steering** for your AI coding tools — when to reach for `luxon` vs rolling your own dates, which SDK matches which provider, and what not to misuse.

Steering is scoped to **installed versions**, updated incrementally, and kept in `.airo/` so your project root stays clean.

## The problem

AI coding assistants don't know about your specific packages. They'll use native `fetch` when you have a client library, reimplement date logic when you have `luxon`, or pick the wrong SDK when you have several LLM providers installed.

Hand-written steering files help — but they go stale quickly and are tedious to maintain.

airo generates and updates them for you.

## How it works

1. Reads dependencies from `package.json` (with a sensible default ignore list for tooling)
2. Loads each package's README from `node_modules` (packages must be installed locally)
3. Calls your chosen LLM **once per package**, with installed version, semver range, and sibling package names for overlap disambiguation
4. Writes `.airo/steering.md` — one section per package with *when to use*, *prefer over*, *gotchas*, and *NOT for* bullets (not API docs)
5. Wires the file into Kiro, Claude Code, and/or Cursor

On subsequent runs, airo only regenerates sections for **new packages**, **removed packages**, or packages whose **installed version changed** after `npm install`. Everything else is left as-is.

## Requirements

- Node.js **24+**
- JavaScript/TypeScript projects (`package.json`)

## Quickstart

**1. Add your API key**

Create a `.env` file in your project root (or export the variable in your shell):

```
# Anthropic (default)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# Google Gemini
GEMINI_API_KEY=AIza...
```

**2. Install dependencies**

```bash
npm install
```

airo reads READMEs from `node_modules` — run this in the project you're generating steering for, and again whenever you add packages.

**3. Run airo**

```bash
npx @paavonykanen/airo
```

On first run, the wizard asks which **output tools** you use (Kiro, Claude Code, Cursor), which **LLM provider** and model tier to use, and the env var name for your API key. It then generates steering in the same run.

Wizard keyboard hints:

- **↑ / ↓** — move between options
- **Space** — toggle an option on/off (tool selection)
- **Enter** — confirm and continue

The API key is **never** stored in config — only the env var name. See [API key](#api-key).

## CLI

| Command | Description |
|---------|-------------|
| `npx @paavonykanen/airo` | Incremental update — new/changed/removed packages only |
| `npx @paavonykanen/airo --regenerate` | Regenerate all sections (keeps existing config; use after prompt changes) |
| `npx @paavonykanen/airo --setup` | Re-run the setup wizard and regenerate everything |

## Output

Everything lives under `.airo/`:

```
.airo/
  config.json    # tools, ignore list, LLM provider & model (no secrets)
  steering.md    # generated steering (commit this)
```

Each package section looks like:

```markdown
## [react] @ 19.0.0

- **Use this when**: ...
- **Prefer over**: ... (only when another installed package overlaps)
- **Gotchas**: ...
- **NOT for**: ...
```

Headers record the **installed** version from `node_modules`. When that version changes, the section is regenerated on the next normal run.

## Supported AI tools

airo writes `.airo/steering.md` and connects it to your tools:

| Tool | What airo creates |
|------|-------------------|
| **Kiro** | Symlink `.kiro/steering/steering.md` → `.airo/steering.md` |
| **Claude Code** | Appends `@.airo/steering.md` to `CLAUDE.md` |
| **Cursor** | Creates `.cursor/rules/airo-steering.mdc` including `.airo/steering.md` |

You can enable multiple tools in config.

## Configuration

Example `.airo/config.json`:

```json
{
  "tools": ["cursor", "claude"],
  "ignore": ["typescript", "eslint", "prettier", "jest", "@types/*"],
  "includeDevDependencies": false,
  "ai": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "apiKeyEnv": "ANTHROPIC_API_KEY"
  }
}
```

| Field | Description |
|-------|-------------|
| `tools` | Output AI tools to wire up (`kiro`, `claude`, `cursor`) |
| `ignore` | Package names or patterns to skip (`eslint-*`, `@types/*`, …) |
| `includeDevDependencies` | Also steer devDependencies when `true` |
| `ai.provider` | LLM used to generate steering: `anthropic`, `openai`, or `google` |
| `ai.model` | Model id for that provider |
| `ai.apiKeyEnv` | Env var name airo reads for the API key |

The LLM provider generates steering. **Output tools** only consume `.airo/steering.md` — they are independent choices.

### LLM providers

| Provider | Default env var | Models (wizard) |
|----------|-----------------|-----------------|
| `anthropic` | `ANTHROPIC_API_KEY` | Haiku (fast), Sonnet (quality) |
| `openai` | `OPENAI_API_KEY` | GPT-4o mini (fast), GPT-4o (quality) |
| `google` | `GEMINI_API_KEY` | Gemini 2.0 Flash (fast), Gemini 2.5 Pro (quality) |

### Ignoring packages

Tooling packages (`typescript`, `eslint`, `prettier`, …) are ignored by default. Add patterns to `ignore` for anything else that doesn't need steering.

### API key

Set the value in `.env` or your shell — airo loads `.env` automatically via dotenv.

Never commit `.env`.

**CI example** (GitHub Actions):

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Use a custom env var name by setting `ai.apiKeyEnv` in `.airo/config.json` and mapping your secret to that name.

## Keeping steering up to date

```bash
npm install some-package   # install first so README is in node_modules
npx @paavonykanen/airo                   # generates only the new/changed sections
git add .airo/
git commit -m "chore: update airo steering for some-package"
```

| Trigger | What airo does |
|---------|----------------|
| New dependency | Generates a new section |
| Removed dependency | Removes the section (no LLM call) |
| `npm install` bumps installed version | Regenerates that package's section |
| No changes | Exits early — steering is up to date |
| Prompt or config changes | Run `npx @paavonykanen/airo --regenerate` |

## Development

Requires Node.js 24+ (see `.nvmrc` — run `nvm use` if you use nvm).

Clone the repo and run against your own project:

```bash
npm install
npm run dev          # tsx src/index.ts — same as npx @paavonykanen/airo locally
npm run dev -- --regenerate
npm test
npm run build        # outputs to dist/ for publishing
```

## Roadmap

- GitHub Action to update steering on PRs that change `package.json`
- C# / .NET (NuGet)
- Python (`pyproject.toml` / `requirements.txt`)

## Status

Early development (v0.1.0). Core flow works — incremental updates, multi-provider LLM support, and tool wiring for Kiro, Claude Code, and Cursor. Expect rough edges. Feedback and PRs welcome.

## License

MIT
