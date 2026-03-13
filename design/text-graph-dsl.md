# TextGraph DSL — Language Design Specification v0.1

## Overview

**TextGraph** is a text-based domain-specific language for describing diagrams. It is designed around three core principles:

1. **Human- and LLM-friendly** — reads like structured English, minimal punctuation
2. **Resilient** — partial rendering on error; invalid sections produce visible error nodes, not blank output
3. **Style-separated** — diagram content is distinct from theme/visual directives

The language uses a single unified grammar that covers flowcharts, sequence diagrams, architecture diagrams, class diagrams, entity-relationship diagrams, mindmaps, Gantt charts, and more. The diagram type is inferred from content or declared explicitly.

---

## 1. File Structure

A TextGraph file (`.tg`) has three optional top-level sections, in any order:

```
[meta]          # diagram metadata and type hints
[style]         # theme and visual overrides
[diagram]       # the diagram content (default section)
```

Sections are optional. A file with no section headers is treated as pure `[diagram]` content.

```
# Simple one-liner — no headers needed
User -> Server: "Login Request"
Server -> User: "Auth Token"
```

---

## 2. Comments

```
// single-line comment
/* multi-line
   comment */
```

---

## 3. Metadata Block

```
[meta]
title: "System Architecture Overview"
type: sequence          // flowchart | sequence | class | er | arch | mindmap | gantt | state | timeline
author: "Alice"
version: "1.0"
direction: left-right   // top-down | left-right | right-left | bottom-up (default: top-down)
```

`type` is a hint — the parser infers diagram type from content when omitted.

---

## 4. Core Primitives

### 4.1 Nodes

Nodes are declared implicitly (first use) or explicitly:

```
// Implicit — just use the name
UserService -> Database

// Explicit declaration with label
UserService: "User Service"

// With shape
UserService: "User Service" [shape: service]

// With class (for styling)
UserService: "User Service" [class: primary]

// Inline shape shorthand
UserService(cylinder): "User DB"
```

**Built-in shapes:**

| Shorthand         | Shape                |
|-------------------|----------------------|
| `(text)`          | rounded rectangle    |
| `[text]`          | rectangle (default)  |
| `{text}`          | diamond (decision)   |
| `((text))`        | circle               |
| `([text])`        | cylinder (database)  |
| `>text<`          | parallelogram (I/O)  |
| `[/text/]`        | trapezoid            |
| `/text/`          | hexagon              |

Named shapes (explicit, more readable):

```
DB([Database])
Decision{Is Valid?}
Start((Start))
```

### 4.2 Edges / Connections

```
// Basic directed edge
A -> B

// With label
A -> B: "calls"

// Undirected
A -- B

// Bidirectional
A <-> B

// Dotted/dashed
A --> B              // dashed arrow (convention: async / weak dependency)
A -.- B              // dotted undirected

// Labeled styles
A -> B: "calls" [style: dashed]
A -> B: "inherits" [style: bold]

// Natural language connectors (aliases)
A flows to B
A depends on B
A extends B
A implements B
A uses B: "optional"
```

**Natural language connector → edge type mapping** (extensible):

| Phrase                        | Arrow type   |
|-------------------------------|--------------|
| `flows to`, `sends to`        | `->` solid   |
| `depends on`, `uses`          | `-->` dashed |
| `extends`, `inherits`         | `-|>` hollow |
| `implements`                  | `..|>` dashed hollow |
| `contains`, `has`             | `->` with diamond |
| `communicates with`           | `<->`        |

### 4.3 Labels

Node and edge labels are quoted strings or bare words:

```
A -> B: Login
A -> B: "User Login Request"
```

Multi-line labels use backticks:

```
A: `Line 1
Line 2`
```

---

## 5. Groups and Containers

Groups nest nodes into logical containers. They render as bounded regions (swimlanes, clusters, frames).

```
group "Authentication" {
    UserService
    AuthService -> TokenStore
}

// With layout hint
group "Data Layer" [direction: horizontal] {
    UserDB
    OrderDB
    CacheDB
}

// Swimlane (actor-partitioned)
lane "Frontend" {
    Browser -> APIGateway
}
lane "Backend" {
    APIGateway -> AuthService
    APIGateway -> OrderService
}
```

Groups can be nested:

```
group "Cloud" {
    group "VPC" {
        group "Private Subnet" {
            AppServer
            Database
        }
        group "Public Subnet" {
            LoadBalancer
        }
    }
}
```

---

## 6. Diagram-Type-Specific Constructs

### 6.1 Flowchart

Flows are built from nodes, edges, and decision diamonds. No special header needed.

