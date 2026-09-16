# Google Analytics measurement

The production site uses GA4 tag **G-F3QNCLEDBC**. Local development, preview hosts,
and localhost tests do not load the tag. Installation is in the VitePress theme;
do not also paste a second tag into the HTML head.

## Property setup before deployment

In GA Admin → Data streams → the TextGraph web stream:

1. Turn **Enhanced measurement off**, including its advanced **Page changes based
   on browser history events** setting. The site emits page views itself. Google's
   documentation says disabling initial page views in code does not suppress
   enhanced-measurement history events. Editor source updates must not count as visits.
2. Under Google tag settings, disable automatic event detection and keep **Allow
   user-provided data capabilities** off. Explicit events cover the desired actions;
   automatic link/form/search collection can collect data outside the safe schema.
3. Mark **homepage_activated** as the primary key event, counting **Once per session**.
   Optionally mark **diagram_created** as the broader product key event with the
   same counting method.
4. Add event-scoped custom dimensions as needed: **homepage_version**,
   **homepage_seen**, **entry_point**, **example_id**, **cta_location**, **action_type**,
   **current_preview**, **integration**, and **error_category**.

Code cannot inspect or change these property settings. This commit does not deploy
the site or configure the property.

## Events

| Event | Meaning |
| --- | --- |
| page_view | Initial load or SPA pathname change; query/hash edits do not count. |
| homepage_viewed | Homepage seen, once per local journey. |
| example_opened | Same-tab homepage click leading to the playground, with CTA placement and an allowlisted example ID. |
| playground_opened | Playground visited; attribution requires an observed click, not a URL parameter. |
| preview_ready | First successful current render for the mounted playground; not activation. |
| diagram_created | User input differs from the starting/restored source after trimming surrounding whitespace and successfully renders. |
| homepage_activated | That successful editing behavior after a homepage visit in this local journey. |
| diagram_action | Successful copy_link/copy_image clipboard operation, or initiated download_png. |
| integration_opened | Same-tab click to an allowlisted integration guide. |
| render_failed | Error category changes within an error episode, reset by success; runtime/source without diagnostic text. |

The **current_preview** dimension distinguishes current results from source links
copied before rendering or exports of retained old images. Copying a link does not
prove someone received it; initiating a download does not prove it was saved.
A source edit is a useful activation proxy, not proof of a semantically useful diagram.

Local deduplication and attribution use sessionStorage and expire after 30 minutes
without recorded activity. Only categorical flags are stored, not source or user
identifiers. This survives reloads but is tab-local. New tabs, blocked storage,
and GA session boundaries can differ: use **GA session counts**, not raw event
counts, for rates. Copied query parameters never supply homepage attribution.
Modified/new-tab clicks are not assigned same-tab CTA attribution.

## Reports

Create a closed Funnel exploration with indirectly followed steps:

1. homepage_viewed
2. playground_opened
3. preview_ready
4. homepage_activated
5. diagram_action with current_preview = true

Constrain the journey to homepage sessions; the last step is optional evidence of
usefulness. Funnel exploration counts users, so do not label its percentage a
session rate. For the primary **homepage activation rate**, compare sessions
containing homepage_activated with sessions containing a homepage page_view
(page path /) in a session-based report or exploration. GA's property-wide session
key-event rate includes all sessions and has a different denominator.

Break down by device, homepage_version, entry_point, and example_id. The initial
homepage version is **original**; change it when a new design ships. Future
example links can use the data-analytics-example HTML attribute with an entry
from the examples allowlist in .vitepress/analytics.mjs. Unknown IDs fall back to
default; source is never used to infer an ID.

Compare counts alongside rates. At low traffic, observed usability sessions are
more informative than small percentage changes. Ad blockers mean GA describes
measured traffic rather than a complete census.

## Data boundary and verification

Page locations/referrers omit queries and fragments. Safe global page defaults
are set before tag initialization and on every manual event. Titles are fixed,
advertising signals/personalization are disabled, and event strings are
allowlisted. The site's events never include source, node labels, clipboard
contents, full shared URLs, or diagnostic messages. Standard GA analytics cookies
and automatic session/engagement collection remain; this is not cookieless analytics.

Unit tests cover safe parameters, attribution, inactivity, activation, and blocked
storage. Browser tests serve the production build under its production hostname
while intercepting Google traffic. They exercise the real editor without sending
test events to the property.

After property setup and deployment, verify a real journey in Realtime/DebugView.
Confirm one page view per navigation, none for source hash edits, and inspect
outgoing payloads for source/query leakage. Property-side collection and reporting
cannot be verified by local intercepted tests.

References: [Manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views),
[gtag configuration](https://developers.google.com/tag-platform/gtagjs/configure),
[parameter precedence](https://developers.google.com/tag-platform/gtagjs/reference),
[enhanced measurement](https://support.google.com/analytics/answer/9216061),
[Google tag settings](https://support.google.com/analytics/answer/12131703).
