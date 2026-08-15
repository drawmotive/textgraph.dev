# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TextGraph documentation site — a DSL/tutorial/guide site for TextGraph, a natural-language DSL that generates diagrams and slides. Built with VitePress. Target reference: https://mermaid.js.org/intro/

## Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Build static site
pnpm preview    # Preview built site
```

## Architecture

- **Framework**: VitePress 2.x (alpha)
- **Config**: `.vitepress/config.mts` — single source of truth for nav, sidebar, site metadata, and search
- **Content**: Markdown files at root level, organized into sections: `intro/`, `tour/`, `diagrams/`, `slides/`, `integrations/`, `reference/`
- **Temp design docs**: `design/` — internal language spec and DSL research, not linked in site nav

## Content State

Most pages are stubs with `<!-- CONTENT TO ADD: ... -->` comment blocks. Only pages with real content:
- `index.md` — homepage hero + features
- `intro/what-is-textgraph.md` — the intro essay

## TextGraph DSL (from design docs)

Core principles:
1. **Human- and LLM-friendly** — reads like structured English, minimal punctuation
2. **Resilient** — partial rendering on error; invalid sections produce error nodes, not blank output
3. **Style-separated** — diagram content is distinct from theme/visual directives

Single unified grammar covers: flowcharts, sequence, architecture, class, ER, mindmaps, Gantt charts. Diagram type is inferred from content or declared explicitly.

## Sidebar Structure (defined in config.mts)

- Introduction → `intro/`
- Language Tour → `tour/`
- Diagram Types → `diagrams/`
- Slides → `slides/`
- Integrations → `integrations/`
- Reference → `reference/`
