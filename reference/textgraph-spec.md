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

An identifier is the internal name for a node or scope. Use a letter or underscore to begin a name, followed by letters, digits, hyphens, or underscores. For example: `a`, `myNode`, `api-server`, `_temp`.

Dots (`.`) are **not** part of an identifier — they qualify a reference with one or more group names when disambiguation is needed. `group1.m` means "node `m` in group `group1`"; it is a qualified reference, not a single identifier.

Not every connection endpoint has an identifier. `[Label]` creates an **anonymous node** with the visible label `Label` but no reusable name. `{ ... }` creates an **anonymous group** with no reusable name or default title.

### Node Labels

By default a node is drawn using its identifier as its label. To assign a display label, use a separate declaration on its own line:

```text
a: Agent
b: Bias
```

Now the rendered diagram shows "Agent" and "Bias" inside their respective blocks. Label declarations can appear anywhere in the document — before or after any connection that references the identifier:

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

- After a node or group token → styles on that token, as in `a -> b(dashed)`, `group1(horizontal) { a -> b }`, and `a -> [B](dashed)`
- After an arrow operator → edge styles: `->(bold)`
- Before an anonymous group → styles on that group: `(horizontal) { B -> C } -> A`
- At the document root with no group body → layout direction: `(horizontal)`

Parentheses immediately after an arrow belong to the edge, including `A ->(bold) { B -> C }`. To style that target group, use `A -> { B -> C }(horizontal)` or name it: `A -> D(horizontal) { B -> C }`.

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

This creates three edges: `a → b`, `b → x`, and `y → x`. All inline label and style syntax applies to each node in the chain.

Anonymous nodes follow the same chaining rule:

```text
A -> [B] -> C
```

The single `[B]` occurrence is one node reused by both adjacent edges. Two separate `[B]` occurrences create two separate anonymous nodes.

Group endpoints follow the same occurrence rule. `A -> { B -> C } -> D` creates one group reused by both outer edges. Each separate `{ ... }` occurrence creates its own anonymous group. The outer arrows attach to the group boundary; the children remain inside it.

### Line Types

Declarations and connections are distinguished by arrows (`->`, `<-`, `<->`, or `--`) at the current brace depth. A group body has its own statements; an arrow inside it does not turn the enclosing group declaration into a connection.

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

On a declaration statement, `:` introduces a display label. After a connection at the same brace depth, it introduces an edge label. Declare a named endpoint title separately, for example `D: Services` followed by `A -> D { B -> C }`. Child labels end at their owning closing brace: `A -> { B: Bee }: outer` labels child `B` as `Bee` and the edge from `A` to the group as `outer`.

### Comments

Comments use standard HTML/Markdown comment syntax and are ignored by the renderer:

```text
<!-- this is a comment -->
```

## Grouping & Layout

### Layout Classes

Set the direction of a diagram at the document root:

```text
(horizontal)
a -> b -> c
```

Set a group’s layout on its opening declaration:

```text
services(horizontal) {
  api: API Server
  worker: Worker
}
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

### Scopes and Groups

Curly braces express containment. A group is a compound node containing child nodes and connections:

```text
{}
```

A named scope attaches an identifier to the group, making it referenceable. The identifier is also its default visible title, just as for an ordinary node. `D { B -> C }` is titled `D`; `D: Services` overrides the title without changing the identifier. A space before the braces is preferred but optional:

```text
group1 {}
```

Content placed inside the braces belongs to that scope:

```text
group1 {
  m -> n
}
```

`m` and `n` belong to `group1` and are placed inside its boundary.

Declare a group’s styles and title in its opening header:

```text
group1(fill primary): Services {
  m -> n
}
```

The title may also be declared separately:

```text
group1: Services
group1(horizontal) {
  m -> n
}
```

For a compact body, use `group1 { m -> n }` and declare `group1: Services` separately.

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

```text
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

```text
a: Outer A
group1 {
  a: Inner A
  <!-- resolves to Inner A -->
  a -> b
}
<!-- resolves to Outer A -->
a -> c
```

No special syntax is needed to reference an outer scope — if a node name isn't found in the current scope, the lookup continues automatically through each enclosing scope.

If a node name is not found in the current scope or any ancestor, lookup continues through the rest of the document. This means outer-to-inner and inner-to-outer references follow the same rule:

```text
group2 {
  m: Inner M
}

<!-- resolves to group2.m -->
a -> m
```

When multiple matches remain visible at the same stage, the reference is ambiguous and must be qualified with group names:

```text
team1 {
  m: Worker
}
team2 {
  m: Monitor
}

a -> team1.m
```

Dot notation is therefore a **disambiguation mechanism**, not the default way to cross scope boundaries. A qualified reference may use the **shortest group prefix that makes the target unique**:

```text
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

a -> regionA.payments.api
```

Here `api` and `payments.api` are ambiguous. The qualifier names containing groups from outer to inner, but it does **not** need to start at the document root unless that much context is required to remove the ambiguity.
