# 🧠 better-opencode-btw

> The `/btw` command [opencode](https://opencode.ai) deserves — ask side questions with rich context, zero pollution.

You're 12 tool calls deep into a complex refactor. You suddenly need to remember why a function exists, or what a config flag does, or whether you already handled an edge case. You *could* ask the main agent — but that bloats its context window, derails its focus, and costs tokens on a tangent.

**That's what `/btw` is for.**

```
/btw what does the `useAuth` hook actually return?
/btw remind me, why did we choose SQLite over Postgres again?
/btw how do I undo the last commit without losing changes?
/btw what's the difference between the plan and build agents?
```

The answer appears inline as a subtask result. Your main agent keeps working exactly where it left off — **no context pollution, no derailment, no wasted tokens.**

---

## ✨ Why this is better

| | 🧠 better-opencode-btw | 📦 dalekirkwood/opencode-btw |
|---|---|---|
| **Context depth** | 4 layers: session metadata + 15 smart-truncated messages + compaction summaries + todo state + AGENTS.md | Last 10 messages, blind 500-char truncation |
| **Tool part parsing** | Correct SDK shape (`part.type === "tool"` + `.state.input`) | Broken — uses `"tool-invocation"` which doesn't exist in the SDK |
| **Synthetic handling** | Selectively includes compaction/summary synthetics | Skips all synthetics — loses deep session context |
| **Agent** | Dedicated read-only subagent, hidden from autocomplete | Reuses `general` agent — can write files, shows in autocomplete |
| **Model** | Specific model on agent definition — no surprise fallbacks | Inherits parent model — silent fallback if provider is down |
| **Install** | One-line curl \| bash | Manual copy only |

---

## 🚀 Install

### One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/transportrefer/better-opencode-btw/main/install.sh | bash
```

### Manual install

```bash
git clone https://github.com/transportrefer/better-opencode-btw.git /tmp/better-opencode-btw
cp /tmp/better-opencode-btw/commands/btw.md ~/.config/opencode/commands/
cp /tmp/better-opencode-btw/agents/btw.md ~/.config/opencode/agents/
cp /tmp/better-opencode-btw/plugins/btw.ts ~/.config/opencode/plugins/
cd ~/.config/opencode && npm install @opencode-ai/plugin
```

Restart opencode. Done.

---

## 🔧 How it works

Three pieces work together:

| File | What it does |
|---|---|
| 📋 `commands/btw.md` | Registers `/btw` as a custom command that runs as an **isolated subtask** |
| 🤖 `agents/btw.md` | Defines a **read-only subagent** (Qwen 3.6 Plus via OpenRouter) |
| 🔌 `plugins/btw.ts` | Hooks `command.execute.before` to inject rich context before the subtask runs |

When you type `/btw <question>`, the plugin automatically gathers:

1. 📌 **Session metadata** — title, project context
2. 💬 **Last 15 messages** — last 5 full text, older ones smart-truncated at 300 chars
3. 📝 **Compaction summaries** — synthetic continuation/summary text from session history
4. ✅ **Todo/task state** — what's currently in-progress or pending
5. 📖 **AGENTS.md** — project-specific instructions (up to 1000 chars)

All injected as a synthetic context block into the **child subtask** — never your main session. The parent agent's context window stays completely clean.

### 🔒 Context isolation guarantee

`subtask: true` creates a separate child session. The parent only sees a brief result summary. Your main agent picks up exactly where it left off, as if the `/btw` never happened.

---

## ⚙️ Configuration

### Change the model

Edit `~/.config/opencode/agents/btw.md`:

```yaml
model: openrouter/qwen/qwen3.6-plus    # default — fast and cheap
model: anthropic/claude-sonnet-4-20250514  # if you want quality
model: opencode/gpt-5.1-codex           # via opencode Zen
```

Run `opencode models` to see everything available.

### Tune context injection

Edit `~/.config/opencode/plugins/btw.ts`:

| Constant | Default | What it controls |
|---|---|---|
| `RECENT_LIMIT` | 15 | How many recent messages to inject |
| `FULL_TEXT_MESSAGES` | 5 | How many of the newest get full (untruncated) text |
| `OLDER_TRUNCATE` | 300 | Character limit for older messages |
| `AGENTS_MD_CAP` | 1000 | Character limit for AGENTS.md injection |

---

## 🗑️ Uninstall

```bash
rm ~/.config/opencode/commands/btw.md
rm ~/.config/opencode/agents/btw.md
rm ~/.config/opencode/plugins/btw.ts
```

Restart opencode.

---

## 📋 Requirements

- [opencode](https://opencode.ai) v1.3.13+
- An [OpenRouter](https://openrouter.ai) account (or change the model to one you have access to)
- `@opencode-ai/plugin` (installed automatically by the install script)

---

## 📄 License

MIT
