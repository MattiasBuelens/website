<script lang="ts">
  import { onDestroy } from 'svelte'
  import Card from './Card.svelte'
  import type { Post } from '#lib/data/posts.js'

  let { post, contentEnd }: { post: Post; contentEnd?: HTMLElement } = $props()
  let headings = $derived(post.headings)

  // A heading becomes active once it passes this point in the viewport, given as
  // a fraction of the viewport height. A heading above that line means we're
  // reading its section, so we don't need to observe the sections themselves.
  const activationPoint = 0.15

  // Observers only tell us *when* to recompute, never *what* is active: an
  // observer can miss a crossing entirely when a heading moves past its root
  // between two frames, so accumulating state from the entries alone goes stale.
  // The line observer catches headings crossing the activation line.
  const lineRootMargin = `0px 0px -${(1 - activationPoint) * 100}% 0px`

  // The nearby observer only exists to notice large jumps that skipped the line
  // entirely. Its root is the viewport grown by a full viewport in each
  // direction, so skipping it would take a jump of more than three viewports.
  const nearbyRootMargin = '100% 0px'

  // not reactive on purpose: read and written by the observer callbacks
  let elements: HTMLElement[] = []
  let atContentEnd = false

  let lineObserver: IntersectionObserver | undefined
  let nearbyObserver: IntersectionObserver | undefined
  let endObserver: IntersectionObserver | undefined

  let activeHeadingIndex = $state(0)
  let activeHeading = $derived(headings[activeHeadingIndex])

  $effect(() => {
    lineObserver?.disconnect()
    nearbyObserver?.disconnect()
    lineObserver = new IntersectionObserver(updateActiveHeading, { rootMargin: lineRootMargin })
    nearbyObserver = new IntersectionObserver(updateActiveHeading, { rootMargin: nearbyRootMargin })

    elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element) => element !== null)

    for (const element of elements) {
      lineObserver.observe(element)
      nearbyObserver.observe(element)
    }

    updateActiveHeading()
  })

  $effect(() => {
    endObserver?.disconnect()
    if (!contentEnd) return

    endObserver = new IntersectionObserver(onContentEndVisible)
    endObserver.observe(contentEnd)
  })

  $effect(() => {
    // resizing moves the activation line without necessarily crossing a heading,
    // so no observer would fire on its own
    window.addEventListener('resize', updateActiveHeading)
    // a jump too large even for the nearby observer (dragging the scrollbar, or
    // following a link to a heading) crosses nothing on its way. these fire once
    // per gesture, not once per frame, so they cost nothing while scrolling
    window.addEventListener('scrollend', updateActiveHeading)
    window.addEventListener('hashchange', updateActiveHeading)
    return () => {
      window.removeEventListener('resize', updateActiveHeading)
      window.removeEventListener('scrollend', updateActiveHeading)
      window.removeEventListener('hashchange', updateActiveHeading)
    }
  })

  onDestroy(() => {
    lineObserver?.disconnect()
    nearbyObserver?.disconnect()
    endObserver?.disconnect()
  })

  function onContentEndVisible(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      atContentEnd = entry.isIntersecting
    }
    updateActiveHeading()
  }

  function updateActiveHeading() {
    if (elements.length === 0) return

    // once the end of the post is on screen we're in the final section, even if
    // it's too short for its heading to ever reach the activation line
    if (atContentEnd) {
      activeHeadingIndex = elements.length - 1
      return
    }

    // the last heading past the line, or the first one while we're above it
    const line = window.innerHeight * activationPoint
    let index = 0
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].getBoundingClientRect().top > line) break
      index = i
    }
    activeHeadingIndex = index
  }
</script>

<Card>
  {#snippet description()}
    <ul class="flex flex-col gap-2">
      {#each headings as heading (heading.id)}
        <li
          class="heading border-teal-500 pl-2 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-zinc-100"
          class:active={activeHeading === heading}
          style={`--depth: ${
            // consider h1 and h2 at the same depth, as h1 will only be used for page title
            Math.max(0, heading.depth - 1)
          }`}
        >
          <a href={`#${heading.id}`}>{heading.value}</a>
        </li>
      {/each}
    </ul>
  {/snippet}
</Card>

<style lang="postcss">
  @reference "../../app.css";

  .heading {
    padding-left: calc(var(--depth, 0) * 0.35rem);
  }

  .active {
    @apply ml-[-2px] border-l-2 font-medium text-slate-900;

    /* can't use dark: modifier in @apply */
    @variant dark {
      @apply text-slate-100;
    }
  }
</style>
