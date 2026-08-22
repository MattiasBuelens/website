<script lang="ts">
  import Card from './Card.svelte'
  import ArrowRightIcon from './ArrowRightIcon.svelte'
  import type { Snippet } from 'svelte'
  import type { Post } from '#lib/data/posts.js'
  import { resolve } from '$app/paths'

  let { post, eyebrow: _eyebrow }: { post: Post; eyebrow: Snippet } = $props()
</script>

<Card href={resolve('/post/[slug]', { slug: post.slug })}>
  {#snippet eyebrow()}
    {@render _eyebrow?.()}
  {/snippet}
  {#snippet title()}
    {post.title}
  {/snippet}
  {#snippet description()}
    <div class="prose">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html post.preview.html}
    </div>
  {/snippet}
  {#snippet actions()}
    <div>
      <div class="flex items-center text-teal-500">
        <span class="text-sm font-medium">Read</span>
        <ArrowRightIcon class="ml-1 size-4" />
      </div>
    </div>
  {/snippet}
</Card>

<style lang="postcss">
  .prose > :global(p) {
    margin-top: 0;
    margin-bottom: 0;
  }
</style>
