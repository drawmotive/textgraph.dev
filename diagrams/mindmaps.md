# Mind Maps

::: warning Not implemented
Mind maps are not available yet. This page describes planned syntax and behavior; its examples will not render as mind maps. For working diagrams, see [Flowcharts](/diagrams/flowcharts).
:::

Mind maps use the `mindmap` class on a group scope. Hierarchy comes from indentation — each level of indent defines a parent-child relationship, no `->` arrows needed.

All examples on this page use cloud architecture as the running context.

## Your First Mind Map

A root node and indented children produce a complete mind map.

```
cloud(mindmap) {
  Cloud Platform
    Compute
    Storage
    Networking
}
```

Each indented line becomes a child of the line above it at one less indent level. Bare text serves as both the identifier and the label — no separate declaration needed.

## Multi-Level Hierarchy

Add more indent levels for deeper structure. Each level nests under its parent.

```
cloud(mindmap) {
  AWS Services
    Compute
      EC2
      Lambda
      ECS
    Storage
      S3
      EBS
      Glacier
    Database
      RDS
      DynamoDB
      ElastiCache
}
```

The implicit connections follow the indentation: `AWS Services -> Compute`, `Compute -> EC2`, `Compute -> Lambda`, and so on. There is no practical limit to nesting depth — use as many levels as the diagram requires.

Bare-text nodes have no addressable identifier. They cannot be the source or target of a `->` connection. This is invalid:

```
<!-- invalid -->
cloud(mindmap) {
  AWS Services
    Compute
    Storage
  Compute -> Storage
}
```

To add explicit connections, assign identifiers first — see the next section.

## Explicit Identifiers

Use `id: Label` syntax to give a node an addressable name. The hierarchy still comes from indentation; the identifier is just a handle for styling or connections.

```
cloud(mindmap) {
  platform: Cloud Platform
    compute: Compute Services
      lambda: Lambda
      ecs: ECS
    storage: Storage Services
      s3: S3 Buckets
      ebs: EBS Volumes
  lambda -> s3 : reads assets
}
```

The indentation creates the tree structure as before. The `lambda -> s3` line adds an explicit cross-tree edge on top of the implicit hierarchy. Only nodes with explicit identifiers can participate in `->` connections.

## Inline Line Breaks

Use `\n` for compact multi-line labels within a single node.

```
cloud(mindmap) {
  Platform Overview
    ec2: EC2\nus-east-1
    lambda: Lambda\nv14 runtime
    s3: S3\n500 GB
    rds: RDS\nPostgreSQL 16
}
```

Each node displays its name on the first line and a detail on the second. This keeps the tree compact without resorting to fenced blocks.

## Rich Node Content

