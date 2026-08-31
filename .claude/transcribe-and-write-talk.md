# Handoff: writing up a Demuxed talk as a blog post

Context for a future Claude session picking up a new talk write-up (e.g. the Demuxed 2025 talk,
"VHS for the streaming era: record and replay for HLS") on `MattiasBuelens/website`. This distills
what worked, and what broke, while writing up `posts/talk-reverse-video/`.

## Repo conventions

- Site: SvelteKit + mdsvex. Posts live in `posts/<slug>/index.md` (+ `transcript.md` and assets
  alongside). `posts/talk-baby-video/` and `posts/talk-reverse-video/` are the reference examples for
  structure and prose style — read `talk-baby-video/index.md` first, it's the cleanest example of the
  house style (prose + real code samples + `<figure>`/`<figcaption>` images, sentence-case headings,
  reference-style links collected at the end of the file).
- Git identity: commits should be authored as the user (`Mattias Buelens <mattias@buelens.com>`, matches
  existing repo history), with a `Co-Authored-By: Claude <...>` trailer, done via
  `git commit --author="Mattias Buelens <mattias@buelens.com>" -m "..." -m "Co-Authored-By: ..."`.
- Branch: one feature branch per talk (e.g. `talk-reverse-video`); pull before every edit (the user
  pushes their own tweaks directly to the same branch throughout — rebase/fast-forward, don't clobber).
- PR: open as **draft** early once there's something worth previewing (Cloudflare Pages builds a preview
  from any push to the branch). Move to ready-for-review and refresh the description only once asked.
- After *every* content change: `npm run build` (confirms assets/links/SVGs actually resolve — see
  "gotchas" below for why this matters more than it sounds), `npm run check` (expect exactly one
  pre-existing unrelated error, `BaselineStatus.svelte` missing types — anything else is yours to fix),
  `npx prettier --write <file>`, then commit + push. `npm install` only needs to run once per session
  (checks whether `node_modules` exists first).
- Push with retry/backoff (2s, 4s, 8s, 16s) per the environment's standing instructions.

## Workflow that worked well

1. **Transcript first.** Clean up the auto-generated transcript using the speaker's own PDF speaker
   notes as ground truth, in the house prose style (not a bullet-point outline — full paragraphs,
   backticked API names, italic stage directions for non-verbal bits). Flag anything the ASR garbled
   that the notes don't resolve, rather than guessing — the user would rather answer a question than
   have you invent a plausible-sounding line.
   - **Copyright gate**: don't fetch/transcribe a talk from a bare YouTube URL — that's reproducing a
     third party's copyrighted recording. Only proceed once it's established as the user's own talk
     (they hand you their own downloaded auto-caption export, speaker notes, or slides directly). If
     asked to "write the transcript" from just a link with no other context, say no and offer to
     summarize instead, or ask for the user's own transcript file.
2. **Outline, then one section per request.** Propose an outline mirroring the talk's own slide
   structure before writing prose. After that, the user asks for "the next section" one at a time —
   don't get ahead of them, and always write a transition sentence tying off exactly where the previous
   section left the reader (they'll call this out if it's missing).
