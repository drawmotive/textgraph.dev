# Syntax Reference

A complete reference for all operators and punctuation in the TextGraph DSL. For the formal, machine-readable syntax definition see the [PEG Grammar](/reference/grammar).

## Identifiers

Node and scope names must start with a letter or underscore, and can contain letters, digits, hyphens, and underscores. Dots are not part of a name — they qualify a reference with group names when disambiguation is needed (see [`.` — Cross-Scope Reference](#-cross-scope-reference)). Anonymous nodes use `[]` and do not create names.

## Connections

| Syntax | Description |
|--------|-------------|
| `a -> b` | `a` points to `b` |
| `a <- b` | `b` points to `a` |
| `a <-> b` | Bidirectional |
| `a -- b` | Connection with no arrowhead |

Connections can be chained:

```
a -> b -> c <- d
```

Connection endpoints may also be anonymous nodes:

```
A -> [B]
C -> [B]
```

## `:` — Label and Name Declaration

A colon declares a display label for a node, group, or slide:

```
a: Agent
group1: Services
@slide: intro
```

A colon after a connection declares an edge label. In a chained connection, the label applies to **all** edges in the chain:

```
a -> b : contains
a -> b -> c : data
```

To label edges individually, use separate connection lines.

Labels may **not** appear on the same line as a connection. These are distinct line types — on a declaration line (no arrow), `:` is a display label; on a connection line, `:` is an edge label:

```
<!-- invalid -->
a: Agent -> b: Bias

<!-- valid -->
a -> b
a: Agent
b: Bias
```

## `()` — Style Classes

Parentheses apply style classes to a node, edge, scope, or slide boundary. `()` always binds to the **immediately preceding token**:

- After a node or scope token → styles on that token: `a(fill primary dashed)`, `group1(horizontal)`, and `[B](dashed)` inside `A -> [B](dashed)`
- After an arrow → edge styles: `a ->(bold) b`
- Start of line → scope-level styles: `(horizontal)`

```
a(fill primary dashed)
a -> [B](dashed)
a ->(bold) b
group1(horizontal) {}
@slide(dark)
```

Multiple nodes can share the same classes in one declaration:

```
x, y, z(fill primary)
```

Labels and classes can be combined on the same standalone line:

```
a(fill primary): Agent
```

## `{}` — Scope

Curly braces define a layout scope. Content inside is arranged independently:

```
group1 {
  a -> b
}
```

Scopes can be nested:

```
group1 {
  group2(horizontal) {
    a -> b
  }
}
```

## `@slide` — Slide Boundary

`@slide` at the **start of a line** marks a slide boundary. Style classes and a slide name are declared on the same line:

```
@slide(dark): intro

# Welcome

@slide(light): next section

More content here.
```

Slide boundaries always operate at the document root — they cannot appear inside `{}` scopes.

### Diagram Content on Slides

Inside a slide, all text is **Markdown content** by default. To include a diagram, wrap it in a scope block with a diagram-type class — `(diagram) {}`, `(mindmap) {}`, `(sequence) {}`, etc.:

```
@slide: overview

# System Architecture

(diagram) {
  client -> api -> db
}

(mindmap) {
  Concepts
    Scalability
    Reliability
}
```

This rule does not apply outside of slides. At the document root (no `@slide`), diagram content is written directly without a type class on the scope.

## `.` — Cross-Scope Reference

Bare node names are global by default. A reference first checks the current scope, then each parent scope outward, and if still unresolved continues through the rest of the document. If that search finds exactly one node, the bare name is valid even when the node lives in another group:

```
group1 {
  m: Inner
}

a -> m
```

Use dot notation only to disambiguate multiple nodes with the same name. Add the shortest group prefix that makes the target unique:

```
a -> team1.m
a -> regionA.payments.api
```

If a bare name or dotted name still matches multiple candidates, it is an ambiguous reference and must be qualified further.

## `[]` — Anonymous Node

A bracketed label inside a connection creates a fresh node instance with no reusable identifier:

```
A -> [B]
C -> [B]
```

The two `[B]` occurrences above are different nodes, even though they render the same text.

A single occurrence is still one node within a chain:

```
A -> [B] -> C
```

Anonymous nodes cannot be declared on their own line or referenced later by name. If you need reuse, give the node an identifier instead:

```
b: B
A -> b
C -> b
```

Style classes bind after the closing bracket:

```
A -> [B](dashed primary)
```

## `,` — Multi-Node Declaration

A comma-separated list applies the same style classes to multiple nodes at once. Only style classes are allowed — labels are not valid on multi-node declarations. To label nodes, use separate declaration lines:

```
x, y, group1(fill primary)
x: Service X
y: Service Y
group1: Services
```

## `\n` — Inline Line Break

Use `\n` inside node text for a simple line break:

```
group1(mindmap) {
  Topic
    First line\nSecond line
}
```

## ` ```md ``` ` — Fenced Markdown Block

A fenced block attaches rich Markdown content to the preceding node:

````
a:
```md
# Heading
- bullet 1
- bullet 2
```
````

Works inside mindmaps too — the block attaches to the preceding indented node.

## `@` — External Resources

A label starting with `@` renders a resource inside the node.

**Stock icons** — reference by slug:

```
a: @aws-s3
b: @az-batch-ai
```

**Images** — local path, external URL, or base64 data:

```
a: @(./icons/logo.png)
b: @(https://example.com/icon.png)
c: @(data:image/png;base64,...)
```

**External Markdown file** — embeds the TextGraph diagram from the file:

```
a: @(./diagrams.md)
```

If the file contains multiple named blocks, reference by name using `#`:

```
a: @(./diagrams.md#architecture)
```

## `@textgraph` — TextGraph Block in Markdown

Use `@textgraph` as both the opening and closing delimiter to embed a TextGraph diagram inside a Markdown file. A name is declared with `:`:

```
@textgraph: architecture
a -> b
@textgraph

@textgraph: sequence
c -> d
@textgraph
```

A bare `@textgraph` opens a block when none is open, and closes the current block when one is open. If the entire file is a single diagram, the closing delimiter is optional:

```
@textgraph
a -> b
```

## `(notes)` — Speaker Notes

A scope-level `(notes)` class with a label declares speaker notes on a slide. Notes are not rendered on the slide — they are visible only in presenter mode:

```
@slide: intro

# Welcome

(notes): Remember to introduce the team first.
```

For multi-line notes, use a fenced Markdown block:

````
(notes):
```md
- Introduce the team
- Mention the timeline
```
````

One `(notes)` per slide. If multiple appear, last wins.

## `<!-- -->` — Comments

Standard HTML comment syntax. Comments are ignored by the renderer:

```
<!-- this is a comment -->
```
