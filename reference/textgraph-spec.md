# TextGraph DSL — Language Specification

**License:** [Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)](https://creativecommons.org/licenses/by-nd/4.0/)

Copyright © 2026 mason@drawmotive.com, kelly@drawmotive.com


## Overview

**TextGraph** is a text-based language for flowcharts and directed graphs. Nodes, connections, labels, and groups describe the diagram; style classes control its appearance and layout.

For a quick introduction, see [Syntax Overview](/reference/syntax).

### Embedding in Markdown

In a Markdown integration with TextGraph enabled, put diagram source inside a fenced code block with the language `textgraph`:

````markdown
```textgraph
client -> api -> database
```
````

Each fenced block is a separate diagram. Standalone `.textgraph` files contain the diagram source directly.

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

An identifier is the reusable name for a node or group. Use a letter or underscore to begin a name, followed by letters, digits, hyphens, or underscores. For example: `a`, `myNode`, `api-server`, `_temp`.

Names are global: every occurrence of an identifier refers to the same node or named group, regardless of order or containment. Use different identifiers for different nodes; their display labels may be identical. Dotted references such as `group1.m` are invalid.

Not every connection endpoint has an identifier. `[Label]` creates an **anonymous node** with the visible label `Label` but no reusable name. `{ ... }` creates an **anonymous group** with no reusable name or default title.

### Node Labels

By default a node is drawn using its identifier as its label. To assign a display label, use a separate declaration on its own line:

```text
a: Agent
b: Bias
```

Now the rendered diagram shows "Agent" and "Bias" inside their respective blocks. Label declarations can appear before or after any connection at the document root:

```text
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

Labels, styles, and connections always use the same global name. Write node decorations at the document root, including for nodes inside groups. A separate decoration line changes its label or appearance without changing its group membership. This lets you keep the structure together and put decorations at the end:

```textgraph example
{
  shopping(info): Shopping {
    browse
    checkout
  }
  delivery(success): Delivery {
    pack
    ship
    arrived
  }
}

Backend {
  payment
  saved
}

browse -> checkout
pack -> ship -> arrived
checkout -> payment
saved -> pack

browse(ellipse): Browse the shop
checkout: Place an order
pack: Prepare the package
ship: Ship the package
arrived(ellipse fill success): Package arrives
```

Here `payment` always identifies the member of `Backend`. `checkout: Place an order` updates the member of `shopping` without changing its group. Decorations and connections may also precede the groups. The group body alone assigns membership; placing the same node in a second group is an error.

### Anonymous Nodes

To create a fresh node inline inside a connection, wrap its label in square brackets:

```text
A -> [B]
C -> [B]
```

These two `[B]` occurrences create **two distinct nodes** even though they render the same label. Anonymous nodes do not create identifiers, cannot be declared on their own line, and cannot be referenced later by name.

If you need the same node to be reused across multiple connections, give it an identifier instead:

```text
b: B
A -> b
C -> b
```

A single anonymous-node occurrence is still one node, so chained connections reuse that same inline node:

```text
A -> [B] -> C
```

This creates one anonymous `B` node between `A` and `C`, not two. Style classes bind after the closing bracket:

```text
A -> [B](dashed primary)
```

The bracket text is rendered using the same inline label rules as any other node label.

### Label Text and Line Breaks

A label is displayed inside its node. Use `\n` for a line break in node labels, anonymous node labels, group titles, or edge labels:

```text
api: API\nServer
api -> [Save\nRecord] : write\nrequest
```

## Styling

### Node Styles

Styles are applied inline after the node identifier using parentheses:

```text
a(fill primary dashed): Agent
```

The space-separated tokens select the node’s fill, color, and line style. See the [Style Classes Reference](/reference/classes) for the available classes.

### Token Binding Rule

After a token, parentheses bind to that token. With no preceding token, they style the following anonymous group or set the root layout direction:

- After a node or group token → styles on that token, as in `a -> b(dashed)`, `group1(horizontal) { a }`, and `a -> [B](dashed)`
- After an arrow operator → edge styles: `->(bold)`
- Before an anonymous group → styles on that group: `(horizontal) { B } -> A`
- At the document root with no group body → layout direction: `(horizontal)`

Parentheses immediately after an arrow belong to the edge, including `A ->(bold) { B }`. To style that target group, use `A -> { B }(horizontal)` or name it: `A -> D(horizontal) { B }`.

In a chained connection like `a -> b(dashed) -> c`, `(dashed)` binds to `b` because `b` is the token right before it — so it is a node style, not an edge style.

### Edge Labels

To label the arrow between two nodes, append `: <label>` to the connection:

```text
a -> b : contains
```

This renders the word **contains** along the arrow. The label is trimmed of surrounding whitespace.

In a chained connection, the trailing label applies to **all** edges in the chain:

```text
a -> b -> c : data
```

This labels both the `a → b` and `b → c` edges with **data**. To label edges individually, write them as separate connection lines:

```text
a -> b : request
b -> c : forward
```

### Edge Styles

Style classes can be applied to an edge by placing them in parentheses after the arrow:

```text
a ->(bold primary) b
```

This makes the arrow bold with the primary color. Edge style tokens follow the same composable rules as node styles.

### Node Declarations and Styles

Apply a style in a node’s label declaration or directly on a connection endpoint:

```text
a(fill primary): Agent
a -> b(dashed)
b: Bias
```

Write node labels on their own declaration lines. A colon after a connection introduces an edge label:

```text
a: Agent
b: Bias
a -> b : influences
```

### Chained Connections

Multiple nodes can be chained in a single statement:

```text
a -> b -> x <- y
```

This creates three edges: `a → b`, `b → x`, and `y → x`. Endpoint styles apply to each node in the chain; declare node labels separately.

Anonymous nodes follow the same chaining rule:

```text
A -> [B] -> C
```

The single `[B]` occurrence is one node reused by both adjacent edges. Two separate `[B]` occurrences create two separate anonymous nodes.

Group endpoints follow the same occurrence rule. `A -> { B } -> D` creates one group reused by both outer edges. Each separate `{ ... }` occurrence creates its own anonymous group. The outer arrows attach to the group boundary; the children remain inside it.

### Line Types

At the document root, arrows (`->`, `<-`, `<->`, or `--`) distinguish connections from declarations. Group bodies contain only bare member identifiers, nested group blocks, and comments. Connections, node labels, and node styles belong at the document root.

**Declaration line** — no arrow. The colon sets a display label:

```text
a: Agent
a(fill primary): Agent
```

**Connection line** — has an arrow. The colon sets an edge label:

```text
a -> b : contains
a -> b -> c : all edges labeled
```

On a declaration statement, `:` introduces a display label. After a connection, it introduces an edge label. Declare a named endpoint title separately, for example `D: Services` followed by `A -> D { B }`. Label the child on a root line such as `B: Bee`.

### Comments

Comments use standard HTML/Markdown comment syntax and are ignored by the renderer:

```text
<!-- this is a comment -->
```

## Grouping & Layout

### Layout Classes

Set diagram direction at the document root, or set a group’s layout in its header:

```text
(horizontal)
services(vertical): Services {
  api
  worker
}
api -> worker
api: API Server
worker: Worker
```

| Class | Effect |
|-------|--------|
| `horizontal` | Arrange left-to-right |
| `vertical` | Arrange top-to-bottom |
| `layout-2-col` | Arrange a group’s nodes in 2 columns |
| `layout-3-col` | Arrange a group’s nodes in 3 columns |
| `layout-4-col` | Arrange a group’s nodes in 4 columns |
| `layout-6-col` | Arrange a group’s nodes in 6 columns |

Column layouts apply to groups containing nodes directly. Without an explicit layout class, the diagram is arranged automatically from its connections.

### Membership

Curly braces declare containment. A group body contains only bare member identifiers, nested groups, and comments. Put every connection and node decoration at the document root:

```text
platform {
  frontend(info): Frontend {
    browser
  }
  backend(primary): Backend {
    api
    worker
  }
}

browser -> api -> worker
browser: Browser
api: API Gateway
worker(fill success): Worker
```

A node can be a direct member of one group. It is also visually inside that group’s ancestors. Mentioning a member at the document root does not remove it from its group. Membership does not depend on whether the connection, label, or group appeared first.

Listing the same node twice in one group still identifies one member. Listing it in two different groups is invalid; declaration order never selects an owner. If two different nodes need the same display text, give them different identifiers:

```text
frontend { frontend_api }
backend { backend_api }
frontend_api -> backend_api
frontend_api: API
backend_api: API
```

Named group identifiers are global too. Declare each named group once, then reuse its name in root connections or decorations. A node and a group cannot use the same name. A named group uses its identifier as the default title; use a header such as `backend(primary): Services {` or a separate root declaration `backend: Services` to change it.

An anonymous group omits the identifier: `{ member }`. It has no default title or reusable name. Every separate anonymous group occurrence creates a distinct group. Empty named and anonymous groups are valid.

### Groups as Connection Endpoints

Groups can be sources, targets, or intermediate endpoints. Their bodies follow the same membership-only rule:

```text
A -> services {
  B
  C
} -> D
B -> C
services: Services
```

Both outer edges attach to the boundary of one `services` group. The separate root connection `B -> C` connects its children. A group endpoint never expands into external arrows to each member.

Whitespace around braces and arrows is optional: `A->{B}->D` is valid. Put multiple members on separate lines. `A -> {} -> {}` contains two distinct empty anonymous groups. Nested groups may also appear inside an inline group body.

### Global References

Use a node’s simple name everywhere. There is no local lookup, shadowing, or parent-path syntax:

```text
checkout -> payment
payment(fill success): Take payment

Shopping {
  checkout
}
Backend {
  payment
}
```

Moving the root connections and decorations before or after the groups leaves node identity and membership unchanged. Dotted references such as `Backend.payment` are invalid. If a node is not listed in any group, it belongs to the document root.