```
[meta]
type: flowchart
direction: top-down

Start((Start)) -> Input>Enter PIN<
Input -> Validate{PIN Valid?}
Validate -> Yes: Success((Done))
Validate -> No: Retry[Try Again] -> Input
Retry -> ExceedLimit{Attempts > 3?}
ExceedLimit -> Yes: Lockout[Lock Account] -> End((End))
ExceedLimit -> No: Input
```

### 6.2 Sequence Diagram

Participants are declared or inferred. Messages use `->` (sync) and `-->` (async/return).

```
[meta]
type: sequence

participant User
participant Server
participant Database

User -> Server: "POST /login"
activate Server

Server -> Database: "SELECT user WHERE email=?"
activate Database
Database --> Server: "User record"
deactivate Database

Server --> User: "200 Auth Token"
deactivate Server

// Notes
note over User, Server: "HTTPS encrypted"
note right of Database: "Read replica"

// Conditional blocks
alt "Valid credentials" {
    Server --> User: "200 OK"
} else "Invalid" {
    Server --> User: "401 Unauthorized"
}

// Loop
loop "Retry up to 3 times" {
    Client -> Server: "Ping"
    Server --> Client: "Pong"
}

// Parallel
par "Async tasks" {
    Server -> EmailService: "Send welcome email"
} and {
    Server -> AuditLog: "Log login event"
}
```

### 6.3 Class Diagram

```
[meta]
type: class

class User {
    +id: UUID
    +email: String
    +passwordHash: String
    +createdAt: DateTime
    ---
    +authenticate(password): Boolean
    +resetPassword(): void
    -hashPassword(raw): String
}

class Order {
    +id: UUID
    +status: OrderStatus
    +total: Decimal
    ---
    +placeOrder(): void
    +cancel(): void
}

class OrderItem {
    +quantity: Int
    +unitPrice: Decimal
}

enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
}

interface Auditable {
    +createdAt: DateTime
    +updatedAt: DateTime
}

// Relationships
User -> Order: "places" [1..*]
Order -> OrderItem: "contains" [1..*]
User implements Auditable
Order implements Auditable
```

Visibility modifiers: `+` public, `-` private, `#` protected, `~` package.

### 6.4 Entity-Relationship Diagram

```
[meta]
type: er

entity User {
    id: UUID [pk]
    email: String [unique]
    name: String
}

entity Order {
    id: UUID [pk]
    createdAt: DateTime
    total: Decimal
}

entity Product {
    id: UUID [pk]
    name: String
    price: Decimal
}

// Relationships with cardinality
User ||--o{ Order: "places"
Order }o--|| Product: "includes"

// Shorthand cardinality notation
// ||   exactly one
// o|   zero or one
// }|   one or many
// }o   zero or many
```

### 6.5 Architecture / Infrastructure Diagram

```
[meta]
type: arch
direction: left-right

// Icons via icon: attribute or prefix
node Client [shape: person, icon: user]
node CDN [shape: cloud]

group "AWS Region us-east-1" {
    group "VPC" {
        node LoadBalancer [shape: service, icon: aws-alb]
        group "App Tier" {
            node AppServer1 [shape: service]
            node AppServer2 [shape: service]
        }
        group "Data Tier" {
            node PrimaryDB([Primary DB]) [icon: aws-rds]
            node ReplicaDB([Replica]) [icon: aws-rds]
        }
    }
    node S3 [shape: storage, icon: aws-s3]
}

Client -> CDN: "HTTPS"
CDN -> LoadBalancer: "Forward"
LoadBalancer -> AppServer1
LoadBalancer -> AppServer2
AppServer1 -> PrimaryDB: "Read/Write"
AppServer2 -> PrimaryDB: "Read/Write"
PrimaryDB --> ReplicaDB: "Replicate"
AppServer1 --> S3: "Store assets"
```

### 6.6 State Machine

```
[meta]
type: state

state Idle
state Processing
state Success [class: terminal]
state Failed [class: terminal]

[*] -> Idle: "Init"
Idle -> Processing: "Submit" [guard: "formValid"]
Processing -> Success: "Done"
Processing -> Failed: "Error"
Failed -> Idle: "Reset"
Success -> [*]

// Composite state
state Processing {
    [*] -> Validating
    Validating -> Executing
    Executing -> [*]
}
```

### 6.7 Mindmap

```
[meta]
type: mindmap

root "TextGraph DSL"
    branch "Syntax"
        leaf "Natural language"
        leaf "Low punctuation"
        leaf "Multiple diagram types"
    branch "Rendering"
        leaf "Partial on error"
        leaf "Error annotations"
        leaf "Auto layout"
    branch "Styling"
        leaf "Themes"
        leaf "Style blocks"
        leaf "CSS-like classes"
```

### 6.8 Gantt Chart

