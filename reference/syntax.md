# Syntax Reference

A reference for diagram source and Markdown embedding.

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

```text
a -> b -> c <- d
```

Connection endpoints may also be anonymous nodes:

```text
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

A colon declares a display label for a node or group:

```text
a: Agent
group1: Services
```

A colon after a connection declares an edge label. In a chained connection, the label applies to **all** edges in the chain:

```text
a -> b : contains
a -> b -> c : data
```

To label edges individually, use separate connection lines.

Declare endpoint labels separately from their connections. At the same brace depth, `:` introduces a display label in a declaration and an edge label after a connection:

```text
<!-- invalid -->
a: Agent -> b: Bias

<!-- valid -->
a -> b
a: Agent
b: Bias
```

A group body has its own statements, so `A -> { B: Bee }: outer` is valid: `Bee` labels the child `B`, while `outer` labels the edge from `A` to the group. The closing brace terminates the child statement. For named group endpoints, use `A -> D { B -> C }` with a separate `D: Services` declaration.

## `()` — Style Classes

Parentheses apply style classes to a node, edge, or group. After a token, `()` binds to that token. With no preceding token, it styles the following anonymous group. A standalone direction class sets the root layout:

- After a node or scope token → styles on that token: `a(fill primary dashed): Agent`, `group1(horizontal) { a -> b }`, `[B](dashed)`, and `{ B -> C }(horizontal)`
- After an arrow → edge styles: `a ->(bold) b`
- Before an anonymous group → styles on that group: `(horizontal) { B -> C } -> A`
- Start of line with no group body → root layout direction: `(horizontal)`

Immediately after an arrow, parentheses always style the edge: `A ->(bold) { B -> C }`. Style the target group after its closing brace, as in `A -> { B -> C }(horizontal)`, or after its name, as in `A -> D(horizontal) { B -> C }`.

```text
a(fill primary dashed): Agent
a -> [B](dashed)
a ->(bold) b
group1(horizontal) {}
```

Labels and classes can be combined on the same standalone line:

```text
a(fill primary): Agent
```

## `{}` — Containment and Groups

Curly braces give a node children and an independent layout scope. A named group follows ordinary node labeling: `D { B -> C }` has identifier and default visible title `D`; a separate `D: Services` declaration changes the title without changing the identifier. An anonymous `{ B -> C }` has no default title. Internal generated identifiers are never displayed.

An empty `{}` is still a group, so `A -> {}` is a valid connection to an empty anonymous group. To request a group with no name or default title, omit the identifier.

Content inside a group is arranged independently:

```text
group1 {
  a -> b
}
```

Scopes can be nested:

```text
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

## `.` — Cross-Scope Reference

Bare node names are global by default. A reference first checks the current scope, then each parent scope outward, and if still unresolved continues through the rest of the document. If that search finds exactly one node, the bare name is valid even when the node lives in another group:

```text
group1 {
  m: Inner
}

a -> m
```

Use dot notation only to disambiguate multiple nodes with the same name. Add the shortest group prefix that makes the target unique:

```text
a -> team1.m
a -> regionA.payments.api
```

If a bare name or dotted name still matches multiple candidates, it is an ambiguous reference and must be qualified further.

## `[]` — Anonymous Node

A bracketed label inside a connection creates a fresh node instance with no reusable identifier:

```text
A -> [B]
C -> [B]
```

The two `[B]` occurrences above are different nodes, even though they render the same text.

A single occurrence is still one node within a chain:

```text
A -> [B] -> C
```

Anonymous nodes cannot be declared on their own line or referenced later by name. If you need reuse, give the node an identifier instead:

```text
b: B
A -> b
C -> b
```

Style classes bind after the closing bracket:

```text
A -> [B](dashed primary)
```

## `\n` — Inline Line Break

Use `\n` in a node label for a line break:

```text
api: API Gateway\nPort 8080
```

## TextGraph Blocks in Markdown

Use a fenced code block with the language `textgraph` to embed a diagram in Markdown. Close it with a matching fence:

````markdown
# Architecture

```textgraph
client -> api -> database
```

The API handles requests from the client.
````

Use the [Markdown & VitePress plugin](/integrations/markdown) or the [VS Code extension](/integrations/vscode) to render these blocks. Each block contains one diagram. In the [Playground](/playground) and SDK `source`, enter only the diagram source inside the fence.

## `<!-- -->` — Comments

Standard HTML comment syntax. Comments are ignored by the renderer:

```text
<!-- this is a comment -->
```
