# Sequence Diagrams

::: warning Not implemented
Sequence diagrams are not available yet. This page describes planned syntax and behavior; its examples will not render as sequence diagrams. For working diagrams, see [Flowcharts](/diagrams/flowcharts).
:::

Sequence diagrams model interactions between participants over time. Unlike flowcharts, sequence diagrams require an explicit type declaration — add `(sequence)` as a scope-level style at the top of your diagram.

All examples on this page use cloud architecture as the running context.

## Your First Sequence Diagram

Three identifiers and two arrows produce a complete diagram.

```
(sequence)
client -> gateway -> auth
```

Each identifier becomes a participant with a vertical lifeline. The `->` operator draws a message arrow from left to right. The `(sequence)` declaration tells TextGraph to render this as a sequence diagram instead of the default flowchart.

## Declaring Participants

By default, a participant displays its identifier as its label. To assign a human-readable name, declare a label on a separate line with `id: Label`.

Build the interaction structure first, then name the participants. This keeps you focused on message flow before cosmetics.

```
(sequence)
client -> gw -> auth -> db

client: Browser Client
gw: API Gateway
auth: Auth Service
db: PostgreSQL
```

Labels can appear before or after the connections that reference them — the renderer collects all declarations before layout. Both orderings are equivalent. This page uses the connections-first style throughout.

Labels cannot appear inline on a connection line. This is invalid:

```
<!-- invalid -->
client: Browser Client -> gw: API Gateway
```

Style and label can be combined on a single standalone line:

```
(sequence)
gw(fill primary): API Gateway
```

## Message Types

TextGraph supports four connection types. In a sequence diagram these represent different message semantics.

| Syntax | Meaning |
|--------|---------|
| `a -> b` | Synchronous message from `a` to `b` |
| `a <- b` | Response from `b` to `a` |
| `a <-> b` | Bidirectional / mutual exchange |
| `a -- b` | Undirected association (no arrowhead) |

```
(sequence)
<!-- synchronous: gateway sends request to auth -->
gateway -> auth

<!-- response: auth responds to gateway -->
gateway <- auth

<!-- bidirectional: gateway and cache exchange data -->
gateway <-> cache

<!-- undirected: peer availability zones -->
az1 -- az2

<!-- self-message: worker processes internally -->
worker -> worker

gateway: API Gateway
auth: Auth Service
cache: Redis Cache
worker: Worker Service
az1: Availability Zone 1
az2: Availability Zone 2
```

A self-message — where source and target are the same identifier — renders as a loop arrow back to the same participant. Use this for internal processing, validation, or recursive steps.

## Message Labels

Append `: label` after a connection to annotate the message.

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

Message labels describe protocols, data formats, or outcomes. The label text is trimmed of surrounding whitespace.

Use comments for narrative clarity without affecting the rendered output:

```
(sequence)
<!-- authentication flow -->
client -> gateway : login
gateway -> auth : credentials

<!-- token exchange -->
auth -> gateway : JWT
gateway -> client : set cookie

client: Browser
gateway: API Gateway
auth: Auth Service
```

## Chained Connections

Chain multiple participants in a single statement. Each `->` creates one message.

```
(sequence)
commit -> build -> test -> deploy -> prod

commit: Git Push
build: Build Service
test: Test Runner
deploy: Deploy Agent
prod: Production
```

Mixed directions work in chains:

```
(sequence)
a -> b -> c <- d
```

This creates three messages: `a -> b`, `b -> c`, and `d -> c`.

Inline styles apply per participant in a chain:

```
(sequence)
dev(circle) -> ci(fill) -> staging(fill) -> approval(fill warning) -> prod(fill success stadium)
```

## Participant Shapes

Shapes convey participant roles at a glance. Apply a shape class in parentheses after the identifier.

| Class | Alias | Convention |
|-------|-------|------------|
| `circle` | — | Human actor / event trigger |
| `rectangle` | `rect` | Service / process (default) |
| `cylinder` | `db`, `database` | Storage / database |
| `stadium` | `pill` | External endpoint / terminal |
| `document` | `doc` | Document / artifact |
| `hexagon` | — | Complex process / transformer |
| `callout` | — | Annotation / note |

Use `rounded` (default) or `no-rounded` to control corner rounding.

