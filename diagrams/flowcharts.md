# Flowcharts

Flowcharts are the default diagram type in TextGraph. Any document containing `->` connections is rendered as a flowchart — no explicit declaration needed. For mixed-type documents, apply the `flowchart` class to a scope to force flowchart rendering.

All examples on this page use cloud architecture as the running context.

## Your First Flowchart

Three identifiers and two arrows produce a complete diagram.

```
client -> api -> database
```

Each identifier becomes a node labeled with its own name. The `->` operator draws a directed edge. TextGraph infers the flowchart type automatically.

## Node Labels

By default, a node displays its identifier as its label. To assign a human-readable name, declare a label on a separate line with `id: Label`.

Build the diagram structure first, then name the nodes. This keeps you focused on relationships before cosmetics.

```
client -> api -> db

client: Browser Client
api: API Gateway
db: PostgreSQL
```

Labels can appear before or after the connections that reference them — the renderer collects all declarations before layout. Both orderings are equivalent. This page uses the connections-first style throughout.

Labels cannot appear inline on a connection line. This is invalid:

```
<!-- invalid -->
client: Browser Client -> api: API Gateway
```

Style and label can be combined on a single standalone line:

```
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

```
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

```
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

```
commit -> build -> test -> stage -> prod

commit: Git Commit
build: Build
test: Run Tests
stage: Staging
prod: Production
```

Mixed directions work in chains:

```
a -> b -> c <- d
```

This creates three edges: `a -> b`, `b -> c`, and `d -> c`.

Inline styles apply per node in a chain:

```
commit(circle) -> build(fill) -> test(fill) -> deploy(fill success) -> prod(stadium)
```

## Node Shapes

Shapes map to standard flowchart conventions. Apply a shape class in parentheses after the node identifier.

| Class | Alias | Convention |
|-------|-------|------------|
| `rectangle` | `rect` | Process / action (default) |
| `circle` | — | Start / end / event |
| `diamond` | `decision` | Decision / branch |
| `cylinder` | `db`, `database` | Storage / database |
| `parallelogram` | `io` | Input / output |
| `stadium` | `pill` | Terminal / endpoint |
| `document` | `doc` | Document / artifact |
| `callout` | — | Annotation / note |
| `triangle` | — | Warning / caution |
| `hexagon` | — | Preparation / complex process |

Use `rounded` (default) or `no-rounded` to control corner rounding on any shape.

```
start -> check
check -> build : yes
check -> fail : no
build -> artifact
build -> db : read config
build -> api

start(circle): Deploy
check(diamond): Tests pass?
build: Build Image
artifact(document): Release Notes
db(cylinder): Config Store
api(stadium): Live API
fail(circle danger): Abort
```

## Styling Nodes

### Fill and Colors

The `fill` class fills a node with the default background. Combine with a color class to set a specific fill color.

```
api(fill): Default Fill
auth(fill primary): Primary
cache(fill info): Info
ok(fill success): Healthy
degraded(fill warning): Degraded
down(fill danger): Down
```

Use `no-fill` to make a node transparent.

Semantic colors — `primary`, `secondary`, `info`, `success`, `warning`, `danger` — carry meaning. Surface colors — `background`, `foreground` — match the current theme.

```
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

Control borders with `border`, `no-border`, and line style classes.

| Class | Effect |
|-------|--------|
| `border` | Show border (default) |
| `no-border` | Remove border |
| `solid` | Solid line (default) |
| `dashed` | Dashed line |
| `dotted` | Dotted line |

```
live -> preview : promote
preview -> legacy : replace

live(solid): Production
preview(dashed): Staging
legacy(dotted): Deprecated
```

### Line Weight

| Class | Effect |
|-------|--------|
| `normal` | Default weight |
| `bold` | Heavy stroke |
| `thick` | Heavier than bold |

```
critical -> standard -> minor

critical(bold): Core Service
standard: Standard Service
minor(normal): Background Job
```

### Shared Styles

Apply one style declaration to multiple nodes with a comma-separated list.

```
web -> api -> worker

web, api, worker(fill primary)
web: Web Server
api: API Server
worker: Worker
```