```
[meta]
type: gantt
dateFormat: YYYY-MM-DD

section "Design Phase"
    task "Requirements": 2025-01-01, 7d
    task "Architecture": 2025-01-08, 5d

section "Development"
    task "Core Parser":    2025-01-15, 14d
    task "Renderer":       2025-01-20, 14d [depends: "Core Parser"]
    task "Theme Engine":   2025-02-01, 7d

section "Testing"
    task "Unit Tests":     2025-02-08, 5d
    task "Integration":    2025-02-10, 7d [depends: "Unit Tests"]
```

### 6.9 Timeline

```
[meta]
type: timeline

2020: "Founded"
2021: "Series A" [class: milestone]
     "Launched v1.0"
2022: "10k users"
     "Series B" [class: milestone]
2023: "Launched v2.0"
     "100k users" [class: milestone]
```

---

## 7. Style Block

The `[style]` section uses a CSS-like syntax. It never appears inside the diagram content.

```
[style]
// Apply a built-in theme
theme: modern-dark

// Override theme variables
vars {
    primary-color: #4F46E5
    secondary-color: #7C3AED
    font-family: "Inter, sans-serif"
    font-size: 14
    border-radius: 6
    background: #0F172A
    text-color: #F1F5F9
    edge-color: #64748B
}

// Element type styles
node {
    fill: vars.primary-color
    stroke: #312E81
    color: white
    padding: 12
}

edge {
    stroke: vars.edge-color
    stroke-width: 1.5
}

group {
    fill: rgba(79, 70, 229, 0.1)
    stroke: vars.primary-color
    stroke-dash: 4
}

// Named classes (applied with [class: foo] on nodes/edges)
.primary {
    fill: vars.primary-color
    color: white
    font-weight: bold
}

.danger {
    fill: #DC2626
    color: white
}

.warning {
    fill: #D97706
    color: white
}

.ghost {
    fill: transparent
    stroke: vars.edge-color
    stroke-dash: 4
}

.terminal {
    stroke-width: 3
}

// Per-ID overrides (last resort for one-off adjustments)
#LoadBalancer {
    fill: #059669
}
```

**Built-in themes:** `default`, `modern-light`, `modern-dark`, `minimal`, `colorful`, `corporate`, `hand-drawn`, `blueprint`

---

## 8. Layout Directives

High-level layout hints without pixel coordinates:

```
// Global direction (also set in [meta])
direction: left-right

// Per-group direction
group "Pipeline" [direction: horizontal] { ... }

// Rank / layer constraints
rank "top": CDN, LoadBalancer
rank "middle": AppServer1, AppServer2
rank "bottom": PrimaryDB, ReplicaDB

// Explicit ordering within a rank
order: AppServer1, AppServer2   // left-to-right order in same rank

// Spacing overrides
spacing: loose     // compact | normal | loose
```

---

## 9. Reuse and References

### 9.1 Aliases

```
alias LB = LoadBalancer
alias DB = PrimaryDatabase
```

### 9.2 Templates / Macros

```
template microservice(name, port) {
    svc[name]: name [shape: service]
    svc[name] -> Gateway: port
}

use microservice("UserService", 8001)
use microservice("OrderService", 8002)
```

### 9.3 Include

```
include "shared/legend.tg"
include "shared/aws-icons.tg"
```

---

## 10. Error Handling Semantics

The renderer **never produces a blank output** due to errors. Instead:

- **Unknown node reference** → rendered as a dashed-outline placeholder node labeled `[unknown: X]`
- **Unparseable line** → rendered as a red error annotation band inline at that position
- **Unknown shape** → falls back to default rectangle with a warning icon
- **Unknown attribute** → silently ignored (warning in output log only)
- **Unclosed group** → treated as closed at end of file

Error annotations in the rendered diagram:

```
⚠ Parse error (line 12): unexpected token "frows" — did you mean "flows"?
```

---

## 11. Operator and Keyword Reference

### Edge Operators

| Syntax    | Meaning                        |
|-----------|--------------------------------|
| `->`      | Directed (solid arrow)         |
| `-->`     | Directed (dashed arrow)        |
| `--`      | Undirected (solid line)        |
| `-.-`     | Undirected (dotted line)       |
| `<->`     | Bidirectional                  |
| `-o`      | Line with open circle end      |
| `-|>`     | Hollow arrowhead (inheritance) |
| `..|>`    | Dashed hollow (implementation) |
| `--*`     | Composition diamond            |
| `--o`     | Aggregation diamond            |

### Reserved Keywords

`participant`, `actor`, `node`, `class`, `interface`, `enum`, `entity`,
`state`, `group`, `lane`, `subgraph`, `branch`, `leaf`, `root`, `task`,
`section`, `template`, `use`, `include`, `alias`,
`activate`, `deactivate`, `note`, `alt`, `else`, `loop`, `par`, `and`,
`rank`, `order`, `direction`, `theme`, `vars`

