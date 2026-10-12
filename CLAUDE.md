# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TextGraph documentation site — a DSL/tutorial/guide site for TextGraph, a natural-language DSL that generates diagrams and slides. Built with VitePress. Target reference: https://mermaid.js.org/intro/

## Commands

```bash
npm ci          # Install locked dependencies
npm run dev     # Start dev server
npm run build   # Build static site
npm run preview # Preview built site
```

## Architecture

- **Framework**: VitePress 2.x (alpha)
- **Config**: `.vitepress/config.mts` — single source of truth for nav, sidebar, site metadata, and search
- **Content**: Markdown files at root level, organized into sections: `intro/`, `tour/`, `diagrams/`, `slides/`, `integrations/`, `reference/`
- **Temp design docs**: `design/` — internal language spec and DSL research, not linked in site nav

## Language and Content

The public language contract is in `reference/textgraph-spec.md` and `reference/syntax.md`. The executable PEG in `reference/grammar.peg` is mirrored in `reference/grammar.md`; update them together and run `npm run test:grammar`.

- Short node names inside a group create or reuse local members. The same name in different groups identifies distinct nodes.
- Root references resolve unique short names across the diagram, or qualified paths when names are duplicated. They never change membership.
- Group bodies contain connections, bare member names, nested group blocks, and comments.
- Connections inside groups introduce their node members. Cross-group connections and separate node decorations belong at the document root.
- A grouped endpoint can reference a declared local group or a uniquely named external group; explicit qualified endpoints can reference other existing subjects.
- Declare each named group once within its parent. Different parents may reuse a group name.
- Qualified references may use the shortest unique trailing group path and must identify an existing node or group. Group headers and bare member lines use simple local names.
- Distinct identifiers may have identical display labels. Anonymous nodes and groups remain distinct occurrences.

Only flowcharts and directed graphs are available. Sequence diagrams, mind maps, and slides remain excluded feature drafts. Preserve historical execution evidence under `docs/superpowers/` and research under `design/`.

The navigation and route exclusions in `.vitepress/config.mts` define published content. Do not expose a draft until its examples work in the renderer.

## Public Repository Language

Write authored documentation, comments, interface text, diagnostics, test names, scripts, and agent instructions in English. Preserve intentional multilingual fixtures, upstream notices, attributed quotations, and third-party data in their original form.
