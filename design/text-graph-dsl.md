# TextGraph DSL — Language Design Specification v0.1

## Overview

**TextGraph** is a text-based domain-specific language for describing diagrams. It is designed around three core principles:

1. **Human- and LLM-friendly** — reads like structured English, minimal punctuation
2. **Resilient** — partial rendering on error; invalid sections produce visible error nodes, not blank output
3. **Style-separated** — diagram content is distinct from theme/visual directives

The language uses a single unified grammar that covers flowcharts, sequence diagrams, architecture diagrams, class diagrams, entity-relationship diagrams, mindmaps, Gantt charts, and more. The diagram type is inferred from content or declared explicitly.

---