### Scope-Level Style

Style classes without an identifier apply to the current scope.

```
(fill primary)
a -> b
a: Service A
b: Service B
```

This sets the scope background to filled primary.

### Reset and Special Classes

| Class | Effect |
|-------|--------|
| `clear` | Remove all previously applied styles |
| `hidden` | Render invisibly — useful as a spacing anchor |
| `title` | Prominent title block with no border |

```
header(title): Cloud Architecture

spacer(hidden)

api -> db
api: API Server
db(cylinder): Database
```

## Styling Edges

Apply style classes to an edge by placing them in parentheses after the arrow operator.

```
a ->(bold primary) b
```

Edge styles follow the same composable rules as node styles. Color, line style, and weight classes all work on edges.

```
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
db(cylinder): Database
```

Combine edge style and edge label in one statement:

```
a ->(dashed warning) b : retry on failure
```

## Rich Labels

### Inline Markdown

Label text supports inline Markdown formatting.

```
api: **API Gateway** v2.1
db: _read replica_
```

### Heading Labels

Use heading syntax for a title-style label — larger and bold.

```
platform: # Cloud Platform
api: ## API Layer
```

### Block Markdown

For multi-line rich content, use a fenced ` ```md ` block on the lines following the identifier.

````
api:
```md
# API Gateway
- /users
- /orders
- /health
```

db:
```md
# PostgreSQL 16
- 3 replicas
- 500 GB storage
```

api -> db
````

### Line Breaks

Use `\n` for inline line breaks in simple cases.

```
api: API Gateway\nPort 8080
```

TextGraph line break rules differ from standard Markdown:

- A **newline** produces a line break (no trailing spaces needed).
- A **single blank line** collapses to a line break.
- **Two or more blank lines** produce a paragraph break with visible vertical gap.

### Standalone Text Labels

An identifier with a label but no connections or shape renders as plain text with no border.

```
api -> db

