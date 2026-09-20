# Style Classes Reference

Place style classes in parentheses on a node label declaration, a connection endpoint, an edge arrow, or a group declaration:

```text
api(fill primary): API Server
api ->(bold dashed) worker
worker(circle): Worker
services(horizontal) {
  cache: Cache
  database: Database
}
```

See [Styling](/reference/textgraph-spec#styling) for the syntax rules.

## Node Shapes

| Class | Shape |
|-------|-------|
| `rectangle` | Rectangular box (default) |
| `circle` | Circle |
| `ellipse` | Ellipse |
| `diamond` | Diamond |

```text
start(circle): Start
check(diamond): Ready?
finish(ellipse): Done
start -> check -> finish
```

## Colors and Fill

Color classes select the border color on nodes and groups, or the stroke color on edges. Add `fill` before a color class to fill a node with that color. Nodes have transparent interiors by default; groups have a shaded background.

| Class | Color role |
|-------|------------|
| `primary` | Primary accent |
| `secondary` | Secondary accent |
| `info` | Informational accent |
| `success` | Success accent |
| `warning` | Warning accent |

The renderer’s palette supplies the colors.

```text
api(fill primary): API Server
worker(fill success): Worker
api ->(primary) worker
```

Use one color class per element. `fill` by itself uses the primary fill color.

## Line Styles

These classes apply to node and group borders and to edge strokes:

| Class | Effect |
|-------|--------|
| `dashed` | Dashed line |
| `dotted` | Dotted line |
| `bold` | Heavier stroke |

Lines are solid with normal stroke weight by default.

```text
a(dashed): Draft
b(dotted): Review
a ->(bold) b
```

## Layout

Set diagram direction with a root declaration, or set a group’s layout on its opening declaration:

```text
(horizontal)
client -> services
services(vertical) {
  api: API
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

Column layouts apply to groups containing nodes directly:

```text
services(layout-2-col) {
  api: API
  worker: Worker
  cache: Cache
  database: Database
}
```

Without an explicit layout class, the diagram is arranged automatically from its connections.