```
(sequence)
user -> api -> processor -> db
processor -> logs

user(circle): Developer
api(stadium): REST API
processor(hexagon): Transform
db(cylinder): PostgreSQL
logs(document): Audit Log
```

## Styling Participants

### Fill and Colors

The `fill` class fills a participant with the default background. Combine with a color class to set a specific fill color.

```
(sequence)
api(fill): Default Fill
auth(fill primary): Primary
cache(fill info): Info
ok(fill success): Healthy
degraded(fill warning): Degraded
down(fill danger): Down
```

Use `no-fill` to make a participant transparent.

Semantic colors — `primary`, `secondary`, `info`, `success`, `warning`, `danger` — carry meaning. Surface colors — `background`, `foreground` — match the current theme.

```
(sequence)
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
(sequence)
live -> preview -> legacy

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
(sequence)
critical -> standard -> minor

critical(bold): Core Service
standard: Standard Service
minor(normal): Background Job
```

### Shared Styles

Apply one style declaration to multiple participants with a comma-separated list.

```
(sequence)
gw -> auth -> billing

gw, auth, billing(fill primary)
gw: API Gateway
auth: Auth Service
billing: Billing
```

### Scope-Level Style

Style classes without an identifier apply to the current scope.

```
(sequence)
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
(sequence)
header(title): Cloud Architecture

spacer(hidden)

api -> db
api: API Server
db(cylinder): Database
```

## Styling Messages

Apply style classes to a message by placing them in parentheses after the arrow operator.

```
(sequence)
a ->(bold primary) b
```

Message styles follow the same composable rules as participant styles. Color, line style, and weight classes all work on messages.

```
(sequence)
<!-- encrypted traffic: bold primary -->
gateway ->(bold primary) auth : TLS mutual auth

<!-- async messaging: dashed info -->
gateway ->(dashed info) queue : async enqueue

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

Combine message style and message label in one statement:

```
(sequence)
a ->(dashed warning) b : retry on failure
```

## Rich Labels

### Inline Markdown

Label text supports inline Markdown formatting.

```
(sequence)
api: **API Gateway** v2.1
db: _read replica_
```

### Heading Labels

Use heading syntax for a title-style label — larger and bold.

```
(sequence)
platform: # Cloud Platform
api: ## API Layer
```

### Block Markdown

For multi-line rich content, use a fenced ` ```md ` block on the lines following the identifier.

