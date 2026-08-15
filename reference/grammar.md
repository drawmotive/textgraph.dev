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

## Grammar

```peg
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

TextGraphOpen
  = "@textgraph" (_ ":" _ name:RestOfLine)? EOL

TextGraphClose
  = "@textgraph" EOL

// A document containing at least one slide boundary
SlideDocument
  = slides:Slide+

Slide
  = boundary:SlideBoundary lines:SlideContent*

// A document with no slide boundaries — pure diagram content
DiagramDocument
  = lines:Line+


// ───────────────────────────────────────────────────────────────
// Slide Boundary
// ───────────────────────────────────────────────────────────────

// @slide marks a slide boundary. Unambiguous — no overlap with
// the "--" undirected connection operator.
SlideBoundary
  = "@slide" classes:Classes? label:Label? _ EOL


// ───────────────────────────────────────────────────────────────
// Slide Content
// ───────────────────────────────────────────────────────────────

// Inside a slide, bare text is Markdown. Diagram content must be
// in a scope with a type class (e.g. diagram, mindmap, sequence).
// This constraint is enforced by the semantic layer, not the grammar.
SlideContent
  = !SlideBoundary line:( ScopeBlock / SpeakerNotes / Line )


// ───────────────────────────────────────────────────────────────
// Lines
// ───────────────────────────────────────────────────────────────

Line
  = _ line:(
      BlankLine
    / Comment
    / FencedBlock
    / ScopeBlock
    / Connection
    / MultiNodeDeclaration
    / ScopeLevelStyle
    / SpeakerNotes
    / Declaration
    / MindmapNode
    / FreeText
  )

BlankLine
  = _ EOL


// ───────────────────────────────────────────────────────────────
// Comments
// ───────────────────────────────────────────────────────────────

Comment
  = "<!--" content:$(!"-->" .)* "-->"  _ EOL?


// ───────────────────────────────────────────────────────────────
// Connections
// ───────────────────────────────────────────────────────────────

// A connection line contains at least one arrow operator.
// The line type is "connection" — any trailing `: label` is an
// edge label applied to ALL edges in the chain, not just the last.
Connection
  = head:Node rest:ConnectionSegment+ edgeLabel:EdgeLabel? _ EOL

ConnectionSegment
  = _ arrow:Arrow _ target:Node

Arrow
  = "<->"                            // bidirectional
  / "->"                             // forward
  / "<-"                             // backward
  / "--"                             // undirected

EdgeLabel
  = _ ":" _ text:RestOfLine


// ───────────────────────────────────────────────────────────────
// Nodes (inside connections)
// ───────────────────────────────────────────────────────────────

Node
  = ref:( QualifiedIdentifier / AnonymousNode ) classes:Classes?

QualifiedIdentifier
  = head:Identifier tail:("." Identifier)*

AnonymousNode
  = "[" _ text:AnonymousNodeText _ "]"

AnonymousNodeText
  = text:$( [^\]\r\n]+ )


// ───────────────────────────────────────────────────────────────
// Declarations
// ───────────────────────────────────────────────────────────────

// A declaration line has no arrow. The colon sets a display label.
//   a(fill primary): Agent
//   a: Agent
//   a(fill primary)
Declaration
  = id:Identifier classes:Classes? label:Label? _ EOL

// Multi-node declaration: comma-separated identifiers sharing classes.
// Only style classes are allowed — labels are not valid here.
// To label individual nodes, use separate declaration lines.
//   x, y, z(fill primary)
MultiNodeDeclaration
  = head:Identifier _ "," _
    rest:(Identifier _ "," _)*
    last:Identifier classes:Classes _ EOL


// ───────────────────────────────────────────────────────────────
// Scope-Level Styles
// ───────────────────────────────────────────────────────────────

// Classes at the start of a line with no preceding identifier
// apply to the enclosing scope.
//   (fill primary)
//   (horizontal)
ScopeLevelStyle
  = &"(" classes:Classes label:Label? _ EOL


// ───────────────────────────────────────────────────────────────
// Speaker Notes
// ───────────────────────────────────────────────────────────────

SpeakerNotes
  = "(notes)" _ ":" _ text:( FencedBlock / RestOfLine ) _ EOL?


// ───────────────────────────────────────────────────────────────
// Scope Blocks
// ───────────────────────────────────────────────────────────────

// Named or anonymous scope with curly braces.
//   group1 {}
//   group1(fill primary): Label {}
//   {}
ScopeBlock
  = id:Identifier? classes:Classes? label:Label? _ "{" _ EOL?
    body:ScopeBody
    _ "}" _ EOL?

ScopeBody
  = lines:( !("}" _) Line )*


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
      id:Identifier classes:Classes? label:Label?
    / text:BareText
    ) _ EOL

Indent
  = spaces:[ \t]+

BareText
  = text:$( (!EOL !"```" !"{" !"}" !"<!--" .)+ )


// ───────────────────────────────────────────────────────────────
// Fenced Markdown Blocks
// ───────────────────────────────────────────────────────────────

// ```md ... ``` attaches rich Markdown content to the preceding
// node or declaration.
FencedBlock
  = "```md" _ EOL
    content:$( !([ \t]* "```" EOL) . )*
    _ "```" _ EOL?


// ───────────────────────────────────────────────────────────────
// Labels
// ───────────────────────────────────────────────────────────────

Label
  = _ ":" _ text:LabelText

LabelText
  = ResourceLabel
  / InlineText

// Resource labels: @slug, @(path), @(url), @(data:...)
ResourceLabel
  = "@(" uri:$( [^)]+ ) ")"
  / "@" slug:$( [a-zA-Z][a-zA-Z0-9_-]* )

InlineText
  = text:RestOfLine


// ───────────────────────────────────────────────────────────────
// Style Classes
// ───────────────────────────────────────────────────────────────

// Parenthesized, space-separated class tokens.
// Binds to the immediately preceding token (identifier,
// anonymous node literal, or arrow),
// or to the enclosing scope when at the start of a line.
Classes
  = "(" _ tokens:ClassToken+ _ ")"

ClassToken
  = token:$( [a-zA-Z][a-zA-Z0-9_-]* ) _


// ───────────────────────────────────────────────────────────────
// Identifiers
// ───────────────────────────────────────────────────────────────

// Must start with a letter or underscore. May contain letters,
// digits, hyphens, and underscores. Dots are NOT part of an
// identifier — they are the cross-scope operator.
Identifier
  = id:$( [a-zA-Z_] [a-zA-Z0-9_-]* )


// ───────────────────────────────────────────────────────────────
// Free Text (slides)
// ───────────────────────────────────────────────────────────────

// Inside slides, non-diagram text is Markdown content.
FreeText
  = text:RestOfLine EOL


// ───────────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────────

RestOfLine
  = text:$( [^\r\n]+ )

_  = [ \t]*                     // inline whitespace (no newlines)

EOL
  = "\r\n" / "\n" / "\r" / !.   // end of line or end of input
```

The raw grammar file is also available as [`grammar.peg`](https://github.com/drawmotive/textgraph/blob/main/reference/grammar.peg).
