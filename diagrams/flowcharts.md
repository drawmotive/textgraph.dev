---
aside: false
---

# Flowcharts

Describe nodes and their connections to create a flowchart or directed graph. No diagram-type declaration is needed.

All examples on this page use cloud architecture as the running context.

Each runnable example pairs its TextGraph source with a rendered diagram. On narrow screens, the diagram appears below the source.

## Your First Flowchart

Three identifiers and two arrows produce a complete diagram.

```textgraph example
client -> api -> database
```

Each identifier becomes a node labeled with its own name. The `->` operator draws a directed edge. TextGraph arranges the nodes automatically.

## Node Labels

By default, a node displays its identifier as its label. To assign a human-readable name, declare a label on a separate line with `id: Label`.

Build the diagram structure first, then name the nodes. This keeps you focused on relationships before cosmetics.

```textgraph example
client -> api -> db

client: Browser Client
api: API Gateway
db: PostgreSQL
```

Labels can appear before or after the connections that reference them — the renderer collects all declarations before layout. Both orderings are equivalent. This page uses the connections-first style throughout.

Labels cannot appear inline on a connection line. This is invalid:

```text
<!-- invalid -->
client: Browser Client -> api: API Gateway
```

Style and label can be combined on a single standalone line:

```textgraph example
api(fill primary): API Gateway
```

## Connection Types

TextGraph supports four connection types.

| Syntax | Meaning |
|--------|---------|
| `a -> b` | `a` points to `b` |
| `a <- b` | `b` points to `a` |
| `a <-> b` | Bidirectional |
| `a -- b` | Undirected (no arrowhead) |

```textgraph example
<!-- directed: gateway sends requests to auth -->
gateway -> auth

<!-- reverse: metrics pulls data from worker -->
metrics <- worker

<!-- bidirectional: mutual event subscriptions -->
gateway <-> worker

<!-- undirected: peer availability zones -->
az1 -- az2

gateway: API Gateway
auth: Auth Service
metrics: Metrics Collector
worker: Worker Service
az1: Availability Zone 1
az2: Availability Zone 2
```

## Edge Labels

Append `: label` after a connection to annotate the edge.

```textgraph example
client -> gateway : HTTPS
gateway -> auth : JWT
auth -> db : lookup
auth -> gateway : 200 OK / 401

client: Browser
gateway: API Gateway
auth: Auth Service
db: Session Store
```

Edge labels describe protocols, data formats, or outcomes. The label text is trimmed of surrounding whitespace.

## Chained Connections

Chain multiple nodes in a single statement. Each `->` creates one edge.

```textgraph example
commit -> build -> test -> stage -> prod

commit: Git Commit
build: Build
test: Run Tests
stage: Staging
prod: Production
```

Mixed directions work in chains:

```textgraph example
a -> b -> c <- d
```

This creates three edges: `a -> b`, `b -> c`, and `d -> c`.

Inline styles apply per node in a chain:

```textgraph example
commit(circle) -> build(fill) -> test(fill) -> deploy(fill success) -> prod(ellipse)
```

## Node Shapes

Shapes map to standard flowchart conventions. Apply a shape class in parentheses after the node identifier.

| Class | Convention |
|-------|------------|
| `rectangle` | Process / action (default) |
| `circle` | Start / end / event |
| `ellipse` | Start / end |
| `diamond` | Decision / branch |

```textgraph example
start -> check
check -> build : yes
check -> fail : no
build -> artifact
build -> db : read config
build -> api

start(circle): Deploy
check(diamond): Tests pass?
build: Build Image
artifact: Release Notes
db: Config Store
api(ellipse): Live API
fail(circle danger): Abort
```

## Styling Nodes

### Fill and Colors

The `fill` class fills a node with the primary fill color. Combine with a color class to set a specific fill color.

```textgraph example
api(fill): Default Fill
auth(fill primary): Primary
cache(fill info): Info
ok(fill success): Healthy
degraded(fill warning): Degraded
down(fill danger): Down
```

Semantic colors — `primary`, `secondary`, `info`, `success`, `warning`, `danger` — carry meaning.

```textgraph example
<!-- service health dashboard -->
web -> api -> queue
api -> db
api -> cache

web(fill success): Web Server
api(fill success): API Server
queue(fill warning): Message Queue
db(fill danger): Database
cache(fill info): Cache Layer
```

### Border Styles

Use line style classes for node borders.

| Class | Effect |
|-------|--------|
| `dashed` | Dashed line |
| `dotted` | Dotted line |

```textgraph example
live -> preview : promote
preview -> legacy : replace

live: Production
preview(dashed): Staging
legacy(dotted): Deprecated
```

### Line Weight

| Class | Effect |
|-------|--------|
| `bold` | Heavy stroke |

```textgraph example
critical -> standard -> minor

critical(bold): Core Service
standard: Standard Service
minor: Background Job
```

## Styling Edges

Apply style classes to an edge by placing them in parentheses after the arrow operator.

```textgraph example
a ->(bold primary) b
```

Edge styles follow the same composable rules as node styles. Color, line style, and weight classes all work on edges.

```textgraph example
<!-- encrypted traffic: bold primary -->
gateway ->(bold primary) auth : TLS

<!-- async messaging: dashed info -->
gateway ->(dashed info) queue : async

<!-- deprecated path: dotted danger -->
gateway ->(dotted danger) legacy : deprecated

<!-- standard connection -->
auth -> db

gateway: API Gateway
auth: Auth Service
queue: Message Queue
legacy: Legacy API
db: Database
```

