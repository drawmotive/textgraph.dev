# Getting Started

This page walks you through TextGraph's core features using a cloud architecture example that builds from two nodes to a multi-tier platform. Each section introduces exactly one new concept.

## Your First Diagram

Two nodes, one arrow — TextGraph does the rest.

```
client -> api
```

Each word becomes a node labeled with its own name. The `->` operator draws a directed edge between them. TextGraph infers the diagram type automatically — no declaration needed.

## Adding Nodes

Chain nodes to extend the diagram. Each `->` adds one edge.

```
client -> api -> database
```

Three identifiers, two arrows, one complete request flow. Chains can be as long as you need.

## Node Labels

By default, a node displays its identifier as its label. To assign a human-readable name, declare it on a separate line with `id: Label`.

```
client -> api -> db

client: Browser Client
api: API Gateway
db: PostgreSQL
```

Labels can appear before or after the connections — the renderer collects all declarations before layout. Write connections first to focus on relationships, then name the nodes.

Labels cannot appear inline on a connection line. This is invalid:

```
<!-- invalid -->
client: Browser Client -> api: API Gateway
```

See [Flowcharts — Node Labels](/diagrams/flowcharts#node-labels) for more detail.

## Edge Labels

Append `: label` after a connection to annotate the edge.

```
client -> api : HTTPS
api -> db : SQL query

client: Browser Client
api: API Gateway
db: PostgreSQL
```

Edge labels describe protocols, data formats, or outcomes. The label text is trimmed of surrounding whitespace.

## Styling Nodes

Place style classes in parentheses after the node identifier. Classes compose — list as many as you need, separated by spaces.

```
client -> api -> db

client: Browser Client
api(fill primary): API Gateway
db(cylinder): PostgreSQL
```

`fill primary` fills the node with the primary brand color. `cylinder` changes the shape to represent a database. These are two independent classes that combine freely.

See [Style Classes](/reference/classes) for the full list of colors, shapes, borders, and weights.

## Grouping

Curly braces define a named scope. Nodes inside a group are laid out independently. Connect across groups using dot notation.

```
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
  db(cylinder): PostgreSQL
  cache(cylinder): Redis
}

frontend.cdn -> backend.api
backend.api -> data.db
backend.api -> data.cache
```

Groups map naturally to architectural tiers — frontend, backend, data — and keep the diagram organized as it grows.

See [Flowcharts — Groups](/diagrams/flowcharts#groups-and-scopes) for named groups, nested scopes, and anonymous groups.

## Layout

Apply the `horizontal` class to a scope to arrange its children left to right instead of the default top to bottom.

```
platform(horizontal) {
  frontend(vertical) {
    browser: Browser
    mobile: Mobile App
  }
  backend(vertical) {
    api: API Gateway
    worker: Worker
  }
  data(vertical) {
    db(cylinder): PostgreSQL
    cache(cylinder): Redis
  }
}
```

Each scope controls its own layout independently of its parent. The outer `platform` scope lays out the three tiers side by side, while each tier stacks its nodes vertically.

See [Flowcharts — Layout](/diagrams/flowcharts#layout-control) for grid layouts, justify, and align options.

## Beyond Flowcharts

The language design includes additional diagram types. Only flowcharts and directed graphs are implemented today; the sections below describe planned features.

### Mind Maps

::: warning Not implemented
Mind maps are not available yet. The following is a planned syntax example and will not render as a mind map.
:::

Apply the `mindmap` class to a scope. Hierarchy comes from indentation — no arrows needed.

```
cloud(mindmap) {
  Cloud Platform
    Compute
      EC2
      Lambda
    Storage
      S3
      EBS
    Database
      RDS
      DynamoDB
}
```

Each indented line becomes a child of the line above it at one less indent level. The tree structure is implicit.

See [Mind Maps](/diagrams/mindmaps) for identifiers, styling, and explicit cross-tree connections.

### Sequence Diagrams

::: warning Not implemented
Sequence diagrams are not available yet. The following is a planned syntax example and will not render as a sequence diagram.
:::

Add `(sequence)` as a scope-level style. The same `->` syntax now draws messages on a timeline.

```
(sequence)
client -> gateway : HTTPS request
gateway -> auth : validate JWT
auth -> db : SELECT session
auth -> gateway : 200 OK
gateway -> client : JSON response

client: Browser
gateway: API Gateway
auth: Auth Service
db(cylinder): Session Store
```

Each identifier becomes a participant with a vertical lifeline. Messages flow in the order they appear.

See [Sequence Diagrams](/diagrams/sequence) for message types, combined fragments, and participant styling.

## Start Using TextGraph

### Playground

The fastest way to try TextGraph — no install required.

[Open the Playground →](/playground)

Paste a flowchart or directed-graph example from this page to render it. The mind map and sequence diagram examples are not supported yet.

### CLI

Install the command-line tool with your preferred package manager:

```bash
npm install -g textgraph
```

```bash
pnpm add -g textgraph
```

```bash
yarn global add textgraph
```

Render a diagram from a file:

```bash
textgraph render diagram.md -o diagram.svg
```

### VS Code Extension

Search for **TextGraph** in the VS Code extension marketplace, or see the [VS Code Extension](/integrations/vscode) guide.

## Next Steps

| Topic | What you'll learn |
|-------|-------------------|
| [Flowcharts](/diagrams/flowcharts) | Connection types, shapes, edge styles, groups, layout control |
| [Mind Maps](/diagrams/mindmaps) — **Not implemented** | Planned indentation hierarchy and cross-tree edges |
| [Sequence Diagrams](/diagrams/sequence) — **Not implemented** | Planned message types and combined fragments |
| [Authoring Slides](/slides/authoring) — **Not implemented** | Planned slide boundaries, Markdown content, and themes |
| [Style Classes](/reference/classes) | Colors, shapes, borders, weights, overlays |
| [Language Specification](/reference/textgraph-spec) | Full grammar and rendering rules |
