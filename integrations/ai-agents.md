# AI tools

Describe the relationships you want to show, and ask an AI tool to write TextGraph. Paste the result into the [Playground](/playground) to check the diagram, then refine the text or use it in your documentation. No skill installation is required.

## Copy this prompt

Replace the last line with your own description:

```text
Create a TextGraph diagram for the description below.
Read https://textgraph.dev/reference/textgraph-spec.md first.
If styling is requested, also read https://textgraph.dev/reference/classes.md.
If you cannot read a reference, ask me to attach it before generating.
Use only documented syntax and classes. Keep node labels on separate
declaration lines and preserve the described relationships.
Return only the diagram source, without Markdown fences or explanation.

Description: A browser sends requests to an API, which queries a database.
```

If your tool cannot open links, download and attach the <a href="/reference/textgraph-spec.md" target="_self" download>Language Specification Markdown</a>. For styling, also attach the <a href="/reference/classes.md" target="_self" download>Style Classes Markdown</a>. These are the same sources used by the reference pages.

## What the result looks like

For the description in the prompt, a valid result is:

```textgraph example
browser -> api : requests
api -> database : queries

browser: Browser
api: API
database: Database
```

Check that the preview matches your intended relationships. If the Playground reports an error, give the AI tool the source and diagnostic and ask it to correct the diagram. For [Markdown](/integrations/markdown), wrap the final source in a fenced block with the language `textgraph`.

## Which references are needed?

| Reference | Include it in the prompt? |
| --- | --- |
| [Language Specification](/reference/textgraph-spec) | Yes. It covers connections, labels, groups, scope resolution and layout syntax. |
| [Syntax Reference](/reference/syntax) | Not needed alongside the specification; it is a shorter summary of the same syntax. |
| [Style Classes](/reference/classes) | Include it when requesting shapes, colors, fills or line styles. The specification explains how classes bind, but delegates the available classes to this reference. |

For a plain diagram, the specification alone is enough. The prompt reads the style catalog only when needed. The same prompt and references can later be packaged into a reusable skill.