note: Deployed to us-east-1
api: API Server
db(cylinder): Database
```

### Resource References

A label starting with `@` renders a resource — an icon, image, or embedded diagram.

Stock cloud icons by slug:

```
s3: @aws-s3
batch: @az-batch-ai
```

Local, external, or base64 images:

```
logo: @(./icons/company-logo.png)
ext: @(https://example.com/icon.png)
```

An external TextGraph diagram file:

```
arch: @(./architecture.md)
```

Reference a named diagram within a multi-diagram file:

```
arch: @(./diagrams.md#architecture)
```

### Embedded TextGraph Blocks

Use `@textgraph` delimiters to embed a named TextGraph diagram inside a Markdown file.

```
@textgraph: auth-flow
client -> gateway -> auth -> db
@textgraph
```

Reference it from another diagram with `@(./file.md#auth-flow)`.

If the file contains only one diagram, the closing `@textgraph` is optional.

## Groups and Scopes

Curly braces express containment: a group is a node with children and its own layout scope. Nodes inside a group are arranged independently from the rest of the diagram.

```
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
  db(cylinder): PostgreSQL
  cache(cylinder): Redis
}

frontend.cdn -> backend.api
backend.api -> data.db
backend.api -> data.cache
```

### Named and Styled Groups

Groups follow the same rules as nodes — styles and labels can be combined. A named group uses its identifier as the default title: `D { B -> C }` displays `D`. A separate `D: Services` declaration changes its title to `Services` while keeping the identifier `D`.

```
frontend(fill info): Frontend
frontend {
  browser -> cdn
  browser: Browser
  cdn: CDN
}

backend(fill primary): Backend
backend {
  api -> worker
  api: API Server
  worker: Worker
}
```

Or combined in the group header, with the body starting on the next line:

```
frontend(fill info): Frontend {
  browser -> cdn
  browser: Browser
  cdn: CDN
}
```

### Anonymous Groups

An unnamed `{}` creates a scope without a default visible group label. Omit the identifier when a group should be anonymous; generated internal identities are never displayed. Empty anonymous groups are valid too.

```
{
  a -> b
  a: Service A
  b: Service B
}
```

### Groups in Connections

Define a group directly at either end of an arrow, including an empty group:

```text
A -> { B -> C }
A -> {}
{ B -> C } -> D
```

The outer connection attaches to the **group boundary**. It does not expand into arrows to the children. Spaces are optional: `A->{B->C}` is valid.

Groups can be named or chained:

```text
A -> D { B -> C } -> E
D: Services

F -> { G -> H } -> I
```

The first chain uses the named group `D`, titled `Services`. The second uses one anonymous group between `F` and `I`. Separate brace occurrences create distinct anonymous groups.

Use parentheses for styles as usual:

```text
(horizontal) { B -> C } -> A
A -> D(horizontal) { B -> C }
A ->(bold) { B -> C }(horizontal)
```

In the last example, `bold` styles the edge because it follows the arrow; `horizontal` styles the group because it follows the closing brace.

### Nested Scopes

Groups can nest. Each scope has independent layout.

```
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

Layout can be set on the scope identifier or as a scope-level style inside braces — both are equivalent:

```
services(horizontal) {
  api: API
  auth: Auth
  worker: Worker
}
```

```
services {
  (horizontal)
  api: API
  auth: Auth
  worker: Worker
}
```

### Justify and Align

Justify controls distribution along the main axis. Align controls the cross axis.

| Class | Effect |
|-------|--------|
| `justify-start` | Pack toward start (default) |
| `justify-center` | Center along main axis |
| `justify-end` | Pack toward end |
| `justify-between` | Equal space between children |
| `justify-around` | Equal space around each child |
| `justify-evenly` | Equal space between and around |
| `align-start` | Align to cross-axis start |
| `align-center` | Center on cross axis |
| `align-end` | Align to cross-axis end |

```
<!-- services arranged horizontally with equal spacing -->
services(horizontal justify-between) {
  api: API Gateway
  auth: Auth Service
  billing: Billing
  notify: Notifications
}

<!-- metrics in a 3-column grid -->
metrics(layout-3-col): Metrics {
  cpu: CPU Usage
  mem: Memory
  disk: Disk I/O
  net: Network
  lat: Latency
  err: Error Rate
}

<!-- availability zones spaced evenly -->
zones(horizontal justify-evenly) {
  az1: us-east-1a
  az2: us-east-1b
  az3: us-east-1c
}
```

### Nested Layout

Each scope controls its own layout independently of its parent.

```
platform(horizontal) {
  frontend(vertical) {
    browser: Browser
    mobile: Mobile App
  }
  backend(vertical) {
    api: API
    worker: Worker
  }
  data(vertical) {
    db(cylinder): PostgreSQL
    cache(cylinder): Redis
  }
}
```

## Cross-Scope Connections and Identifier Scoping

### Dot Notation

Connect nodes across scopes using dot notation: `group.node`.

```
frontend {
  browser: Browser
}

backend {
  gateway -> auth
  gateway: API Gateway
  auth: Auth Service
}

data {
  db(cylinder): PostgreSQL
}

frontend.browser -> backend.gateway
backend.auth -> data.db
```

Dot notation chains for deeply nested targets:

```
platform.backend.gateway -> platform.data.db
```

### Identifier Resolution

Identifiers resolve from the current scope outward. The first match wins. An inner declaration shadows an outer one with the same name.

```
frontend {
  api -> cdn
  api: Frontend API
  cdn: CDN
  <!-- "api" here resolves to "Frontend API" -->
}

api -> db
<!-- "api" here resolves to "External API" -->

api: External API
db(cylinder): Database
```

No special syntax is needed to reference an outer scope — if an identifier is not found locally, lookup continues through enclosing scopes automatically. Dot notation is only necessary to reach inward, from an outer scope into a named group.

## Overlay Positioning

Overlay classes remove an element from the normal layout flow and anchor it at a fixed position within the parent scope.

| Class | Position |
|-------|----------|
| `overlay-center` | Centered on parent |
| `overlay-top-left` | Top-left corner |
| `overlay-top-center` | Top-center edge |
| `overlay-top-right` | Top-right corner |
| `overlay-center-left` | Center-left edge |
| `overlay-center-right` | Center-right edge |
| `overlay-bottom-left` | Bottom-left corner |
| `overlay-bottom-center` | Bottom-center edge |
| `overlay-bottom-right` | Bottom-right corner |
| `overlay-cover` | Stretch to fill parent (watermarks, backgrounds) |

When multiple overlays exist in the same scope, later declarations render on top (higher z-order).

### Badge Pattern

A small status indicator anchored to a corner of a group.

```
services {
  api -> db
  api: API Server
  db(cylinder): Database

  status(overlay-top-right circle success fill): ✓
}
```

### Annotation Callout

A floating note connected to a specific node.

```
main {
  lb -> api -> db
  lb: Load Balancer
  api: API Server
  db(cylinder): Database
}

tip(overlay-top-right callout warning): Bottleneck — scale horizontally
tip -> main.api
```

Overlay elements can have connections to flow elements — the renderer routes edges between layers.

### Cover Overlay

Use `overlay-cover` for a watermark or translucent background layer.

```
services {
  api -> db
  api: API
  db(cylinder): DB

  (overlay-cover no-border): STAGING
}
```

## Putting It All Together

A comprehensive example: a multi-tier cloud deployment platform with CI/CD pipeline and monitoring overlay. This exercises every major feature covered on this page.

```
<!-- scope-level style for the root -->
(fill)

header(title): # Multi-Tier Cloud Platform

<!-- CI/CD pipeline across the top, horizontal layout -->
pipeline(horizontal dashed): CI/CD Pipeline {
  commit -> build -> test -> gate
  gate -> deploy : yes
  gate -> commit : no, fix

  commit(circle): Commit
  build(fill): Build
  test(fill): Test
  gate(diamond): Approve?
  deploy(fill success stadium): Deploy
}

<!-- three main tiers side by side -->
tiers(horizontal justify-between) {

  frontend(fill info): Frontend {
    browser -> cdn
    mobile -> cdn

    cdn: @aws-s3
    browser: Browser Client
    mobile: Mobile App
  }

  backend(fill primary): Backend Services {
    gw -> auth : JWT
    gw -> billing
    gw -> notify
    gw ->(dashed info) worker : async

    gw(bold): API Gateway
    auth: Auth Service
    billing: Billing
    notify: Notifications
    worker: Worker

    <!-- shared style for internal services -->
    auth, billing, notify(fill)
  }

  data(fill secondary): Data Layer {
    db -- cache : sync
    queue ->(dashed) db : drain

    db(cylinder): PostgreSQL
    cache(cylinder): Redis
    queue(cylinder): Message Queue
  }
}

<!-- cross-scope connections -->
pipeline.deploy ->(bold success) tiers.backend.gw : release
tiers.frontend.cdn -> tiers.backend.gw : HTTPS
tiers.backend.auth -> tiers.data.db : query
tiers.backend.auth -> tiers.data.cache : session
tiers.backend.worker -> tiers.data.queue

<!-- monitoring overlay -->
monitor(overlay-bottom-right callout warning): Latency Warning\np99 > 200ms
monitor ->(dotted danger) tiers.backend.gw

health(overlay-top-right circle success fill): ✓
```

## Tips

1. **Group by logical tier.** Use named scopes to separate frontend, backend, and data layers. This keeps the diagram readable and enables cross-scope connections with dot notation.

2. **Define labels after connections.** Write the diagram structure first, then declare `id: Label` lines below. This keeps you focused on relationships before naming.

3. **Reserve diamonds for decisions.** The `diamond` shape signals a branch point. Overusing it dilutes its meaning.

4. **Label non-obvious edges.** If the protocol, format, or condition is not self-evident, add an edge label. Skip labels on edges where the relationship is clear from context.

5. **Color by status semantics.** Use `success` for healthy, `warning` for degraded, `danger` for down or deprecated. Readers will intuit the meaning without a legend.

6. **Use `dashed` for async, `dotted` for deprecated.** Consistent line styles create a visual language across your diagrams.

7. **Use `@textgraph` blocks for embedding.** When documenting architecture in Markdown, embed diagrams inline with `@textgraph` delimiters and reference them from other diagrams with `@(./file.md#name)`.
