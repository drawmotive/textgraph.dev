# Syntax Reference

A reference for diagram source and Markdown embedding.

Bare identifiers denote nodes, arrows denote relationships, parentheses apply styles, and colons introduce labels. Curly braces add containment: a group is a node with children. Omitting its identifier creates an anonymous group.

## Identifiers

Node and group names must start with a letter or underscore, and may contain letters, digits, hyphens, and underscores. Each name identifies one object throughout the diagram. Use different names for different objects, even when their display labels match. Dotted references are invalid. Anonymous nodes use `[Label]`; anonymous groups use `{ ... }`. Neither creates a reusable name.

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
A -> { B }
A -> {}
{ B } -> D
A -> D { B } -> E
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

Group bodies contain only bare member names, nested group blocks, and comments. Put child labels at the root: `A -> { B }: outer` followed by `B: Bee` labels the edge and its child separately. Named group endpoints can use a separate title declaration such as `D: Services`.

## `()` — Style Classes

Parentheses apply style classes to a node, edge, or group. After a token, `()` binds to that token. With no preceding token, it styles the following anonymous group. A standalone direction class sets the root layout:

- After a node or group token → styles on that token: `a(fill primary dashed): Agent`, `group1(horizontal) { a }`, `[B](dashed)`, and `{ B }(horizontal)`
- After an arrow → edge styles: `a ->(bold) b`
- Before an anonymous group → styles on that group: `(horizontal) { B } -> A`
- Start of line with no group body → root layout direction: `(horizontal)`

Immediately after an arrow, parentheses always style the edge: `A ->(bold) { B }`. Style the target group after its closing brace, as in `A -> { B }(horizontal)`, or after its name, as in `A -> D(horizontal) { B }`.

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

Group bodies list membership. A member is a bare identifier, a nested group, or a comment. Connections and node decorations always stay at the document root:

```text
Shopping(info): Shopping {
  browse
  checkout
}
Backend {
  payment
}

browse -> checkout -> payment
browse(ellipse): Browse the shop
checkout: Place an order
payment(fill success): Take payment
```

Each node has one global name and can be a direct member of one group. A root connection or decoration always refers to that same node and leaves its membership unchanged. Connections and decorations may appear before or after the groups. Listing one node in two different groups is an error, regardless of order.

Groups may nest:

```text
platform {
  services(horizontal) {
    api
    worker
  }
}
api -> worker
api: API
worker: Worker
```

Named groups use their names as default titles. Group names are global and each named group is declared once. A separate root declaration such as `services: Services` changes the title. A node and a group cannot share a name.

An anonymous `{ B }` group has no name or default title. Each anonymous group occurrence is distinct. Empty groups are valid: `A -> {}` connects to an empty anonymous group. Multiple members must be on separate lines.

A group occurrence in a chain is reused by both adjacent arrows:

```text
A -> {
  B
  C
} -> D
B -> C
```

Both outer edges attach to one group boundary. The root `B -> C` connection connects the children. Use a named group when it needs to be reused by another statement.

## Global References

Use a simple name to connect or decorate any named node, including members of deeply nested groups. There is no local lookup or shadowing, and dotted references such as `Backend.payment` are invalid.

To give different nodes the same visible label, use different identifiers:

```text
Frontend { frontend_api }
Backend { backend_api }
frontend_api -> backend_api
frontend_api: API
backend_api: API
```

A node omitted from all group bodies belongs to the document root.

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
