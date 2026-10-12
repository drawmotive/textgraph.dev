# Syntax Reference

A reference for diagram source and Markdown embedding.

Bare identifiers denote nodes, arrows denote relationships, parentheses apply styles, and colons introduce labels. Curly braces add containment: a group is a node with children. Omitting its identifier creates an anonymous group.

## Identifiers

Node and group names must start with a letter or underscore, and may contain letters, digits, hyphens, and underscores. Names inside a group identify local members. Different groups may contain different objects with the same name. Outside the groups, a unique short name is enough; duplicated names need a group prefix such as `Backend.api`. Anonymous nodes use `[Label]`; anonymous groups use `{ ... }`. Neither creates a reusable name.

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
{ C } -> D
A -> services { F } -> E
```

Each outer arrow connects to the **group boundary**. It does not connect to, or fan out across, the children. Spaces are optional: `A->{B}->C` is valid.

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

Group bodies contain connections, bare member names, nested group blocks, and comments. Put child labels at the root: `A -> { B }: outer` followed by `B: Bee` labels the edge and its child separately. Named group endpoints can use a separate title declaration such as `D: Services`.

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

Group bodies declare members directly with connections or bare identifiers. Nested groups and comments are also allowed. Separate node decorations and cross-group connections stay at the document root:

```text
Shopping(info): Shopping {
  browse -> checkout
}
Backend {
  payment
}

checkout -> payment
browse(ellipse): Browse the shop
checkout: Place an order
payment(fill success): Take payment
```

A grouped connection needs no bare predeclarations: each short node endpoint creates or reuses a local member of the containing group. Declared group endpoints can also use a unique short name; prefer a local member when present. Qualified endpoints explicitly reference existing nodes or groups without moving them. Inline endpoint and edge styles remain valid; separate node decorations stay at the root.

The same name in two groups creates two distinct nodes. Root connections and decorations resolve a unique short name across the whole diagram, or a qualified name when the short name is duplicated. They leave membership unchanged and may appear before or after the groups. Group order never changes the meaning of a short name inside a group.

Groups may nest:

```text
platform {
  services(horizontal) {
    api -> worker
  }
}
api: API
worker: Worker
```

Named groups use their names as default titles. Different parents may contain groups with the same name; declare each named group once in its parent. A separate root declaration such as `services: Services` changes the title when that name is unique. A node and a group cannot share a name in the same parent.

An anonymous `{ B }` group has no name or default title. Each anonymous group occurrence is distinct. Empty groups are valid: `A -> {}` connects to an empty anonymous group. Multiple members must be on separate lines.

A group occurrence in a chain is reused by both adjacent arrows:

```text
A -> {
  B -> C
} -> D
```

Both outer edges attach to one group boundary. The grouped `B -> C` connection introduces and connects its children. Use a named group when it needs to be reused by another statement.

## Short and Qualified References

Use a short name to connect or decorate a node or group when the name is unique across the diagram. `payment` and `Backend.payment` can both refer to the only `payment` node. With duplicated names, add a group prefix:

```text
Frontend { api -> browser }
Backend { api -> worker }
Frontend.api -> Backend.api
Frontend.api: Browser API
Backend.api: Service API
```

Use the shortest unique trailing group path for nested members, such as `services.api` or `platform.services.api`. Inside a group, an unqualified node name always creates or reuses a local member; use a qualified endpoint to refer elsewhere. A qualified reference must already exist. If no subject has a root short reference’s name, that root statement introduces an ungrouped node.

A node not introduced by any group body belongs to the document root.

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
