# Style Classes Reference

Style classes are space-separated tokens placed in parentheses after a node identifier, edge arrow, scope declaration, or slide boundary. They compose freely — any number of classes can be combined.

```
a(fill primary dashed): My Node
a ->(bold) b
group1(dark horizontal) { ... }
@slide(dark): Slide Title
```

See [Styling](/reference/textgraph-spec#styling) in the spec for the full syntax rules.

---

## Global Theme

Applied to a slide, the root scope, or any group to set the overall visual tone.

| Class | Effect |
|-------|--------|
| `dark` | Dark background, light text |
| `light` | Light background, dark text (default) |

---

## Node Shapes

Applied to a node to control its rendered shape. By default all nodes are rendered with rounded corners. Use `no-rounded` to remove rounding.

| Class | Alias | Shape |
|-------|-------|-------|
| `rectangle` | `rect` | Rectangular box (default) |
| `circle` | — | Circle |
| `diamond` | `decision` | Diamond (decision node) |
| `cylinder` | `db`, `database` | Cylindrical shape (storage / database) |
| `parallelogram` | `io` | Parallelogram (input/output) |
| `triangle` | — | Triangle |
| `hexagon` | — | Hexagon |
| `stadium` | `pill` | Pill / stadium shape |
| `document` | `doc` | Document shape (wavy bottom) |
| `callout` | — | Speech bubble callout |

---

## Roundness

| Class | Effect |
|-------|--------|
| `rounded` | Apply rounded corners (default) |
| `no-rounded` | Remove rounded corners — sharp rectangular edges |

`rounded` and `no-rounded` apply to any element: nodes, groups, borders, and edges (line join style).

---

## Colors

Color classes apply to node fill, edge stroke, or scope background depending on context.

### Semantic Colors

| Class | Meaning |
|-------|---------|
| `primary` | Primary brand color |
| `secondary` | Secondary brand color |
| `info` | Informational (typically blue) |
| `success` | Positive / success state (typically green) |
| `warning` | Caution / warning state (typically amber) |
| `danger` | Error / destructive state (typically red) |

### Surface Colors

| Class | Effect |
|-------|--------|
| `background` | Applies the current theme background color |
| `foreground` | Applies the current theme foreground / text color |

The default unfilled node surface is foreground at 15% opacity, providing a subtle distinction without requiring explicit color declarations.

---

## Fill & Border

| Class | Effect |
|-------|--------|
| `fill` | Fill the node with the current color |
| `no-fill` | Remove fill (transparent interior) |
| `border` | Show a visible border (default) |
| `no-border` | Remove the border entirely |

---

## Line & Border Style

These classes control the stroke style of both borders (on nodes and groups) and lines (on edges).

| Class | Effect |
|-------|--------|
| `solid` | Solid line (default) |
| `dashed` | Dashed line |
| `dotted` | Dotted line |

---

## Line Weight

| Class | Effect |
|-------|--------|
| `normal` | Normal stroke weight (default) |
| `bold` | Bold / heavy stroke |
| `thick` | Thick stroke (heavier than bold) |

---

## Reset

| Class | Effect |
|-------|--------|
| `clear` | Remove all previously applied style classes from this element |

`clear` is useful when a group or slide inherits styles from a parent scope and you want a clean baseline:

```
@slide(dark primary)

a -> b

@slide(clear light)

c -> d
```

---

## Layout

Layout classes control arrangement of children within a scope. They are valid on groups and scopes, not individual nodes.

| Class | Effect |
|-------|--------|
| `vertical` | Arrange children top-to-bottom (default) |
| `horizontal` | Arrange children left-to-right |
| `layout-2-col` | Two-column grid |
| `layout-3-col` | Three-column grid |
| `layout-4-col` | Four-column grid |
| `layout-6-col` | Six-column grid |

### Justify (main axis)

Controls how children are distributed along the main axis:

| Class | Effect |
|-------|--------|
| `justify-start` | Pack children toward the start (default) |
| `justify-center` | Center children along the main axis |
| `justify-end` | Pack children toward the end |
| `justify-between` | Equal space between children |
| `justify-around` | Equal space around each child |
| `justify-evenly` | Equal space between and around children |

### Align (cross axis)

Controls how children are aligned on the cross axis:

| Class | Effect |
|-------|--------|
| `align-start` | Align children to the start of the cross axis |
| `align-center` | Center children on the cross axis |
| `align-end` | Align children to the end of the cross axis |

---

## Overlay Position

Overlay classes remove an element from the normal layout flow and anchor it at a fixed position within the parent scope. They are valid on nodes, groups, and scope-level declarations. When multiple overlays exist in the same scope, later declarations render on top (higher z-order).

| Class | Effect |
|-------|--------|
| `overlay-center` | Layer on top of parent, centered |
| `overlay-top-left` | Anchor to top-left corner of parent |
| `overlay-top-center` | Anchor to top-center edge of parent |
| `overlay-top-right` | Anchor to top-right corner of parent |
| `overlay-center-left` | Anchor to center-left edge of parent |
| `overlay-center-right` | Anchor to center-right edge of parent |
| `overlay-bottom-left` | Anchor to bottom-left corner of parent |
| `overlay-bottom-center` | Anchor to bottom-center edge of parent |
| `overlay-bottom-right` | Anchor to bottom-right corner of parent |
| `overlay-cover` | Stretch to fill parent scope dimensions (for watermarks, translucent backgrounds) |

Overlay elements can have connections to flow elements — the renderer routes edges between the overlay and flow layers.

**Example — badge on a group:**

```
services {
  api: API Server
  db(cylinder): Database
  api -> db

  status(overlay-top-right circle success fill): ✓
}
```

**Example — watermark on a slide:**

```
@slide: confidential

a -> b -> c

(overlay-bottom-right no-border): DRAFT
```

**Example — floating annotation with connection:**

```
@slide: demo

main {
  a -> b -> c
}

tip(overlay-top-right callout warning): Pay attention here!
tip -> main.b
```

---

## Sequence Diagram — Combined Fragments

The following classes are valid only on a named scope (`group(class) { ... }`) that appears inside a `sequence` diagram type. Outside a sequence context they have no visual effect.

| Class | Meaning | Notes |
|-------|---------|-------|
| `loop` | Loop combined fragment | First line of text inside the scope is the loop condition / title |
| `alt` | Alternative (if/else) fragment | Use nested scopes with `opt` for else branches |
| `opt` | Optional fragment | Single-condition optional block |
| `par` | Parallel fragment | Models concurrent flows |

**Example:**

```
diagram(sequence) {
  a -> b : request

  check(loop) {
    retry condition
    b -> a : retry
  }

  result(alt) {
    success
    b -> a : 200 OK

    failure(opt) {
      b -> a : 500 Error
    }
  }
}
```

The first line of text inside a `loop`, `alt`, `opt`, or `par` scope is rendered as the fragment's condition label (e.g., "retry condition", "success", "failure").

---

## Special Purpose

| Class | Valid on | Effect |
|-------|----------|--------|
| `notes` | Scope-level (slides) | Declares speaker notes for presenter mode — not rendered on the slide. Usage: `(notes): text` |
| `hidden` | Node, group | Renders the element invisibly — useful for spacing or layout anchors |
| `title` | Node, group | Renders the element as a prominent title block with no border |