3. **Ground every code sample in the real repo**, don't invent pseudocode. Clone the project repo
   read-only (`GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 <url> /home/user/<owner>/<repo>` via `add_repo`
   + manual clone), find the actual function, and link to it pinned to an exact commit SHA and line
   range: `.../blob/<sha>/path/to/file.ts#L123-L456`. Verify the line range is exactly right (off-by-a-
   few looks sloppy). If the user says a code detail is wrong (e.g. "that flag isn't legacy cruft, I put
   it there on purpose"), fix the framing, don't just delete the detail.
   - Check for multiple branches (`git ls-remote --heads`) — there may be an abandoned prototype branch
     that looks relevant but isn't what was actually presented. Ask before assuming a branch is canonical
     if it's not obviously `main`.
4. **Diagrams from slides → hand-built SVG**, not extracted vector data. Read the speaker-notes PDF's
   slide images (`Read` tool, `pages` param, in batches), recreate the diagram faithfully as inline SVG
   matching the existing convention in `posts/talk-baby-video/quality-switching.svg` (plain `<svg>` file,
   `<style>` block, `@media (prefers-color-scheme: dark)` override, referenced via markdown
   `![alt](./file.svg)`).
   - **This dark-mode override only follows the OS-level preference, not the site's manual dark-mode
     toggle** (which sets a `.dark` class on `<html>`, independent of `prefers-color-scheme`) — because
     the SVG is loaded via `<img>`, it's rendered in its own document with no access to the page's DOM.
     The site now sets explicit `color-scheme` via Tailwind (`scheme-light dark:scheme-dark` on `<html>`
     in `app.html`, done once, don't redo it), which lets a same-origin `<img>`-embedded SVG's
     `prefers-color-scheme` query follow the toggle instead of the OS setting — but only in
     Chromium/Firefox; Safari doesn't propagate this yet (tracked in
     [web-platform-tests/interop#1058](https://github.com/web-platform-tests/interop/issues/1058)). This
     is a known, accepted gap, not a bug to "fix" per-diagram — don't rebuild diagrams as inline SVG or
     Svelte components chasing full cross-browser parity unless the user asks for it specifically.
     Render it yourself before committing — headless Chromium is at
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome --headless --disable-gpu --no-sandbox
   --screenshot=out.png --window-size=WxH file:///path.html`; use
   `--blink-settings=preferredColorScheme=2` to check the dark-mode branch renders too, then `Read` the
   PNG to actually look at it. Don't skip this — arrow alignment and vertical clipping bugs both slipped
   through until an actual render caught them.
5. **Video/image assets**: the user drops in files (screen recordings, GIFs, MDN screenshots) partway
   through and tells you which section each belongs to — don't guess placement from filenames alone if
   there's real ambiguity between two similarly-named clips; ask (`AskUserQuestion`) rather than guess
   twice. `.mp4`/`.mkv` are Git-LFS-tracked (`.gitattributes` at repo root) and arrive as LFS pointer
   stubs in this environment (no `git lfs` installed) — you cannot preview actual video content, only
   trust the filename/size/user's description.
6. **Final pass**: after the outline is complete, re-read the whole file end to end looking for drift
   between early and late sections (a detail corrected in section 3 that's still wrong in section 6),
   fabricated API names that crept into "real code" snippets, and quote-style consistency.

## Gotchas that actually bit us

- **Markdown reference-link definitions need a blank line before them**, or mdsvex silently fails to
  parse the whole block and dumps it as literal text on the page — every `[text][label]` link in the
  post breaks at once with no error, only visible by inspecting the rendered HTML. This happened after
  deleting a paragraph + its link definition and accidentally merging the blank line away. **After any
  edit near the end-of-file reference block, rebuild and grep the rendered HTML for `\[[^]]+\]\[[a-z-]+\]`
  (an unresolved reference) before pushing.**
- **A literal `"` character inside `![alt text]()` breaks the build outright** (the generator emits
  `alt="...unescaped quote..."` and produces invalid HTML that fails to compile). Use curly quotes
  (`“`/`”`) in alt text instead of nested straight quotes.
- `developer.mozilla.org` and `*.pages.dev` are blocked by this environment's egress proxy —
  `WebFetch` fails with `EGRESS_BLOCKED`. GitHub is generally reachable. If you need MDN content, ask the
  user for a PDF export or screenshot rather than assuming you can fetch it.
- A "Print to PDF" export of a webpage often has **no text or hyperlink layer at all** —
  `pdftotext`/`pdftohtml` return nothing, and the Read tool falls back to page images. Don't invent
  URLs for links you can see rendered in the image but can't extract programmatically; either skip them
  or point to a durable URL you're independently confident about.
- `poppler-utils` (for `pdftotext`/`pdfinfo`) may need `apt-get install -y poppler-utils` before it's
  available for reading speaker-notes PDFs page-by-page. If the `Read` tool's own PDF rendering fails
  (e.g. `pdftoppm is not installed`), fall back to `pdftotext -layout <pdf> <out>.txt` + `Read` the text
  file — works fine for text-only speaker notes, just loses any diagrams/images in the PDF.
- **`import.meta.glob('/posts/**/*.md', ...)` in `src/lib/data/posts.ts` picks up *every* `.md` file
  under a post directory as its own "post"**, not just the real post file. A companion file like
  `transcript.md` (imported as a component via `<Transcript />`, not meant to be a post itself) has no
  `date` frontmatter, so it gets `new Date(undefined)` → an Invalid Date, which throws
  `RangeError: Invalid time value` the moment anything calls `.toISOString()` on it (e.g. `PostDate.svelte`)
  — and it looks exactly like a frontmatter typo in the *real* post's `date` field, which it isn't. Fixed
  once, for good: the glob is now `['/posts/*.md', '/posts/*/index.md']`, which only matches the two
  actually-supported post shapes. If you add another companion `.md` file to a post directory, it's
  covered by this fix already — no need to redo it, but it's worth knowing why if something like this
  resurfaces.
- **A one-line `<figcaption>text</figcaption>` (or similar block HTML with Markdown inside, e.g. code
  spans) doesn't get its content Markdown-parsed** — mdsvex/CommonMark treats a same-line open+content+close
  as a raw HTML block and passes the content through verbatim, so backticks stay literal backticks
  instead of becoming `<code>`. Split it onto three lines instead: opening tag, blank line, content,
  blank line, closing tag (matches how `<figcaption>` is used elsewhere in `talk-baby-video/index.md`).
  Same underlying CommonMark rule as the reference-link blank-line gotcha above, just a different symptom.
- **PR titles/descriptions need the same escaping as post prose** — a bare `<video>` (or other
  HTML-tag-shaped token) in a `gh pr create --body` string gets interpreted as a real tag by GitHub's
  renderer and disappears from the rendered description. Wrap it in a code span there too.
- **Double-check the actual repo name before sharing a PR link.** `git remote -v` can still show a
  stale/renamed URL (e.g. `origin` pointed at `.../site.git` while the repo had actually been renamed to
  `.../website` on GitHub, and the PR came back under the new name) — flag the mismatch to the user
  rather than assuming the remote URL is current.

## Style notes specific to these talk posts

- Headings: sentence case, including after a colon (`## Step 2: decoding in reverse`, not `Step 2:
  Decoding In Reverse`).
- Images and hand-built diagrams get `<figure>`/`<figcaption>`; standalone demo `<video>` elements are
  left bare (no figure wrapper) with a plain sentence of context before/after — that's the established
  split in this post, not a hard site-wide rule, but stay consistent within one post.
- Muted `autoplay loop` for short background-loop clips illustrating a concept inline (no controls
  needed); `controls` (+ `muted` if the clip has no relevant audio yet) for the "watch this demo" payoff
  moments.
- Add a content warning above any clip with flashing/strobing content.
- Non-breaking hyphens (U+2011, `‑`) in compound terms that souldn't line-wrap awkwardly, e.g.
  "P‑frames"/"B‑frames".
- Cross-section anchor references use the lowercase link text + heading anchor:
  `[step 2](#step-2-decoding-in-reverse)`.
- Keep reference-style link definitions (`[label]: url`) collected at the very end of the file, one
  contiguous block, no blank lines *within* the block (Prettier will normalize this on save, but don't
  introduce a stray blank line splitting it in two).
- The user prefers a colon over an em dash as the default way to introduce a clause or explanation in
  prose. Treat it as a default, not an absolute rule: they've kept an em dash in their own edit after
  being offered the colon swap, when it read better there — suggest the swap, don't insist on it or
  re-flag a spot once they've made a deliberate call.
- Code samples should stay at the same simplified, illustrative level throughout a post (e.g. no
  prefetch queues, no promise/`Deferred` plumbing, no low/high-watermark buffering) even once you've
  grounded them in the real repo's naming — match the talk's own narrative complexity, not the
  production implementation's. Rename identifiers to the real API (method names, field names, return
  shapes) so the samples aren't fictional, but don't import the full complexity just because the real
  code has it; that's a judgment call worth surfacing to the user rather than silently deciding either way
  if a section's code sample would need to grow substantially to stay accurate.
