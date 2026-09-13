# Formal Grammar

The TextGraph syntax is defined as a PEG ([Parsing Expression Grammar](https://en.wikipedia.org/wiki/Parsing_expression_grammar)) using [Peggy](https://peggyjs.org/) notation. This grammar is the canonical, unambiguous reference for what inputs are syntactically valid.

Semantic rules — scope resolution, type inference, style inheritance, and rendering behavior — are defined in the [Language Specification](/reference/textgraph-spec).

When the prose specification and this grammar disagree on a syntax question, the grammar takes precedence.

## Notation

| Symbol | Meaning |
|--------|---------|
| `/` | Ordered choice (first match wins) |
| `*` | Zero or more |
| `+` | One or more |
| `?` | Optional |
| `&` | Positive lookahead |
| `!` | Negative lookahead |
| `[...]` | Character class |
| `"..."` | Literal string |
| `_` | Inline whitespace (spaces and tabs, not newlines) |

## Group Endpoints

A connection endpoint may be a named reference, an anonymous `[Label]` node, or a named or anonymous scope. `A->{B->C}`, `A->{}`, `{B->C}->D`, and `A->D{B->C}->E` are valid. Each scope occurrence represents one compound node; a middle occurrence is reused by both adjacent edges. Connections attach to its boundary, not its children.

Named groups use their identifier as the default title; a separate `D: Services` declaration overrides it. Anonymous groups omit the identifier and have no default title. Parentheses immediately after an arrow style the edge; use `D(horizontal){...}` or `{...}(horizontal)` to style a target group.

The grammar below is the executable canonical file, including its AST actions. `npm test` compiles it with Peggy and checks compact, empty, nested, chained, and styled group endpoints. A closing brace terminates a child statement while balanced braces in a label remain literal text.

## Grammar

```peg
// TextGraph DSL — Formal PEG Grammar
// Version: v0.1
//
// This grammar is the canonical syntax reference for the TextGraph DSL.
// It defines what inputs are syntactically valid. Semantic rules (scope
// resolution, type inference, style inheritance) are defined in the
// language specification.
//
// Notation: Peggy / PEG.js syntax
//   /       ordered choice (first match wins)
//   *       zero or more
//   +       one or more
//   ?       optional
//   &       positive lookahead
//   !       negative lookahead
//   [...]   character class
//   "..."   literal string
//   _       inline whitespace (spaces and tabs, not newlines)


// ───────────────────────────────────────────────────────────────
// Document
// ───────────────────────────────────────────────────────────────

Document
  = TextGraphBlock
  / SlideDocument
  / DiagramDocument

// A @textgraph-delimited block inside a Markdown file
TextGraphBlock
  = TextGraphOpen lines:Line* TextGraphClose?
  { return { type: "textgraph-block", lines } }

TextGraphOpen
  = "@textgraph" (_ ":" _ name:RestOfLine)? EOL
  { return { name: name ?? null } }

TextGraphClose
  = "@textgraph" EOL

// A document containing at least one slide boundary
SlideDocument
  = slides:Slide+
  { return { type: "slide-document", slides } }

Slide
  = boundary:SlideBoundary lines:SlideContent*
  { return { boundary, lines } }

// A document with no slide boundaries — pure diagram content
DiagramDocument
  = lines:Line+
  { return { type: "diagram-document", lines } }


// ───────────────────────────────────────────────────────────────
// Slide Boundary
// ───────────────────────────────────────────────────────────────

// @slide marks a slide boundary. Unambiguous — no overlap with
// the "--" undirected connection operator.
SlideBoundary
  = "@slide" classes:Classes? label:Label? _ EOL
  { return { type: "slide-boundary", classes, label } }


// ───────────────────────────────────────────────────────────────
// Slide Content
// ───────────────────────────────────────────────────────────────

// Inside a slide, bare text is Markdown. Diagram content must be
// in a scope with a type class (e.g. diagram, mindmap, sequence).
// This constraint is enforced by the semantic layer, not the grammar.
SlideContent
  = !SlideBoundary line:( ScopeBlock / SpeakerNotes / Line )
  { return line }


// ───────────────────────────────────────────────────────────────
// Lines
// ───────────────────────────────────────────────────────────────

Line
  = _ line:(
      BlankLine
    / Comment
    / FencedBlock
    / Connection
    / ScopeBlock
    / MultiNodeDeclaration
    / ScopeLevelStyle
    / SpeakerNotes
    / Declaration
    / MindmapNode
    / FreeText
  ) { return line }

BlankLine
  = _ Newline
  { return { type: "blank" } }


// ───────────────────────────────────────────────────────────────
// Comments
// ───────────────────────────────────────────────────────────────

Comment
  = "<!--" content:$(!"-->" .)* "-->" _ EOL?
  { return { type: "comment", content } }


// ───────────────────────────────────────────────────────────────
// Connections
// ───────────────────────────────────────────────────────────────

// A connection line contains at least one arrow operator.
// The line type is "connection" — any trailing `: label` is an
// edge label applied to ALL edges in the chain, not just the last.
Connection
  = connection:ConnectionExpression edgeLabel:EdgeLabel? _ EOL
  { return { type: "connection", ...connection, edgeLabel } }

// Keep the chain as an ordered sequence of endpoint occurrences. A scope
// in the middle of the chain is one group shared by both adjacent edges.
ConnectionExpression
  = head:Endpoint rest:ConnectionSegment+
  { return { head, rest } }

ConnectionSegment
  = _ arrow:Arrow _ classes:Classes? _ target:Endpoint
  { return { arrow, classes, target } }

Arrow
  = "<->" { return "bidi" }
  / "->"  { return "forward" }
  / "<-"  { return "backward" }
  / "--"  { return "undirected" }

EdgeLabel
  = _ ":" _ text:RestOfLine
  { return text }


// ───────────────────────────────────────────────────────────────
// Nodes (inside connections)
// ───────────────────────────────────────────────────────────────

// Braces create a compound node, never a shorthand for fan-out to children.
// Scope endpoints must be tried before named references.
Endpoint
  = ScopeEndpoint
  / Node

Node
  = ref:( QualifiedIdentifier / AnonymousNode ) _ classes:Classes?
  { return { ref, classes } }

QualifiedIdentifier
  = head:Identifier tail:("." Identifier)*
  { return { type: "reference", path: [head, ...tail.map(t => t[1])] } }

AnonymousNode
  = "[" _ text:AnonymousNodeText _ "]"
  { return { type: "anonymous-node", label: text } }

AnonymousNodeText
  = text:$( [^\]\r\n]+ )
  { return text }


// ───────────────────────────────────────────────────────────────
// Declarations
// ───────────────────────────────────────────────────────────────

// A declaration line has no arrow. The colon sets a display label.
// Classes and label can appear in either order:
//   a(fill primary): Agent
//   a: Agent
//   a(fill primary)
Declaration
  = id:Identifier classes:Classes? label:Label? _ EOL
  { return { type: "declaration", id, classes, label } }

// Multi-node declaration: comma-separated identifiers sharing classes.
// Only style classes are allowed — labels are not valid here.
// To label individual nodes, use separate declaration lines.
//   x, y, z(fill primary)
MultiNodeDeclaration
  = head:Identifier _ "," _ rest:(Identifier _ "," _)* last:Identifier classes:Classes _ EOL
  { return { type: "multi-declaration", ids: [head, ...rest.map(r => r[0]), last], classes } }


// ───────────────────────────────────────────────────────────────
// Scope-Level Styles
// ───────────────────────────────────────────────────────────────

// Classes at the start of a line with no preceding identifier
// apply to the enclosing scope.
//   (fill primary)
//   (horizontal)
//   (vertical justify-between)
ScopeLevelStyle
  = &"(" classes:Classes label:Label? _ EOL
  { return { type: "scope-style", classes, label } }


// ───────────────────────────────────────────────────────────────
// Speaker Notes
// ───────────────────────────────────────────────────────────────

SpeakerNotes
  = "(notes)" _ ":" _ text:( FencedBlock / RestOfLine ) _ EOL?
  { return { type: "notes", text } }


// ───────────────────────────────────────────────────────────────
// Scope Blocks
// ───────────────────────────────────────────────────────────────

// A standalone group may declare its title in the header. Connection
// endpoints use the same containment syntax but leave ":" to edge labels.
ScopeBlock
  = scope:(LabeledScope / ScopeEndpoint) _ EOL
  { return scope }

// A labeled declaration header ends at its opening brace. Requiring a
// newline preserves ordinary labels containing literal brace expressions.
LabeledScope
  = id:Identifier? _ classes:Classes? label:ScopeHeaderLabel _ "{" _ Newline
    body:ScopeBody _ "}"
  { return { type: "scope", id, classes, label, body } }

ScopeEndpoint
  = id:Identifier? _ before:Classes? _ body:ScopeContents _ after:Classes?
  { return { type: "scope", id, classes: before || after ? [...(before ?? []), ...(after ?? [])] : null, label: null, body } }

ScopeContents
  = "{" body:ScopeBody _ "}"
  { return body }

ScopeHeaderLabel
  = _ ":" _ text:$( [^{\r\n]+ )
  { return text.trim() }

// A closing brace is a statement boundary only within its owning scope.
// These rules keep root labels such as "A: {{value}}" literal, without
// mutable nesting state that could leak through PEG backtracking.
ScopeBody
  = lines:(_ !"}" line:ScopeLine { return line })*
  { return lines.filter(line => line.type !== "blank") }

ScopeLine
  = BlankLine
  / Comment
  / FencedBlock
  / connection:ConnectionExpression edgeLabel:ScopeLabel? _ ScopeEnd
    { return { type: "connection", ...connection, edgeLabel } }
  / scope:(LabeledScope / ScopeEndpoint) _ ScopeEnd
    { return scope }
  / head:Identifier _ "," _ rest:(Identifier _ "," _)* last:Identifier classes:Classes _ ScopeEnd
    { return { type: "multi-declaration", ids: [head, ...rest.map(r => r[0]), last], classes } }
  / &"(" classes:Classes label:ScopeLabel? _ ScopeEnd
    { return { type: "scope-style", classes, label } }
  / SpeakerNotes
  / id:Identifier classes:Classes? label:ScopeLabel? _ ScopeEnd
    { return { type: "declaration", id, classes, label } }
  / MindmapNode
  / !GraphStatementStart text:$( [^}\r\n]+ ) ScopeEnd
    { return { type: "free-text", text: text.trim() } }

ScopeLabel
  = _ ":" _ label:ResourceLabel
    { return label }
  / _ ":" _ text:$( (LabelBraces / [^{}\r\n])+ )
  { return text.trim() }

// Balanced braces in label text are literal content. An unmatched closing
// brace terminates the statement in the containing scope.
LabelBraces
  = "{" (LabelBraces / [^{}\r\n])* "}"

ScopeEnd
  = Newline / &"}"


// ───────────────────────────────────────────────────────────────
// Mindmap Nodes
// ───────────────────────────────────────────────────────────────

// Inside a mindmap scope, indentation defines hierarchy.
// A mindmap node is an indented line that is either:
//   - bare text (label = identifier)
//   - id: Label
//   - id(classes): Label
MindmapNode
  = indent:Indent content:(
      id:Identifier classes:Classes? label:Label? { return { id, classes, label } }
    / text:BareText { return { id: null, classes: null, label: text } }
    ) _ EOL
  { return { type: "mindmap-node", indent: indent.length, ...content } }

Indent
  = spaces:[ \t]+
  { return spaces }

BareText
  = text:$( (!EOL !"```" !"{" !"}" !"<!--" .)+ )
  { return text.trim() }


// ───────────────────────────────────────────────────────────────
// Fenced Markdown Blocks
// ───────────────────────────────────────────────────────────────

// ```md ... ``` attaches rich Markdown content to the preceding
// node or declaration.
FencedBlock
  = "```md" _ EOL
    content:$( !([ \t]* "```" EOL) . )*
    _ "```" _ EOL?
  { return { type: "fenced-md", content } }


// ───────────────────────────────────────────────────────────────
// Labels
// ───────────────────────────────────────────────────────────────

Label
  = _ ":" _ text:LabelText
  { return text }

LabelText
  = ResourceLabel
  / InlineText

// Resource labels: @slug, @(path), @(url), @(data:...)
ResourceLabel
  = "@(" uri:$( [^)]+ ) ")"
    { return { type: "resource-uri", uri } }
  / "@" slug:$( [a-zA-Z][a-zA-Z0-9_-]* )
    { return { type: "resource-slug", slug } }

InlineText
  = text:RestOfLine
  { return text }


// ───────────────────────────────────────────────────────────────
// Style Classes
// ───────────────────────────────────────────────────────────────

// Parenthesized, space-separated class tokens.
// Binds to the immediately preceding token (identifier,
// anonymous node literal, or arrow),
// or to the enclosing scope when at the start of a line.
Classes
  = "(" _ tokens:ClassToken+ _ ")"
  { return tokens }

ClassToken
  = token:$( [a-zA-Z][a-zA-Z0-9_-]* ) _
  { return token }


// ───────────────────────────────────────────────────────────────
// Identifiers
// ───────────────────────────────────────────────────────────────

// Must start with a letter or underscore. May contain letters,
// digits, hyphens, and underscores. Dots are NOT part of an
// identifier — they are the cross-scope operator. An arrow ends the
// identifier even without surrounding spaces: B->C is B, ->, C.
Identifier
  = id:$( [a-zA-Z_] (!Arrow [a-zA-Z0-9_-])* )
  { return id }


// ───────────────────────────────────────────────────────────────
// Free Text (slides)
// ───────────────────────────────────────────────────────────────

// Inside slides, non-diagram text is Markdown content.
FreeText
  = !GraphStatementStart text:RestOfLine EOL
  { return { type: "free-text", text } }

// A failed graph statement must not become free text after PEG backtracking.
// Otherwise a missing child endpoint or closing brace appears to parse.
GraphStatementStart
  = (QualifiedIdentifier / AnonymousNode) _ Classes? _ (Arrow / "{")
  / "{"
  / Classes _ "{"


// ───────────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────────

RestOfLine
  = text:$( [^\r\n]+ )
  { return text.trim() }

_  = [ \t]*                     // inline whitespace (no newlines)

EOL
  = Newline / !.                 // end of line or end of input

Newline
  = "\r\n" / "\n" / "\r"
```

The raw grammar file is also available as [`grammar.peg`](https://github.com/drawmotive/textgraph.dev/blob/main/reference/grammar.peg).