Combine edge style and edge label in one statement:

```textgraph example
a ->(dashed warning) b : retry on failure
```

## Line Breaks

Use `\n` inside a label to split it across lines.

```textgraph example
api: API Gateway\nPort 8080
```

## Embedded TextGraph Blocks

In a Markdown file, put the diagram inside a fenced code block with the language `textgraph`:

````markdown
```textgraph
client -> gateway -> auth -> db
```
````

Render it with the [Markdown & VitePress plugin](/integrations/markdown) or preview it with the [VS Code extension](/integrations/vscode). In the Playground, paste only the diagram source inside the fence.

## Groups and Scopes

Curly braces express containment: a group is a node with children and its own layout scope. Nodes inside a group are arranged independently from the rest of the diagram.

```textgraph example
frontend {
  browser -> cdn
  browser: Browser
  cdn: CDN
}

backend {
  api -> auth
  api -> worker
  api: API Gateway
  auth: Auth Service
  worker: Worker
}

data {
  db -- cache
  db: PostgreSQL
  cache: Redis
}

frontend.cdn -> backend.api
backend.api -> data.db
backend.api -> data.cache
```

### Named and Styled Groups

Groups follow the same rules as nodes — styles and labels can be combined. A named group uses its identifier as the default title: `D { B -> C }` displays `D`. A separate `D: Services` declaration changes its title to `Services` while keeping the identifier `D`.

```textgraph example
frontend(fill info): Frontend {
  browser -> cdn
  browser: Browser
  cdn: CDN
}

backend(fill primary): Backend {
  api -> worker
  api: API Server
  worker: Worker
}
```

A group can also have its title declared separately:

```textgraph example
frontend: Frontend
frontend(fill info) {
  browser -> cdn
  browser: Browser
  cdn: CDN
}
```

### Anonymous Groups

An unnamed `{}` creates a scope without a default visible group label. Omit the identifier when a group should be anonymous; generated internal identities are never displayed. Empty anonymous groups are valid too.

```textgraph example
{
  a -> b
  a: Service A
  b: Service B
}
```

### Groups in Connections

Define a group directly at either end of an arrow, including an empty group:

```textgraph example
A -> { B -> C }
A -> {}
{ B -> C } -> D
```

The outer connection attaches to the **group boundary**. It does not expand into arrows to the children. Spaces are optional: `A->{B->C}` is valid.

Groups can be named or chained:

```textgraph example
A -> D { B -> C } -> E
D: Services

F -> { G -> H } -> I
```

The first chain uses the named group `D`, titled `Services`. The second uses one anonymous group between `F` and `I`. Separate brace occurrences create distinct anonymous groups.

Use parentheses for styles as usual:

```textgraph example
(horizontal) { B -> C } -> A
```

```textgraph example
A -> D(horizontal) { B -> C }
```

```textgraph example
A ->(bold) { B -> C }(horizontal)
```

In the last example, `bold` styles the edge because it follows the arrow; `horizontal` styles the group because it follows the closing brace.

### Nested Scopes

Groups can nest. Each scope has independent layout.

```textgraph example
platform {
  frontend.app -> backend.api

  frontend {
    app: Web App
  }
  backend {
    api -> services.auth
    api -> services.billing
    api: API
    services {
      auth: Auth
      billing: Billing
    }
  }
}
```

## Layout Control

Layout classes control how children are arranged within a scope.

| Class | Effect |
|-------|--------|
| `vertical` | Top-to-bottom (default) |
| `horizontal` | Left-to-right |
| `layout-2-col` | Two-column grid |
| `layout-3-col` | Three-column grid |
| `layout-4-col` | Four-column grid |
| `layout-6-col` | Six-column grid |

Set the direction on the group header:

```textgraph example
services(horizontal) {
  api -> auth -> worker
}
```

For the whole diagram, place `(horizontal)` or `(vertical)` at the start of the source.

Use a column grid on a group of nodes:

```textgraph example
metrics(layout-3-col) {
  cpu: CPU Usage
  mem: Memory
  disk: Disk I/O
  net: Network
  lat: Latency
  err: Error Rate
}
```

## Cross-Scope Connections and Identifier Scoping

### Dot Notation

Connect nodes across scopes using dot notation: `group.node`.

```textgraph example
frontend {
  browser: Browser
}

backend {
  gateway -> auth
  gateway: API Gateway
  auth: Auth Service
}

data {
  db: PostgreSQL
}

frontend.browser -> backend.gateway
backend.auth -> data.db
```

Dot notation chains for deeply nested targets:

```textgraph example
platform {
  backend {
    gateway: API Gateway
  }
  data {
    db: Database
  }
}

platform.backend.gateway -> platform.data.db
```

### Identifier Resolution

References first check the current scope, then parent scopes, then the rest of the document. A unique name can be used across groups. Use a group-qualified name when several nodes share an identifier.

```textgraph example
frontend {
  api -> cdn
  api: Frontend API
  cdn: CDN
  <!-- "api" here resolves to "Frontend API" -->
}

api -> db
<!-- "api" here resolves to "External API" -->

api: External API
db: Database
```

Use the shortest group prefix that makes the reference unique, such as `frontend.api` or `platform.backend.gateway`.
