<script lang="ts">
  import { browser } from '$app/environment'
  import { onMount, onDestroy } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import Card from './Card.svelte'
  import type { Post } from '$lib/data/posts'

  let { post }: { post: Post } = $props()

  let elements: HTMLElement[] = []
  let headings = $derived(post.headings)
  let observer: IntersectionObserver | undefined

  onMount(() => {
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(updateVisibleHeadings)
    }
    updateHeadings()
    updateVisibleHeadings([])
  })

  onDestroy(() => {
    observer?.disconnect()
  })

  let visibleHeadings = new SvelteSet<Element>()
  let activeHeadingIndex = $state(0)
  let activeHeading = $derived(headings[activeHeadingIndex])

  function updateHeadings() {
    if (browser) {
      for (const element of elements) {
        observer?.unobserve(element)
      }
      elements = headings.map((heading) => {
        return document.getElementById(heading.id)!
      })
      for (const element of elements) {
        observer?.observe(element)
      }
    }
  }

  function updateVisibleHeadings(entries: readonly IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        visibleHeadings.add(entry.target)
      } else {
        visibleHeadings.delete(entry.target)
      }
    }

    activeHeadingIndex = elements.findIndex((element) => visibleHeadings.has(element))
    if (activeHeadingIndex < 0) {
      const pageHeight = document.body.scrollHeight
      const scrollProgress = (window.scrollY + window.innerHeight) / pageHeight

      if (scrollProgress > 0.5) {
        activeHeadingIndex = headings.length - 1
      } else {
        activeHeadingIndex = 0
      }
    }
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
  }

  /* can't use dark: modifier in @apply */
  :global(.dark) .active {
    @apply text-slate-100;
  }
</style>
