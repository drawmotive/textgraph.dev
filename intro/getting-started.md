# Getting Started

This page walks you through TextGraph's core features using a cloud architecture example that builds from two nodes to a multi-tier platform. Each section introduces exactly one new concept.

## Your First Diagram

Two nodes, one arrow — TextGraph does the rest.

```text
client -> api
```

Each word becomes a node labeled with its own name. The `->` operator draws a directed edge between them. No diagram-type declaration is needed.

## Adding Nodes

Chain nodes to extend the diagram. Each `->` adds one edge.

```text
client -> api -> database
```

Three identifiers, two arrows, one complete request flow. Chains can be as long as you need.

## Node Labels

By default, a node displays its identifier as its label. To assign a human-readable name, declare it on a separate line with `id: Label`.

```text
client -> api -> db

client: Browser Client
api: API Gateway
db: PostgreSQL
```

Labels can appear before or after the connections — the renderer collects all declarations before layout. Write connections first to focus on relationships, then name the nodes.

Labels cannot appear inline on a connection line. This is invalid:

```text
<!-- invalid -->
client: Browser Client -> api: API Gateway
```

See [Flowcharts — Node Labels](/diagrams/flowcharts#node-labels) for more detail.

## Edge Labels

Append `: label` after a connection to annotate the edge.

```text
client -> api : HTTPS
api -> db : SQL query

client: Browser Client
api: API Gateway
db: PostgreSQL
```

Edge labels describe protocols, data formats, or outcomes. The label text is trimmed of surrounding whitespace.

## Styling Nodes

Place style classes in parentheses after the node identifier. Classes compose — list as many as you need, separated by spaces.

```text
client -> api -> db

client: Browser Client
api(fill primary): API Gateway
db: PostgreSQL
```

`fill primary` fills the node with the primary brand color. Use `circle`, `ellipse`, or `diamond` to change a node’s shape.

See [Style Classes](/reference/classes) for the full list of colors, shapes, borders, and weights.

## Grouping

Curly braces define a named scope. Nodes inside a group are laid out independently. Connect across groups using dot notation.

```text
frontend {
  browser -> cdn
  browser: Browser
  cdn: CDN
}

backend {
  api -> auth
  api: API Gateway
  auth: Auth Service
}

data {
  db: PostgreSQL
  cache: Redis
}

frontend.cdn -> backend.api
backend.api -> data.db
backend.api -> data.cache
```

Groups map naturally to architectural tiers — frontend, backend, data — and keep the diagram organized as it grows.

See [Flowcharts — Groups](/diagrams/flowcharts#groups-and-scopes) for named groups, nested scopes, and anonymous groups.

## Layout

Apply the `horizontal` class to a scope to arrange its children left to right instead of the default top to bottom.

```text
services(horizontal) {
  api -> auth -> worker
}
```

Put the direction class on the group header. For the whole diagram, place `(horizontal)` at the start of the source.

See [Flowcharts — Layout](/diagrams/flowcharts#layout-control) for layout directions and column grids.

## Start Using TextGraph

### Playground

The fastest way to try TextGraph — no install required.

[Open the Playground →](/playground)

Paste a diagram example from this page to render it.

### Markdown

Put diagram source inside a fenced block with the language `textgraph`:

````markdown
```textgraph
client -> api -> database
```
````

Use the [Markdown & VitePress plugin](/integrations/markdown) to render these blocks in documentation.

### VS Code Extension

Search for **TextGraph** in the VS Code extension marketplace, or see the [VS Code Extension](/integrations/vscode) guide.

## Next Steps

| Topic | What you'll learn |
|-------|-------------------|
| [Flowcharts](/diagrams/flowcharts) | Connection types, shapes, edge styles, groups, layout control |
| [Style Classes](/reference/classes) | Colors, shapes, line styles, and weights |
| [Language Specification](/reference/textgraph-spec) | Full grammar and rendering rules |
