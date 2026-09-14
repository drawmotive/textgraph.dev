# Syntax Reference

::: warning Implementation status
Only flowcharts and directed graphs are implemented. Mind maps, sequence diagrams, and slides are not implemented yet. References to those formats, including `@slide` and `(notes)`, describe planned syntax.
:::

A complete reference for all operators and punctuation in the TextGraph DSL. For the formal, machine-readable syntax definition see the [PEG Grammar](/reference/grammar).

Bare identifiers denote nodes, arrows denote relationships, parentheses apply styles, and colons introduce labels. Curly braces add containment: a group is a node with children. Omitting its identifier creates an anonymous group.

## Identifiers

Node and scope names must start with a letter or underscore, and can contain letters, digits, hyphens, and underscores. Dots are not part of a name — they qualify a reference with group names when disambiguation is needed (see [`.` — Cross-Scope Reference](#-cross-scope-reference)). Anonymous nodes use `[Label]`; anonymous groups use `{ ... }`. Neither creates a reusable name.

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

Groups can also be endpoints, including empty, nested, named, and anonymous groups:

```text
A -> { B -> C }
A -> {}
{ B -> C } -> D
A -> D { B -> C } -> E
```

Each outer arrow connects to the **group boundary**. It does not connect to, or fan out across, the children. Spaces are optional: `A->{B->C}` is valid.

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

Declare endpoint labels separately from their connections. At the same brace depth, `:` introduces a display label in a declaration and an edge label after a connection:

```
<!-- invalid -->
a: Agent -> b: Bias

<!-- valid -->
a -> b
a: Agent
b: Bias
```

A group body has its own statements, so `A -> { B: Bee }: outer` is valid: `Bee` labels the child `B`, while `outer` labels the edge from `A` to the group. The closing brace terminates the child statement. For named group endpoints, use `A -> D { B -> C }` with a separate `D: Services` declaration.

## `()` — Style Classes

Parentheses apply style classes to a node, edge, scope, or slide boundary. After a token, `()` binds to that token. With no preceding token, it styles the following anonymous group or the current scope:

- After a node or scope token → styles on that token: `a(fill primary dashed)`, `group1(horizontal)`, `[B](dashed)`, and `{ B -> C }(horizontal)`
- After an arrow → edge styles: `a ->(bold) b`
- Before an anonymous group → styles on that group: `(horizontal) { B -> C } -> A`
- Start of line with no group body → scope-level styles: `(horizontal)`

Immediately after an arrow, parentheses always style the edge: `A ->(bold) { B -> C }`. Style the target group after its closing brace, as in `A -> { B -> C }(horizontal)`, or after its name, as in `A -> D(horizontal) { B -> C }`.

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

## `{}` — Containment and Groups

Curly braces give a node children and an independent layout scope. A named group follows ordinary node labeling: `D { B -> C }` has identifier and default visible title `D`; a separate `D: Services` declaration changes the title without changing the identifier. An anonymous `{ B -> C }` has no default title. Internal generated identifiers are never displayed.

An empty `{}` is still a group, so `A -> {}` is a valid connection to an empty anonymous group. To request a group with no name or default title, omit the identifier.

Content inside a group is arranged independently:

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

A group occurrence in a chain is reused by both adjacent arrows:

```text
A -> { B -> C } -> D
```

This creates one anonymous group between `A` and `D`, plus the child connection `B -> C`. Separate `{ ... }` occurrences create separate anonymous groups. Use a named group when it needs to be referenced from another statement.

## `@slide` — Slide Boundary

::: warning Not implemented
Slide boundaries and diagram content on slides are not available yet. This section describes planned syntax.
:::

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

::: warning Not implemented
Speaker notes and presenter mode are not available yet. This section describes planned syntax.
:::

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