### Cardinality (ER / Class)

| Symbol | Meaning        |
|--------|----------------|
| `\|\|` | Exactly one    |
| `o\|`  | Zero or one    |
| `}\|`  | One or many    |
| `}o`   | Zero or many   |

---

## 12. Complete Example — Full-Stack App Architecture

```
[meta]
title: "E-Commerce Platform Architecture"
type: arch
direction: left-right

[style]
theme: modern-dark
vars {
    primary-color: #6366F1
}
.external { stroke-dash: 6 }
.critical { stroke: #EF4444, stroke-width: 3 }

[diagram]
// External actors
node Browser [shape: person, class: external]
node MobileApp [shape: person, class: external]
node ThirdPartyPayment [class: external]

group "CDN / Edge" {
    node CloudFront [icon: aws-cloudfront]
    node WAF [icon: aws-waf]
}

group "API Gateway Layer" {
    node APIGW [shape: service, icon: aws-api-gateway]
}

group "Microservices" [direction: horizontal] {
    node UserSvc: "User Service" [shape: service]
    node CatalogSvc: "Catalog Service" [shape: service]
    node OrderSvc: "Order Service" [shape: service, class: critical]
    node PaymentSvc: "Payment Service" [shape: service, class: critical]
    node NotificationSvc: "Notification Service" [shape: service]
}

group "Data Stores" {
    node UserDB([User DB]) [icon: aws-rds]
    node CatalogDB([Catalog DB]) [icon: aws-dynamodb]
    node OrderDB([Order DB]) [icon: aws-rds]
    node Cache [shape: cylinder, icon: aws-elasticache]
}

group "Async / Messaging" {
    node EventBus [shape: service, icon: aws-eventbridge]
}

node S3 [shape: storage, icon: aws-s3]
node Observability [shape: service]

// Connections
Browser -> CloudFront: "HTTPS"
MobileApp -> CloudFront: "HTTPS"
CloudFront -> WAF
WAF -> APIGW

APIGW -> UserSvc
APIGW -> CatalogSvc
APIGW -> OrderSvc

UserSvc -> UserDB
UserSvc --> Cache: "session"
CatalogSvc -> CatalogDB
CatalogSvc --> Cache: "product cache"
OrderSvc -> OrderDB
OrderSvc -> PaymentSvc: "charge"
PaymentSvc -> ThirdPartyPayment

OrderSvc --> EventBus: "OrderPlaced"
EventBus --> NotificationSvc: "trigger"
EventBus --> Observability: "log"

NotificationSvc --> S3: "email templates"
```

---

## 13. Design Decisions and Rationale

| Decision | Rationale |
|---|---|
| Unified grammar across diagram types | One language to learn; type inferred or declared |
| Implicit node declaration | Less boilerplate; declare only when adding attributes |
| Natural language edge aliases | LLM-friendlier; `extends` is clearer than `-\|>` |
| Separate `[style]` section | Content/presentation separation; swap themes without touching diagram |
| Error nodes instead of failed renders | Users see progress; inline fixes instead of blank screen |
| `-->` for async/weak vs `->` for sync/strong | Consistent convention across all diagram types |
| Named shapes + shorthand both supported | Quick authoring and readability coexist |
| Template/macro system | Avoids repetition in large architecture diagrams |
| CSS-like class system | Familiar mental model; better than per-node styling |

---

## 14. Grammar (EBNF Sketch)

```ebnf
document      ::= section*
section       ::= '[' section-name ']' NEWLINE statement*
section-name  ::= 'meta' | 'style' | 'diagram'

statement     ::= node-decl
               | edge-decl
               | group-decl
               | lane-decl
               | class-decl
               | sequence-stmt
               | style-stmt
               | directive
               | template-decl
               | use-stmt
               | include-stmt
               | comment

node-decl     ::= node-id ['(' shape ')'] [':' label] ['[' attr-list ']']
edge-decl     ::= node-id edge-op node-id [':' label] ['[' attr-list ']']
              | node-id nl-connector node-id [':' label]

edge-op       ::= '->' | '-->' | '--' | '-.-' | '<->' | '-o'
               | '-|>' | '..|>' | '--*' | '--o'

nl-connector  ::= 'flows to' | 'depends on' | 'uses' | 'extends'
               | 'implements' | 'contains' | 'sends to' | ...

group-decl    ::= 'group' label ['[' attr-list ']'] '{' statement* '}'
lane-decl     ::= 'lane' label '{' statement* '}'

node-id       ::= identifier | quoted-string
label         ::= quoted-string | bare-word+
attr-list     ::= attr (',' attr)*
attr          ::= key ':' value
```

---

*TextGraph DSL v0.1 — subject to revision based on prototyping and user feedback.*
