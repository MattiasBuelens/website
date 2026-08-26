<script lang="ts">
  import type { Snippet } from 'svelte'

  const {
    date,
    href = undefined,
    children
  }: {
    /** Machine-readable date of the event, as an ISO 8601 string. */
    date: string
    /** Optional link to more details about the event. */
    href?: string
    children: Snippet
  } = $props()
</script>

<li class="item">
  {#if href}
    <a class="date" {href}><time datetime={date}>{date}</time></a>
  {:else}
    <time class="date" datetime={date}>{date}</time>
  {/if}
  <div class="event">
    {@render children()}
  </div>
</li>

<style lang="postcss">
  .item {
    --dot-size: calc(var(--spacing) * 3);
    /* Distance from the top of the item to the top of its dot, which lines the
       dot up with the middle of the date above it. */
    --dot-offset: calc((var(--text-sm--line-height) - var(--dot-size)) / 2);
    /* Gap between a dot and the connecting line, both above and below the dot. */
    --dot-gap: calc(var(--spacing) * 1.5);
    --line-width: 2px;

    position: relative;
    margin-block: 0;
    padding: 0 0 calc(var(--spacing) * 7) calc(var(--spacing) * 7);
  }

  .item:last-child {
    padding-bottom: 0;
  }

  /*
    The line connecting this event to the next one. It stops `--dot-gap` short of
    this item's dot, and of the next item's dot which sits `--dot-offset` below
    the end of this item.
  */
  .item:not(:last-child)::before {
    content: '';
    position: absolute;
    top: calc(var(--dot-offset) + var(--dot-size) + var(--dot-gap));
    bottom: calc(var(--dot-gap) - var(--dot-offset));
    left: calc((var(--dot-size) - var(--line-width)) / 2);
    width: var(--line-width);
    border-radius: calc(var(--line-width) / 2);
    background-color: var(--color-zinc-200);
  }

  /* The dot marking this event. */
  .item::after {
    content: '';
    position: absolute;
    top: var(--dot-offset);
    left: 0;
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 9999px;
    background-color: var(--color-teal-500);
  }

  .date {
    display: block;
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
  }

  .event {
    color: var(--color-prose-body);
  }

  /* Content comes from the surrounding Markdown, so it needs `:global()`. */
  .event :global(p) {
    margin-block: 0;
  }

  :global(.dark) .item:not(:last-child)::before {
    background-color: var(--color-zinc-700);
  }

  :global(.dark) .item::after {
    background-color: var(--color-teal-400);
  }

  :global(.dark) .event {
    color: var(--color-prose-body-dark);
  }
</style>
