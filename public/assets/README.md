# FFDGN Asset Library

Drop images/videos into these folders, then run **`npm run assets:sync`**.
The sync catalogues every file into the media library and auto-wires covers:

| Folder | What goes here | Spec | Auto-wires to |
|---|---|---|---|
| `hero/` | Homepage hero visual (1 file) | 1600×900 JPG/WebP | Hero background |
| `leadership/` | One portrait per leader, named by slug: `atim-tyonongu.jpg` | 800×800 JPG/WebP | Member profile + homepage cards |
| `events/` | Conference covers, named by slug: `national-conference-2026.jpg` + extra gallery shots | Cover 1280×720; gallery 1600×1066 | Event page cover + gallery |
| `news/` | Article images, named by slug: `state-federal-collaboration-call.jpg` | 1280×720 JPG/WebP | News detail + thumbnails |
| `partnerships/` | Partner logos, named by slug: `polish-nigeria-business-council.png` | PNG with transparency, ≤800px wide | Partnership profiles |
| `gallery/` | Loose conference photography (any name) | 1600×1066 JPG/WebP | Photo gallery |
| `videos/` | MP4/WebM files (any name) | MP4 H.264 ≤200MB | Video archive |
| `brand/` | Seal, wordmark, favicon (managed, do not rename) | SVG/PNG | Header/footer |

## Naming rule

**Filename (without extension) = record slug.** Slugs use lowercase + hyphens:
`hafsat-balewa.jpg`, `national-conference-2025.jpg`. Anything that doesn't match a
slug is still catalogued and appears in the photo gallery.

## Specs

- Formats: JPG / PNG / WebP / SVG (photos), MP4 / WebM (video)
- Keep photos under ~500 KB (export "web quality"); the site lazy-loads below the fold
- Portrait orientation for `leadership/`; landscape everywhere else
- Alt text defaults to the record title — refine it in `/admin/media` after syncing
