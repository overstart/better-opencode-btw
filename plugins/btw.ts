import type { Plugin } from "@opencode-ai/plugin"

const RECENT_LIMIT = 15
const FULL_TEXT_MESSAGES = 5
const OLDER_TRUNCATE = 300
const AGENTS_MD_CAP = 1000

const SUMMARIZATION_KEYWORDS = [
  "summary",
  "continuation",
  "context so far",
  "so far in this session",
  "previous context",
]

function isValuableSynthetic(text: string): boolean {
  const lower = text.toLowerCase()
  return SUMMARIZATION_KEYWORDS.some((kw) => lower.includes(kw))
}

export const BtwPlugin: Plugin = async (ctx) => {
  return {
    "command.execute.before": async (input, output) => {
      if (input.command !== "btw") return

      try {
        const contextLines: string[] = []

        // 1. Session metadata
        try {
          const session = await ctx.client.session.get({
            path: { id: input.sessionID },
          })
          if (session.data) {
            contextLines.push("## Session Context")
            contextLines.push(`- Session: ${session.data.title || "untitled"}`)
          }
        } catch {}

        // 2. Recent messages + todo extraction + synthetic summaries
        try {
          const result = await ctx.client.session.messages({
            path: { id: input.sessionID },
            query: { limit: RECENT_LIMIT },
          })

          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            const msgs = result.data
            const todoLines: string[] = []
            const summaryLines: string[] = []

            contextLines.push("\n## Recent Conversation")

            for (let i = 0; i < msgs.length; i++) {
              const msg = msgs[i]
              const role = msg.info.role
              const isRecent = i >= msgs.length - FULL_TEXT_MESSAGES

              for (const part of msg.parts) {
                // Text parts — include non-synthetic, plus valuable synthetic (summaries/continuations)
                if (part.type === "text") {
                  const isSynthetic = (part as any).synthetic === true
                  const text: string = (part as any).text || ""

                  if (isSynthetic) {
                    if (isValuableSynthetic(text)) {
                      summaryLines.push(text)
                    }
                    continue
                  }

                  const displayText = isRecent
                    ? text
                    : text.length > OLDER_TRUNCATE
                      ? text.slice(0, OLDER_TRUNCATE) + "..."
                      : text
                  contextLines.push(`[${role}]: ${displayText}`)
                }

                // Tool parts — extract todo state
                // SDK shape: type="tool", tool name in .tool, input in .state.input
                if (part.type === "tool" && (part as any).tool === "todowrite") {
                  const state = (part as any).state
                  if (state?.input?.todos && Array.isArray(state.input.todos)) {
                    for (const todo of state.input.todos) {
                      if (todo.status === "in_progress" || todo.status === "pending") {
                        todoLines.push(`- [${todo.status}] ${todo.content}`)
                      }
                    }
                  }
                }
              }
            }

            if (summaryLines.length > 0) {
              contextLines.push("\n## Session Summary")
              for (const s of summaryLines) {
                contextLines.push(s.length > 600 ? s.slice(0, 600) + "..." : s)
              }
            }

            if (todoLines.length > 0) {
              contextLines.push("\n## Current Task State")
              contextLines.push(todoLines.join("\n"))
            }
          }
        } catch {}

        // 3. AGENTS.md project instructions
        try {
          const agentsMd = await ctx.client.file.read({
            query: { path: "AGENTS.md" },
          })
          if (agentsMd.data?.content) {
            const content: string = agentsMd.data.content
            contextLines.push("\n## Project Instructions (AGENTS.md)")
            contextLines.push(
              content.length > AGENTS_MD_CAP
                ? content.slice(0, AGENTS_MD_CAP) + "..."
                : content
            )
          }
        } catch {}

        // Inject as synthetic part at the front
        if (contextLines.length > 0) {
          output.parts.unshift({
            type: "text",
            text: contextLines.join("\n"),
            synthetic: true,
          } as any)
        }
      } catch (err) {
        console.error("[btw] Failed to inject context:", err)
      }
    },
  }
}
