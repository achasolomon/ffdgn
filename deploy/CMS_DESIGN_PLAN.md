# CMS redesign and delivery plan

## Findings

The current CMS has useful record editors, but page editing is limited to six institutional slugs. Public headings, supporting copy, images and calls to action in newer layouts often live in code. Navigation accepts new links but cannot create their destinations. Media uploads and gallery publication are not sufficiently distinct. The console groups tools by implementation rather than the editor's task.

## Target workflow

1. Open **Website pages** and find a page by name or URL.
2. Edit its heading, introduction, metadata and section order.
3. Add a section by type: text, image, video, call to action, cards, table, gallery, live collection or contact form.
4. Choose images from the media library and supply captions and descriptions.
5. Save a draft, preview it, then publish. Drafts do not change public content.
6. Add the published URL to Navigation & footer. New pages require no code.
7. Restore a saved revision when needed. Concurrent edits must not silently overwrite one another.

## Architecture

Use a versioned page document with explicitly validated section types. Existing record managers remain authoritative for events, news, publications and members. Live collection sections read those repositories rather than duplicating records. Store drafts, published snapshots and revisions independently in the existing MySQL content storage; no production migration is required for this first delivery. New pages use a catch-all public route. Existing public routes support the same document renderer while retaining their current layouts until editors publish a replacement.

Page documents contain plain text and structured values, never arbitrary executable HTML. Image and link paths are validated. Editing, previews, publishing and revisions require the existing settings permission. Public rendering reads published snapshots only. Publishing invalidates public caches. A page can be unpublished without deleting its draft or source records.

## UX

Use a searchable page library, a section list, a focused editor and a persistent action bar. Give each control an ordinary-language label. Show draft/published state, unsaved changes, validation feedback and a link to the live page. Page templates provide an initial structure. Reordering, duplicating and hiding sections are first-class actions. Surface existing content tools beside the page library, with explanatory descriptions.

## Content migration and limits

Import existing institutional text into editable starter documents. Provide starter documents for listing pages and live record sections. Preserve original specialized layouts until replacements are explicitly published. A general page builder does not automatically migrate every hardcoded string in those original layouts: editors can replace those layouts with fully authored documents, while the old editors continue to manage their original record fields. Global header/footer and their settings remain separate from individual page sections. Record-detail layouts and transactional forms retain their own data and permission rules.

Do not invent programme details, biographies, photo captions or missing event associations. Display honest empty states; content population needs authoritative material. Production deployment, real editorial sign-off and authenticated usability testing remain separate from local build verification.

## Delivered workspace and local population

**Admin → Website pages** provides page creation, typed sections, media selection, draft previews, publishing, unpublishing, revision recovery and concurrent edit protection. Public pages, navigation, search and both sitemaps accept published authored URLs. Site settings are grouped by editorial purpose; identity and footer copy are editable. Media assets can be assigned to event albums with captions. The media picker supports searching the entire library and loading further results.

The local database now contains drafts populated from all 22 main public pages. `npx tsx scripts/import-website-drafts.ts` imports only missing drafts from a running local preview on port 3100, never overwriting drafts or publishing. The importer preserves public text, images and tables; forms are not copied, and Contact receives a working form section. These are reviewable snapshots, not a lossless conversion of each original layout. Links, image grouping, video embeds and interactive components require editorial review before publication. Snapshot record text does not automatically follow record edits: replace it with a live collection section where appropriate.

Existing layouts still contain some code-defined copy and transactional/detail components. Full migration requires reviewing and publishing authored replacements, and extending section types for any specialized interaction that needs to remain. This delivery does not claim that every original hardcoded string or record-detail layout has been converted. Local content must be transferred through the normal database deployment process to reach production; no production changes have been made.

## Editor quick guide

1. Choose a page, then edit Page details or select a section.
2. Use Add section to select text, image, cards, gallery, table, call to action, live records or contact form. Move sections, duplicate them, or hide them while working.
3. Save draft before opening Preview saved draft. Check copy, images, links and mobile layout.
4. Publish page when ready. This replaces the page's original layout with the authored document.
5. Create additional pages with New page, publish, then add their URLs in Menus & footer.
6. Use Revision history to restore earlier content into the editor, then save or publish. Unpublish restores the original layout for built-in pages and removes newly created URLs from public access.

## Validation

Check document validation, reserved URLs, unsafe links, duplicate sections, publication separation, stale-version conflicts, permission rejection and revision recovery. Run TypeScript, lint and production build. Check desktop/mobile rendering, heading structure and internal links. Verify authenticated editing with a test account when available; do not claim this has been done without credentials.

Completed locally: TypeScript, ESLint, production build, public link/heading checks, schema validation and an authenticated workflow using an isolated temporary account. Browser checks covered 1440px and 390px layouts and adding a table section. Workflow checks covered anonymous rejection, insufficient permissions, private drafts, preview, publishing, stale versions, revision recovery and unpublishing. Temporary test accounts were disabled and sessions revoked; audit evidence was retained. This is technical validation, not a usability study with Secretariat editors.
