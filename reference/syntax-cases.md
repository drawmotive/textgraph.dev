# Syntax Cases and Precedence

This page explains compact forms, binding rules, and syntax limits that are easy to misread. Read it alongside the [Language Specification](/reference/textgraph-spec), especially when generating TextGraph with an AI tool. Download the same source as <a href="/reference/syntax-cases.md" target="_self" download>Syntax Cases Markdown</a>.

## Groups take precedence over labels

Curly braces are reserved for group structure. A colon introduces text only until the next `{` or `}`. When a group body follows a named endpoint, the text before its opening brace is the group title. This rule also applies inside connections. Spaces around braces and arrows are optional.

| Source | Meaning |
| --- | --- |
| `X:{A->B}` | Group `X` contains nodes `A`, `B`, and their connection. Its default title is `X`. |
| `X:Title{A->B}` | The same group, with the title `Title`. |
| `A->C:{value}` | Node `A` connects to group `C`, which contains node `value`. |
| `A->C:Services{value}` | The target is group `C`, titled `Services`. |
| `A->C: contains` | There is no group body, so `contains` is the edge label. |
| `X:{}` | An empty named group, with default title `X`. |
| `{{value}}` | An anonymous group containing another anonymous group containing node `value`. |
| `X:{{value}}` | Named group `X` containing an anonymous group containing node `value`. |

These two forms have the same structure:

```textgraph example
X:Title{A->B}
```

```textgraph example
X: Title {
  A -> B
}
```

The opening brace belongs to the header line; the body may continue on later lines. Moving body content onto a new line does not turn a group into a label. Multiple bare members need separate lines: `{ B C }` is not a two-member group. Use `{ B -> C }` for a connection, or put `B` and `C` on separate lines.

## A group endpoint is one compound subject

```textgraph example
A->{B}->C:{value}
```

This creates node `A`, an anonymous group containing `B`, and named group `C` containing `value`. The two outer arrows connect `A` to the anonymous group boundary, then that boundary to `C`'s boundary. There is no edge label and no ordinary node named `C`. The anonymous group occurrence is reused by both arrows.

Group titles and edge labels can coexist:

```textgraph example
A -> C: Services {value}: contains
```

The first colon introduces group `C`'s title, `Services`. After its closing brace, `: contains` labels the connection from `A` to `C`. Without a following body, a connection's trailing colon introduces an edge label. In `A -> B -> C: data`, it labels the last edge, `B -> C`. Write separate connections when each edge needs its own label.

## Labels cannot contain literal curly braces

Neither `{value}` nor `{{value}}` is a label template or a literal-brace escape. Quoting or prefixing a backslash does not turn curly braces into label text. Node labels, anonymous-node labels, group titles, and edge labels do not support literal curly braces. Use text such as `value` or `Template value` instead.

| Source | Result |
| --- | --- |
| `X: {value}` | A group definition, not a node with a brace-containing label. |
| `A -> {B}: {value}` | Invalid: a completed group endpoint cannot acquire another body through an edge label. |
| `A -> [{value}]` | Invalid: an anonymous-node label cannot contain curly braces. |
| `X: label }` | Invalid: the closing brace has no owning group. |
| `X:{A->B` | Invalid: the group body is not closed; it does not fall back to label text. |

## Parentheses bind at their position

| Source | Meaning |
| --- | --- |
| `A ->(bold) {B}` | The edge is bold. |
| `A -> {B}(horizontal)` | The target group uses horizontal layout. |
| `A -> C(horizontal): Services {value}` | Named group `C` uses horizontal layout and the title `Services`. |
| `(horizontal){B}->A` | Sets the containing scope's direction, then connects an anonymous group containing `B` to `A`. |
| `(horizontal)` | Styles its containing scope: diagram direction at the root, group direction inside a body. |

To combine edge and group styles, put each class list at its owning position:

```textgraph example
A ->(bold) C(horizontal): Services {value}
```

## Standalone parentheses style the containing scope

An anonymous group's own styles belong inside its braces:

```textgraph example
{
  (horizontal)
  A -> B
}
```

The rule applies to all style classes. A standalone `(horizontal primary dashed)` inside a group sets that group's layout and appearance. Body classes merge with header classes and may appear before or after members. They do not decorate member nodes or other groups. Conflicting directions produce a diagnostic rather than silently overriding each other.

The following compact and multiline forms have the same meaning:

```textgraph example
(horizontal){A->B}
```

```textgraph example
(horizontal)
{A->B}
```

Both contain two statements: set the document's direction, then define an anonymous group. The preceding class list does not attach to that group, and inserting whitespace or a newline does not change ownership. To set the group's direction, use the body form above. A named group can still attach styles to its name: `G(horizontal){A->B}`.

A label on a targetless style statement also stays with that statement. `(horizontal): Services {A->B}` does not title the anonymous group; use `G(horizontal): Services {A->B}` when the group needs a title.

```textgraph example
(vertical)
Outer {
  (horizontal primary)
  A -> B
  Inner {
    (vertical dashed)
    C -> D
  }
}
```

The document has vertical direction, `Outer` arranges its direct contents horizontally, and `Inner` arranges its contents vertically. Each standalone class list belongs only to its immediate scope. Writing `(horizontal){C->D}` inside `Outer` sets `Outer`'s direction and defines an unstyled nested group; it does not set the nested group's direction.

## A repeated label does not create a reusable anonymous identity

Each separate `[B]` occurrence creates a new anonymous node. In `A -> [B] -> C`, one occurrence is shared by the two adjacent edges. The same occurrence rule applies to anonymous groups. Use a named node or group when another statement must refer to it.

## Group structure and decorations have different roles

Group bodies contain connections, bare member names, nested groups, standalone scope styles, and comments. Inline endpoint styles and edge labels are allowed. Put standalone member labels and targeted styles at the document root:

```textgraph example
Backend {
  api -> saved
}
api: Service API
saved(fill success): Saved result
```

Writing `api: Service API` as a standalone statement inside `Backend` is invalid. A header such as `Services: Backend {api}` is a nested group definition and is valid there.

## Short names depend on scope

Inside a group, a short node name creates or reuses a local member. At the root, a unique short name refers to the existing subject anywhere in the diagram. If several groups contain that name, qualify it:

```textgraph example
First { A -> B }
Second { A -> C }
First.A -> Second.A
```

Here the two `A` nodes are distinct. Root `A -> B` would be ambiguous. A qualified reference such as `First.A` selects an existing subject and never creates missing groups or members. Labels and root references may precede or follow the groups without changing membership.