````
(sequence)
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
(sequence)
api: API Gateway\nPort 8080
```

TextGraph line break rules differ from standard Markdown:

- A **newline** produces a line break (no trailing spaces needed).
- A **single blank line** collapses to a line break.
- **Two or more blank lines** produce a paragraph break with visible vertical gap.

### Standalone Text Labels

An identifier with a label but no connections or shape renders as plain text with no border.

```
(sequence)
note: Deployed to us-east-1
api -> db
api: API Server
db(cylinder): Database
```

### Resource References

A label starting with `@` renders a resource — an icon, image, or embedded diagram.

Stock cloud icons by slug:

```
(sequence)
s3: @aws-s3
batch: @az-batch-ai
```

Local, external, or base64 images:

```
(sequence)
logo: @(./icons/company-logo.png)
ext: @(https://example.com/icon.png)
```

An external TextGraph diagram file:

```
(sequence)
arch: @(./architecture.md)
```

Reference a named diagram within a multi-diagram file:

```
(sequence)
arch: @(./diagrams.md#architecture)
```

### Embedded TextGraph Blocks

Use `@textgraph` delimiters to embed a named TextGraph diagram inside a Markdown file.

```
@textgraph: auth-flow
(sequence)
client -> gateway -> auth -> db
@textgraph
```

Reference it from another diagram with `@(./file.md#auth-flow)`.

If the file contains only one diagram, the closing `@textgraph` is optional.

## Groups and Scopes

Curly braces define a layout scope. Participants inside a group are arranged independently from the rest of the diagram.

```
(sequence)
clients {
  browser -> mobile
  browser: Browser
  mobile: Mobile App
}

platform {
  gw -> auth
  gw -> worker
  gw: API Gateway
  auth: Auth Service
  worker: Worker
}

data {
  db -- cache
  db(cylinder): PostgreSQL
  cache(cylinder): Redis
}

clients.browser -> platform.gw
platform.auth -> data.db
platform.worker -> data.cache
```

### Named and Styled Groups

Groups follow the same rules as participants — styles and labels can be combined.

```
(sequence)
clients(fill info): Client Tier
clients {
  browser -> cdn
  browser: Browser
  cdn: CDN
}

platform(fill primary): Platform
platform {
  gw -> worker
  gw: API Gateway
  worker: Worker
}
```

Or combined on one line:

```
(sequence)
clients(fill info): Client Tier {
  browser -> cdn
  browser: Browser
  cdn: CDN
}
```

### Anonymous Groups

An unnamed `{}` creates a scope without a visible group label.

```
(sequence)
{
  a -> b
  a: Service A
  b: Service B
}
```

### Nested Scopes

Groups can nest. Each scope has independent layout.

```
(sequence)
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

## Combined Fragments

Combined fragments are sequence-specific scopes that model control flow within an interaction. Apply a fragment class to a named scope inside a sequence diagram.

| Class | Meaning |
|-------|---------|
| `loop` | Repeated interaction |
| `alt` | Alternative paths (if/else) |
| `opt` | Optional interaction (single condition) |
| `par` | Parallel / concurrent flows |

The first line of text inside a fragment scope is rendered as the fragment's condition label.

### Loop

A `loop` fragment repeats its enclosed messages while a condition holds.

```
(sequence)
client -> gw : request
gw -> auth : validate

retry(loop) {
  token expired
  auth -> gw : 401
  gw -> auth : refresh token
}

auth -> gw : 200 OK
gw -> client : response

client: Browser
gw: API Gateway
auth: Auth Service
```

### Alt (Alternative Paths)

An `alt` fragment models branching logic. Use nested `opt` scopes for else branches.

```
(sequence)
client -> gw : login
gw -> auth : credentials

result(alt) {
  valid credentials
  auth -> db : load profile
  db -> auth : user data
  auth -> gw : 200 OK + JWT

  denied(opt) {
    invalid credentials
    auth -> gw : 401 Unauthorized
  }
}

gw -> client : response

client: Browser
gw: API Gateway
auth: Auth Service
db(cylinder): User Store
```

### Opt (Optional)

An `opt` fragment wraps an interaction that only occurs when a condition is true.

```
(sequence)
client -> gw : request
gw -> cache : lookup

hit(opt) {
  cache hit
  cache -> gw : cached response
  gw -> client : 200 OK
}

gw -> db : query
db -> gw : result

client: Browser
gw: API Gateway
cache(cylinder): Redis
db(cylinder): PostgreSQL
```

### Par (Parallel)

A `par` fragment models concurrent flows that execute simultaneously.

```
(sequence)
client -> gw : submit order

processing(par) {
  concurrent operations
  gw -> billing : charge
  gw -> inventory : reserve
  gw -> notify : send confirmation
}

billing -> gw : payment OK
inventory -> gw : reserved
gw -> client : order confirmed

client: Browser
gw: API Gateway
billing: Billing Service
inventory: Inventory
notify: Notification Service
```

### Nested Fragments

Fragments nest freely. A login flow with retry loop, success/failure branching, and parallel operations:

```
(sequence)
client -> gw : login

retry(loop) {
  max 3 attempts
  gw -> auth : credentials

  result(alt) {
    success
    auth -> db : load session
    db -> auth : session data
    auth -> gw : JWT

    fail(opt) {
      invalid
      auth -> gw : 401
      gw -> client : retry prompt
    }
  }
}

postlogin(par) {
  post-login tasks
  gw -> cache : store session
  gw -> notify : welcome email
}

gw -> client : dashboard

client: Browser
gw: API Gateway
auth: Auth Service
db(cylinder): Session Store
cache(cylinder): Redis
notify: Notification Service
```

## Cross-Scope Connections and Identifier Scoping

### Dot Notation

Connect participants across scopes using dot notation: `group.participant`.

```
(sequence)
clients {
  browser: Browser
}

platform {
  gw -> auth
  gw: API Gateway
  auth: Auth Service
}

data {
  db(cylinder): PostgreSQL
}

clients.browser -> platform.gw
platform.auth -> data.db
```

Dot notation chains for deeply nested targets:

```
(sequence)
platform.backend.gw -> platform.data.db
```

### Identifier Resolution

Identifiers resolve from the current scope outward. The first match wins. An inner declaration shadows an outer one with the same name.

```
(sequence)
platform {
  api -> cache
  api: Platform API
  cache: Platform Cache
  <!-- "api" here resolves to "Platform API" -->
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
(sequence)
services {
  api -> db
  api: API Server
  db(cylinder): Database

  status(overlay-top-right circle success fill): ✓
}
```

### Annotation Callout

A floating note connected to a specific participant.

```
(sequence)
main {
  client -> gw -> auth
  client: Browser
  gw: API Gateway
  auth: Auth Service
}

tip(overlay-top-right callout warning): Latency spike — check connection pool
tip -> main.gw
```

Overlay elements can have connections to flow elements — the renderer routes edges between layers.

### Cover Overlay

Use `overlay-cover` for a watermark or translucent background layer.

```
(sequence)
services {
  api -> db
  api: API
  db(cylinder): DB

  (overlay-cover no-border): STAGING
}
```

## Putting It All Together

A comprehensive example: a multi-tier cloud authentication flow combining explicit declarations, shapes, colors, shared styles, groups by tier, combined fragments, cross-scope dot notation, edge styles, overlay annotations, rich labels, and comments.

```
(sequence)

header(title): # Cloud Auth Flow

<!-- client tier -->
clients(fill info): Client Tier {
  user(circle): End User
  browser: Browser Client
}

<!-- platform tier -->
platform(fill primary): Platform Services {
  gw(bold): API Gateway
  auth: Auth Service
  billing: Billing
  notify: Notification Service

  <!-- shared style for internal services -->
  auth, billing, notify(fill)
}

<!-- data tier -->
data(fill secondary): Data Layer {
  db(cylinder): PostgreSQL
  cache(cylinder): Redis
  queue(cylinder): Message Queue
}

<!-- initial request flow -->
clients.user -> clients.browser : open app
clients.browser ->(bold primary) platform.gw : HTTPS login

<!-- auth with retry loop -->
retry(loop) {
  max 3 attempts
  platform.gw -> platform.auth : credentials
  platform.auth -> data.db : SELECT user

  result(alt) {
    valid credentials
    data.db -> platform.auth : user record
    platform.auth -> platform.gw : JWT token

    denied(opt) {
      invalid
      platform.auth -> platform.gw : 401
      platform.gw -> clients.browser : retry prompt
    }
  }
}

<!-- post-login parallel tasks -->
postlogin(par) {
  post-authentication
  platform.gw -> data.cache : store session
  platform.gw ->(dashed info) data.queue : audit event
  platform.gw -> platform.notify : welcome email
}

<!-- final response -->
platform.gw ->(bold success) clients.browser : 200 OK + dashboard

<!-- self-message: internal processing -->
platform.auth -> platform.auth : validate token signature

<!-- monitoring overlay -->
monitor(overlay-bottom-right callout warning): p99 latency\n> 200ms
monitor ->(dotted danger) platform.gw

health(overlay-top-right circle success fill): ✓
```

## Tips

1. **Use `circle` for human actors, `cylinder` for databases.** Shape conventions help readers identify participant roles instantly without reading labels.

2. **Declare participant labels at the top of the scope.** Group all `id: Label` lines together before the message flow. This separates naming from interaction logic.

3. **Use `dashed` for async messages, `dotted` for deprecated.** Consistent line styles create a visual language across your diagrams — `gw ->(dashed info) queue : async`.

4. **Keep fragment condition labels concise.** The first line of text inside a `loop`, `alt`, `opt`, or `par` scope becomes the condition label. One short phrase works best.

5. **Group participants by tier with named scopes.** Separate client, platform, and data layers into named groups. This mirrors real architecture and enables cross-scope connections with dot notation.

6. **Use overlays sparingly — one annotation + one badge max.** A single `callout` note and a single `circle` status badge are usually enough. More than that clutters the diagram.

7. **Use `@textgraph` blocks to embed and cross-reference sequence diagrams.** Wrap your diagram in `@textgraph: name` delimiters and reference it from other diagrams with `@(./file.md#name)`.