For multi-line rich content — headings, bullet lists, code — use a fenced ` ```md ` block on the lines following the node text.

````
cloud(mindmap) {
  Platform Services
    Compute
      ```md
      - EC2: 12 instances
      - Lambda: 48 functions
      - ECS: 3 clusters
      ```
    Storage
      ```md
      - S3: 2.4 TB across 15 buckets
      - EBS: 500 GB provisioned
      - Glacier: 10 TB archived
      ```
    Database
      ```md
      - RDS: PostgreSQL 16
      - DynamoDB: 3 tables
      - ElastiCache: Redis 7
      ```
````

The fenced block attaches to the preceding indented node and renders as rich Markdown inside it. Use this when `\n` is too limiting.

## Styling Nodes

Shape, fill, color, border, and weight classes work on mindmap nodes the same way as on flowchart nodes. Place classes in parentheses after the identifier.

```
cloud(mindmap) {
  health: Service Health
    api(fill success): API Gateway\nOK
    auth(fill success): Auth Service\nOK
    queue(fill warning): Message Queue\nSlow
    db(fill danger): Database\nDown
    cache(fill info): Cache Layer\nWarm
    cdn(fill success): CDN\nOK
}
```

Semantic colors carry meaning at a glance: `success` for healthy, `warning` for degraded, `danger` for down.

Shapes and border styles combine freely:

```
cloud(mindmap) {
  platform: Cloud Platform
    api(stadium fill primary): API Gateway
    db(cylinder fill info): PostgreSQL
    queue(hexagon fill secondary): Message Queue
    alert(diamond fill danger): Alert System
    docs(document): Runbook
}
```

## Styling Edges

Apply style classes to explicit `->` connections within a mindmap. Place classes in parentheses after the arrow operator.

```
cloud(mindmap) {
  platform: Platform
    api: API Gateway
    queue: Message Queue
    legacy: Legacy Service
    db: Database
  api ->(bold primary) db : sync read
  api ->(dashed info) queue : async publish
  api ->(dotted danger) legacy : deprecated
}
```

Use consistent edge styles to create a visual language: `bold` for critical synchronous paths, `dashed` for async messaging, `dotted` for deprecated connections.

## Layout and Scope Styles

Scope-level classes apply to the mindmap group itself. Use `(fill)` for a background, `dark` or `light` for theme, and layout classes on nested groups.

```
cloud(mindmap fill) {
  AWS Platform
    Compute
      EC2
      Lambda
    Storage
      S3
      EBS
    Networking
      VPC
      CloudFront
}
```

Apply `dark` theme to the scope:

```
cloud(mindmap dark fill) {
  Cloud Services
    Compute
    Storage
    Database
}
```

Use layout classes on nested groups inside a mindmap to control their internal arrangement:

```
platform(mindmap) {
  Cloud Platform
    services: Core Services
    monitoring: Monitoring

  services(horizontal) {
    api: API
    auth: Auth
    worker: Worker
  }

  monitoring(layout-2-col) {
    cpu: CPU
    mem: Memory
    disk: Disk
    net: Network
  }
}
```

## Nested Groups Inside a Mind Map

Use `{}` groups within a mindmap scope for sub-diagrams with independent layout and internal `->` connections. Cross-scope connections use dot notation.

```
platform(mindmap) {
  Cloud Architecture
    frontend: Frontend
    backend: Backend

  frontend {
    cdn -> app
    cdn: CDN
    app: Web App
  }

  backend {
    api -> auth
    api -> worker
    api: API Gateway
    auth: Auth Service
    worker: Worker
  }

  frontend.app -> backend.api
}
```

Each `{}` group arranges its nodes independently. Connections inside a group use local identifiers; connections between groups use dot notation.

## Explicit Connections Alongside the Tree

Explicit `->` edges coexist with the implicit hierarchy from indentation. Use them to show cross-cutting relationships that the tree structure alone cannot express.

```
cloud(mindmap) {
  arch: Cloud Architecture
    compute: Compute
      ec2: EC2 Instances
      lambda: Lambda Functions
    storage: Storage
      s3: S3 Buckets
      ebs: EBS Volumes
    data: Data
      rds: RDS PostgreSQL
      dynamo: DynamoDB

  lambda -> s3 : writes output
  ec2 -> rds : queries
  lambda ->(dashed info) dynamo : event stream
  ec2 ->(dotted danger) ebs : deprecated mount
}
```

Edge labels and styles work the same as in flowcharts. Only nodes with explicit identifiers can participate in `->` connections — bare-text nodes cannot be referenced:

```
<!-- invalid: bare-text nodes cannot be -> targets -->
cloud(mindmap) {
  Platform
    Compute
    Storage
  Compute -> Storage
}
```

Assign identifiers with `id: Label` if you need to add cross-tree edges.

## Overlay Positioning

Overlay classes anchor elements at fixed positions within the mindmap scope, outside the normal layout flow.

### Badge

A small status indicator in the corner:

```
cloud(mindmap) {
  Platform
    API Gateway
    Auth Service
    Database

  status(overlay-top-right fill success no-border): OK
}
```

### Annotation Callout

A floating note connected to a specific node:

```
cloud(mindmap) {
  platform: Platform
    api: API Gateway
    auth: Auth Service
    db: Database

  tip(overlay-bottom-right callout warning): Scale horizontally
  tip -> api
}
```

Overlay elements can have connections to flow elements — the renderer routes edges between layers.

### Cover Watermark

Use `overlay-cover` for a translucent watermark or background label:

```
cloud(mindmap) {
  Platform
    Compute
    Storage
    Database

  (overlay-cover no-border): STAGING
}
```

## Putting It All Together

A comprehensive cloud platform capability map exercising every feature from this page.

````
(fill)
header(title): # Cloud Platform Capability Map

cloud(mindmap dark fill) {
  platform: Cloud Platform
    compute: Compute\nus-east-1
      ec2: EC2 Instances
      lambda: Lambda Functions
        ```md
        - 48 functions deployed
        - Node.js 20 runtime
        - Avg cold start: 120ms
        ```
      ecs: ECS Clusters
    storage: Storage\nus-east-1
      s3(fill info): S3 Buckets
      ebs: EBS Volumes
    data: Data Services
      rds(cylinder fill success): RDS PostgreSQL
      dynamo(cylinder fill success): DynamoDB
      cache(cylinder fill warning): ElastiCache\nMemory 85%

  lambda ->(dashed info) s3 : writes output
  ec2 ->(bold primary) rds : sync query
  lambda ->(dashed info) dynamo : event stream
  ec2 ->(dotted danger) ebs : legacy mount

  compute, storage, data(bold)

  services: Shared Services

  services(horizontal) {
    api(stadium fill primary): API Gateway
    auth(fill success): Auth Service
    queue(hexagon fill secondary): Message Queue
  }

  services.api -> data.rds : read/write
  services.auth -> data.cache : session lookup

  health(overlay-top-right fill success no-border): PASS
  alert(overlay-bottom-right callout danger): Cache memory high\nScale before 90%
  alert -> cache
}
````

## Tips

1. **Start with bare text.** Write the tree hierarchy first using plain indented text. Add identifiers only when you need to style a node or add explicit connections.

2. **Choose `\n` for short metadata, fenced blocks for rich content.** A service name with a region fits `\n`. A node with bullet lists or headings needs a ` ```md ` block.

3. **Keep indentation consistent.** Use the same indent width (two or four spaces) throughout the mindmap. Mixed indentation makes the hierarchy ambiguous.

4. **Color by health or status.** Use `success`, `warning`, and `danger` fills to make service health visible at a glance. Readers intuit meaning without a legend.

5. **Add explicit edges sparingly.** The tree hierarchy conveys most relationships. Reserve `->` connections for cross-cutting concerns that the tree cannot express — overusing them clutters the diagram.

6. **Use horizontal groups for peer clusters.** When several services are peers rather than parent-child, nest them in a `(horizontal)` group inside the mindmap to lay them out side by side.

7. **Use overlay badges for live status.** Anchor a small `overlay-top-right` node with `fill success` or `fill danger` to show current status without disrupting the tree layout.
