# TextGraph DSL — Language Specification

**Version:** v0.1 — 2026-03-17

**License:** [Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)](https://creativecommons.org/licenses/by-nd/4.0/)

Copyright © 2026 mason@drawmotive.com, kelly@drawmotive.com


## Overview

**TextGraph** is a text-based domain-specific language for describing diagrams. It is designed around three core principles:

1. **Human- and LLM-friendly** — reads like structured English, minimal punctuation
2. **Resilient** — partial rendering on error; invalid sections produce visible error nodes, not blank output
3. **Style-separated** — diagram content is distinct from theme/visual directives

The language uses a single unified grammar that covers flowcharts, sequence diagrams, and mindmaps. It also supports slide decks as a first-class document type. The diagram type is inferred from content or declared explicitly.


## Core Syntax & Grammar

Bare identifiers denote nodes, arrows denote relationships, parentheses apply styles, and colons introduce labels. Curly braces add containment: a group is a compound node with children. An omitted identifier makes the group anonymous. These rules also apply when a group is a connection endpoint.

### Connections

There are four connection types:

| Syntax | Description |
|--------|-------------|
| `a -> b` | `a` points to `b` |
| `a <- b` | `b` points to `a` |
| `a <-> b` | bidirectional |
| `a -- b` | connection with no arrowhead |

### Identifiers

An identifier is the internal name for a node or scope. It must start with a letter or underscore, and can contain letters, digits, hyphens, and underscores. For example: `a`, `myNode`, `api-server`, `_temp`.

Dots (`.`) are **not** part of an identifier — they qualify a reference with one or more group names when disambiguation is needed. `group1.m` means "node `m` in group `group1`"; it is a qualified reference, not a single identifier.

Not every connection endpoint has an identifier. `[Label]` creates an **anonymous node** with the visible label `Label` but no reusable name. `{ ... }` creates an **anonymous group** with no reusable name or default title.

### Node Labels

By default a node is drawn using its identifier as its label. To assign a display label, use a separate declaration on its own line:

```
a: Agent
b: Bias
```

Now the rendered diagram shows "Agent" and "Bias" inside their respective blocks. Label declarations can appear anywhere in the document — before or after any connection that references the identifier:

```
<!-- post-defined: connection first, label after -->
a -> b
a: Agent
b: Bias

<!-- pre-defined: label first, connection after -->
a: Agent
b: Bias
a -> b
```

Both are equivalent. The renderer collects all declarations before laying out the diagram.

### Anonymous Nodes

To create a fresh node inline inside a connection, wrap its label in square brackets:

```
A -> [B]
C -> [B]
```

These two `[B]` occurrences create **two distinct nodes** even though they render the same label. Anonymous nodes do not create identifiers, cannot be declared on their own line, and cannot be referenced later by name.

If you need the same node to be reused across multiple connections, give it an identifier instead:

```
b: B
A -> b
C -> b
```

A single anonymous-node occurrence is still one node, so chained connections reuse that same inline node:

```
A -> [B] -> C
```

This creates one anonymous `B` node between `A` and `C`, not two. Style classes bind after the closing bracket:

```
A -> [B](dashed primary)
```

The bracket text is rendered using the same inline label rules as any other node label.

### Label Rendering

**Standalone text labels** — when an identifier has no associated node declaration, the label renders as plain text with no block around it:

```
label: just some text
```

**Node labels** — when declared on a node (e.g. `a: Agent`), the label is rendered inside a block.

**Inline Markdown** — label text supports inline Markdown formatting:

```
a: **important** node
b: _note_
```

Heading syntax sets a title style — larger and bold — useful for titling groups or prominent nodes:

```
a: # Subject
b: ## Topic
```

**Block Markdown** — for multi-line content, use a ` ```md ` fenced block on the lines following the identifier:

````
a:
```md
# Subject line
- bullet 1
- bullet 2
```
````

The fenced block is treated as rich Markdown content rendered inside the node.

**Line break rules** — TextGraph uses simplified Markdown line break semantics optimized for diagramming:

- A **newline** is treated as a line break. Unlike strict CommonMark, there is no need for two trailing spaces or `<br>` — every line break in the source produces a line break in the output.
- A **single blank line** is collapsed to a regular line break. It does not create a paragraph break. This allows authors to visually separate lines in the source without introducing unwanted vertical gaps in the rendered output.
- **Two or more consecutive blank lines** produce a paragraph break — a visible vertical gap in the rendered content.

This applies everywhere Markdown text is rendered: node labels, fenced `md` blocks, free text on slides, and speaker notes. The rationale is that diagram content lives in compact blocks — node labels, slides, annotations — where reflowable paragraphs are rarely useful. Treating newlines as breaks matches how users think about visual layout in a diagramming context.

**Image labels** — a label starting with `@` refers to a resource rendered inside the node. Several resource types are supported:

Stock icons for cloud services, referenced by slug:

```
a: @aws-s3
b: @az-batch-ai
```

Local images, external images, or base64 data — the same formats as HTML `src`:

```
a: @(./icons/my-icon.png)
b: @(https://example.com/icon.png)
c: @(data:image/png;base64,...)
```

An external Markdown file containing a TextGraph diagram:

```
a: @(./diagrams.md)
```

If the file contains multiple TextGraph blocks, reference by name using `#`:

```
a: @(./diagrams.md#architecture)
```

**`@textgraph` blocks** — to embed a TextGraph diagram inside a Markdown file, use `@textgraph` as the opening delimiter and a second `@textgraph` as the closing delimiter. A name can be declared with `:`:

```
@textgraph: architecture
a -> b
@textgraph

@textgraph: sequence
c -> d
@textgraph
```

If the entire file contains only a single diagram, the closing `@textgraph` is optional:

```
@textgraph
a -> b
```

## Styling

### Node Styles

Styles are applied inline after the node identifier using parentheses:

```
a(fill primary dashed)
```

Each space-separated token inside the parentheses maps to a CSS class applied to the node. Classes compose — the above applies three classes simultaneously:

### Token Binding Rule

After a token, parentheses bind to that token. With no preceding token, they style the following anonymous group or the current scope:

- After a node or scope token → styles on that token: `b(dashed)`, `group1(horizontal)`, `[B](dashed)`, and `{ B -> C }(horizontal)`
- After an arrow operator → edge styles: `->(bold)`
- Before an anonymous group → styles on that group: `(horizontal) { B -> C } -> A`
- At the start of a line with no group body → scope-level styles: `(fill primary)`

Parentheses immediately after an arrow belong to the edge, including `A ->(bold) { B -> C }`. To style that target group, use `A -> { B -> C }(horizontal)` or name it: `A -> D(horizontal) { B -> C }`.

In a chained connection like `a -> b(dashed) -> c`, `(dashed)` binds to `b` because `b` is the token right before it — so it is a node style, not an edge style.

### Style Token Reference

| Token | Effect |
|-------|--------|
| `fill` | Fill the node with the default background color |
| `primary` | Override fill color with the primary theme color |
| `dashed` | Apply a dashed border |

Tokens are order-independent and additive. Any number of style tokens may be combined.




### Diagram Type Inference

The diagram type is a style class applied to a scope. When no type is specified, TextGraph infers the type from the content structure. To declare explicitly, apply the type as a class on the root or any group scope:

```
group1(sequence) {
  a -> b : request
}
```

This renders `group1` as a sequence diagram. Any scope can have its own diagram type, enabling mixed diagram types in a single document.

Supported type classes include:

| Class | Diagram type |
|-------|-------------|
| `diagram` | Flowchart / directed graph |
| `sequence` | Sequence diagram |
| `mindmap` | Mind map |

**Inside slides**, type inference is disabled. All diagram content must be wrapped in a scope that declares its diagram type via a style class — `(diagram) {}`, `(mindmap) {}`, `(sequence) {}`, etc. — so the parser never has to guess what bare text means. This is the same `ScopeBlock` construct used everywhere; the parser enforces the type-class requirement semantically inside slides. See [Slide Decks](#slide-decks) for details.

**At the document root** (no `@slide` boundaries), type inference is active. The entire document is treated as a single diagram and the type is inferred from content, or declared explicitly on the root scope.

#### Implicit Connections

Some diagram types define implicit connection structures, allowing labels to be declared without explicit `->` arrows.

**Mindmap** — hierarchy is inferred from indentation. Each level of indentation defines a parent-child relationship. No `->` arrows are needed:

```
group1(mindmap) {
  Topic
    Sub Topic 1
      Detail A
      Detail B
    Sub Topic 2
}
```

The implicit connections are: `Topic -> Sub Topic 1`, `Topic -> Sub Topic 2`, `Sub Topic 1 -> Detail A`, `Sub Topic 1 -> Detail B`. Bare text is both the identifier and the label — no separate declaration needed.

**Multi-line node text** — use `\n` as an inline line break for simple cases:

```
group1(mindmap) {
  Topic
    First line\nSecond line
}
```

For rich content (headings, bullets, code), use the `` ```md `` fenced block on the lines following the node text:

````
group1(mindmap) {
  Topic
    Sub Topic 1
      ```md
      # Heading
      - bullet 1
      - bullet 2
      ```
    Sub Topic 2
}
````

The fenced block attaches to the preceding indented node and is rendered as rich Markdown inside it.

**Explicit identifiers and extra connections** — bare text nodes have no addressable identifier. To label a node or reference it in a `->` connection, declare it with the `id: Label` syntax. The hierarchy is still determined by indentation; the identifier is just a handle:

```
group1(mindmap) {
  root: Topic
    s1: Sub Topic 1
      Detail A
      Detail B
    Sub Topic 2
  root -> s1 : also related
}
```

This produces all the usual implicit parent-child connections from indentation, plus one additional explicit edge from `root` to `s1`. Any **mindmap node** without an explicit identifier cannot be the source or target of a `->` connection. Use an anonymous node literal like `[Label]` only when you want a fresh inline node that cannot be referenced elsewhere.

### Edge Labels

To label the arrow between two nodes, append `: <label>` to the connection:

```
a -> b : contains
```

This renders the word **contains** along the arrow. The label is trimmed of surrounding whitespace.

In a chained connection, the trailing label applies to **all** edges in the chain:

```
a -> b -> c : data
```

This labels both the `a → b` and `b → c` edges with **data**. To label edges individually, write them as separate connection lines:

```
a -> b : request
b -> c : forward
```

### Edge Styles

Style classes can be applied to an edge by placing them in parentheses after the arrow:

```
a ->(bold primary) b
```

This makes the arrow bold with the primary color. Edge style tokens follow the same composable rules as node styles.

### Inline Labels and Classes

Style classes can be declared inline or as a standalone line — both are valid:

```
a(fill primary) -> b(dashed)
```

```
a(fill primary)
b(dashed)
```

Multiple nodes can share the same style in a single declaration using a comma-separated list:

```
x, y, group1(fill primary)
```

This applies `fill primary` to `x`, `y`, and `group1` at once. The style classes are declared once after the last identifier in the list.

Labels are **not** valid on multi-node declarations. To label nodes individually, use separate declaration lines:

```
x, y, group1(fill primary)
x: Service X
y: Service Y
group1: Services
```

Style classes and labels can both appear on the same standalone line:

```
a(fill primary): Agent
```

Labels, however, may **not** appear on the same line as a connection (`->`). The colon syntax is ambiguous when mixed with edge labels:

```
<!-- invalid -->
a: Agent -> b: Bias

<!-- valid -->
a -> b
a: Agent
b: Bias
```

### Chained Connections

Multiple nodes can be chained in a single statement:

```
a -> b -> x <- y
```

This creates three edges: `a → b`, `b → x`, and `y → x`. All inline label and style syntax applies to each node in the chain.

Anonymous nodes follow the same chaining rule:

```
A -> [B] -> C
```

The single `[B]` occurrence is one node reused by both adjacent edges. Two separate `[B]` occurrences create two separate anonymous nodes.

Group endpoints follow the same occurrence rule. `A -> { B -> C } -> D` creates one group reused by both outer edges. Each separate `{ ... }` occurrence creates its own anonymous group. The outer arrows attach to the group boundary; the children remain inside it.

### Line Types

Declarations and connections are distinguished by arrows (`->`, `<-`, `<->`, or `--`) at the current brace depth. A group body has its own statements; an arrow inside it does not turn the enclosing group declaration into a connection.

**Declaration line** — no arrow. The colon sets a display label:

```
a: Agent
a(fill primary): Agent
```

**Connection line** — has an arrow. The colon sets an edge label:

```
a -> b : contains
a -> b -> c : all edges labeled
```

On a declaration statement, `:` introduces a display label. After a connection at the same brace depth, it introduces an edge label. Declare a named endpoint title separately, for example `D: Services` followed by `A -> D { B -> C }`. Child labels end at their owning closing brace: `A -> { B: Bee } -> C: outer` labels child `B` as `Bee` and both outer edges as `outer`.

### Comments

Comments use standard HTML/Markdown comment syntax and are ignored by the renderer:

```
<!-- this is a comment -->
```

### Formal Grammar

The complete syntax is defined as a [PEG (Parsing Expression Grammar)](/reference/grammar). The PEG is the canonical, unambiguous reference for what inputs are syntactically valid. This prose specification defines the semantics — scope resolution, type inference, style inheritance, and rendering behavior — that the grammar alone does not capture.

When the prose and the PEG disagree, the PEG takes precedence for syntax questions.


## Grouping & Scopes

### Scope-Level Styles

When style classes appear without an identifier they apply to the current scope:

```
(fill primary)
```

Inside a group or at the top level this sets the background or default style for that scope.

### Layout Classes

Layout is controlled via style classes and can be applied to any scope.

**Direction:**

| Class | Effect |
|-------|--------|
| `vertical` | Arrange child elements top-to-bottom (default) |
| `horizontal` | Arrange child elements left-to-right |

**Justify (main axis):**

Controls how children are distributed along the main axis (horizontal for `horizontal`, vertical for `vertical`):

| Class | Effect |
|-------|--------|
| `justify-start` | Pack children toward the start (default) |
| `justify-center` | Center children along the main axis |
| `justify-end` | Pack children toward the end |
| `justify-between` | Equal space between children |
| `justify-around` | Equal space around each child |
| `justify-evenly` | Equal space between and around children |

**Align (cross axis):**

Controls how children are aligned on the cross axis:

| Class | Effect |
|-------|--------|
| `align-start` | Align children to the start of the cross axis |
| `align-center` | Center children on the cross axis |
| `align-end` | Align children to the end of the cross axis |

**Columns:**

| Class | Effect |
|-------|--------|
| `layout-2-col` | Arrange children in 2 columns |
| `layout-3-col` | Arrange children in 3 columns |
| `layout-4-col` | Arrange children in 4 columns |
| `layout-6-col` | Arrange children in 6 columns |

Layout classes can be set on the scope identifier or as a scope-level style inside the braces — both are equivalent:

```
group1(vertical) {
  h: Hello
  w: World
}
```

```
group1 {
  (vertical)
  h: Hello
  w: World
}
```

Both render `Hello` and `World` stacked vertically. Since `vertical` is the default, it can be omitted.

Scopes are recursive. A scope may contain nested scopes, each with independent layout:

```
group1 {
  h: Hello
  group2(horizontal) {
    w1: World1
    w2: World2
  }
}
```

Here `group1` lays out its children vertically (default), while `group2` arranges `World1` and `World2` horizontally.

### Scopes and Groups

Curly braces express containment and define a new layout scope. A group is a compound node whose children are arranged independently from the rest of the diagram:

```
{}
```

A named scope attaches an identifier to the group, making it referenceable. The identifier is also its default visible title, just as for an ordinary node. `D { B -> C }` is titled `D`; `D: Services` overrides the title without changing the identifier. A space before the braces is preferred but optional:

```
group1 {}
```

Content placed inside the braces belongs to that scope:

```
group1 {
  m -> n
}
```

`m` and `n` are laid out within `group1`'s independent space and do not participate in the outer layout.

Named scopes follow the same rules as regular nodes — styles and labels can be combined on one line or declared separately, both are valid:

```
group1(fill primary): Services
group1 {
  m -> n
}
```

```
group1(fill primary)
group1: Services
group1 {
  m -> n
}
```

An anonymous scope omits the identifier: `{ B -> C }`. It has no default visible title, and any generated identity used internally must not appear as a label. Separate anonymous scope occurrences are distinct groups.

### Groups as Connection Endpoints

A scope can be a source, target, or intermediate endpoint in a connection. Empty groups are valid:

```text
A -> { B -> C }
A -> {}
{ B -> C } -> D
A -> D { B -> C } -> E
A -> { B -> { C -> D } }
```

The group is the endpoint: external edges attach to its boundary. The body describes containment and internal connections; it is never expanded into a list of external targets or interpreted as the group’s entry nodes. `A -> { B -> C }` therefore creates the outer edge from `A` to the group and the inner edge from `B` to `C`.

Whitespace around braces and arrows is optional, so `A->{B->C}` is equivalent. A body may span multiple lines. In `A -> { B -> C } -> D`, one anonymous group is reused by both outer edges. `A -> {} -> {}` contains two distinct groups. Use a named group and its identifier to reuse a group across separate statements.

### Cross-Scope Connections

Node names are visible across scope boundaries by default. To connect to a node in another scope, use the bare node name whenever it resolves uniquely:

```
a: Outer A
group1 {
  m: Inner M
}
a -> m
```

Here `m` resolves to the node inside `group1` even though the connection is declared outside it. Dot notation is only needed when a bare name would be ambiguous.

### Identifier Scoping

Bare node references are resolved by searching in this order:

1. The **current scope**
2. Then each **parent scope outward** to the root
3. If still unresolved, the **rest of the document**, including nested child scopes in other branches

The nearest unique match wins. This means an inner declaration shadows an outer one with the same name:

```
a: Outer A
group1 {
  a: Inner A
  a -> b        // resolves to Inner A
}
a -> c          // resolves to Outer A
```

No special syntax is needed to reference an outer scope — if a node name isn't found in the current scope, the lookup continues automatically through each enclosing scope.

If a node name is not found in the current scope or any ancestor, lookup continues through the rest of the document. This means outer-to-inner and inner-to-outer references follow the same rule:

```
group2 {
  m: Inner M
}

a -> m          // resolves to group2.m
```

When multiple matches remain visible at the same stage, the reference is ambiguous and must be qualified with group names:

```
team1 {
  m: Worker
}
team2 {
  m: Monitor
}

a -> m          // error: ambiguous reference
a -> team1.m    // resolves uniquely
```

Dot notation is therefore a **disambiguation mechanism**, not the default way to cross scope boundaries. A qualified reference may use the **shortest group prefix that makes the target unique**:

```
regionA {
  payments {
    api: API
  }
}
regionB {
  payments {
    api: API
  }
}

a -> api                  // error: ambiguous reference
a -> payments.api        // error: still ambiguous
a -> regionA.payments.api
```

The qualifier names containing groups from outer to inner, but it does **not** need to start at the document root unless that much context is required to remove the ambiguity.


## Overlay Positioning

Elements can be layered on top of the normal layout flow using overlay position classes. These are style classes that remove an element from the layout and anchor it at a specific position within the parent scope. Overlay classes are valid on nodes, groups, and scope-level declarations — they work anywhere, not just on slides.

```
services {
  api: API Server
  db(cylinder): Database
  api -> db

  status(overlay-top-right circle success fill): ✓
}
```

On a slide:

```
@slide: confidential

(diagram) {
  a -> b -> c
}

(overlay-bottom-right no-border): DRAFT
```

See the [Style Classes Reference](/reference/classes) for the full list of overlay position classes.

When multiple overlays exist within the same scope, later declarations render on top of earlier ones (higher z-order).


## Slide Decks

### Slide Boundaries

`@slide` at the start of a line marks a slide boundary. Each `@slide` ends the current slide and begins a new one. Style classes and the slide label are declared on the `@slide` line itself — at the top, before the slide content:

```
@slide(dark): Introduction

# Introduction

(diagram) {
  a -> b
}

@slide(light): Next Section

(diagram) {
  c -> d
}
```

This produces two slides. The styles and title for each slide are declared at its opening boundary, not at the bottom. Slides are the **outermost scope** — they cannot be nested inside `{}` groups. An `@slide` divider always operates at the document root level.

### Slide Styles

Style classes are applied to a slide boundary the same way as any other scope — place them in parentheses after `@slide`:

```
@slide(dark)

@slide(light primary)
```

Style tokens after `@slide` apply to the entire slide that follows. Any valid class token (global theme, layout, color) is accepted.

### Style Continuation

Slide styles are **cumulative across the deck**. A style set on one slide persists into subsequent slides until explicitly overridden. To reset a specific style, apply the `clear` token or its opposing class:

```
@slide(dark)

(diagram) {
  a -> b
}

@slide(light)

(diagram) {
  c -> d
}
```

Here the first slide is dark; the second overrides to light. Styles not mentioned on the second `@slide` boundary remain as-is from the previous slide.

This allows a deck to establish a baseline style at the first `@slide` and only redeclare what changes per slide.

### Named Slides

A slide name is declared on the `@slide` line using the colon syntax. It is an internal identifier used for navigation, linking, and slide panels — it is not rendered as visible content inside the slide. Spaces are allowed, following the same rule as all label declarations:

```
@slide: intro

@slide(dark): architecture overview

@slide(clear): summary and next steps
```

To show a visible title inside a slide, use a heading in the slide body:

```
@slide(dark): architecture overview

# Architecture Overview

(diagram) {
  a -> b
}
```

The `# Architecture Overview` heading renders as content at the top of the slide. The name `architecture overview` on the `@slide` line is only used for reference.

### Free Text and Diagram Content

Inside a slide, all content is **Markdown by default** — headings, paragraphs, and lists render directly as text. To include a diagram, wrap it in a scope block with a diagram-type class:

| Scope with type class | Diagram type |
|-------------|-------------|
| `(diagram) {}` | Flowchart / directed graph |
| `(mindmap) {}` | Mind map |
| `(sequence) {}` | Sequence diagram |

A scope can also have a name: `flow(diagram) {}`. This uses the same scope block syntax as everywhere else in the language — the diagram-type requirement inside slides is enforced by the parser, not a separate grammar rule.

Free text and diagram content can be mixed on the same slide:

```
@slide: overview

# System Architecture

The following diagram shows the core services.

(diagram) {
  a -> b -> c
}
```

The heading and paragraph render as plain Markdown text. The `(diagram) {}` scope renders as a flowchart below them.

**This rule applies only inside slides.** At the document root — when no `@slide` boundary is present — diagram content is written directly without a type class on the scope. The entire document is treated as a single diagram, and the type is inferred from content or declared on the root scope.

### Speaker Notes

Speaker notes are declared using the `(notes)` scope-level class with a label. They are not rendered on the slide itself — they are only visible in presenter mode or exported as speaker notes:

```
@slide: architecture overview

# Architecture Overview

(diagram) {
  a -> b
}

(notes): Talk about the tradeoffs we made in Q2.
```

For multi-line notes, use a fenced Markdown block:

````
@slide: architecture overview

# Architecture Overview

(diagram) {
  a -> b
}

(notes):
```md
- Mention the Q2 tradeoffs
- Ask about timeline
- Skip if running short
```
````

Only one `(notes)` declaration is allowed per slide. If multiple appear, the last one wins.
