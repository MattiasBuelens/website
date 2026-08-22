<script lang="ts">
  import type { PageData } from './$types'
  import { name } from '#lib/info.js'
  import ArrowLeftIcon from '#lib/components/ArrowLeftIcon.svelte'
  import ArrowRightIcon from '#lib/components/ArrowRightIcon.svelte'
  import PostsList from '#lib/components/PostsList.svelte'
  import { resolve } from '$app/paths'

  let { data }: { data: PageData } = $props()

  let isFirstPage = $derived(data.page === 1)
  let hasNextPage = $derived(data.posts[data.posts.length - 1]?.previous)
</script>

<svelte:head>
  <title>{name} | Posts</title>
</svelte:head>

<div class="flex grow flex-col">
  <header class="pt-4">
    <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
  </header>

  <div class="mt-16 sm:mt-20">
    <PostsList posts={data.posts} />
  </div>

  <!-- pagination -->
  <div class="flex items-center justify-between pt-16 pb-8">
    {#if !isFirstPage}
      <a
        href={resolve('/posts/[[page]]', { page: String(data.page - 1) })}
        data-sveltekit-preload-data="hover"
      >
        <ArrowLeftIcon class="size-4" />
        Previous
      </a>
    {:else}
      <div></div>
    {/if}

    {#if hasNextPage}
      <a
        href={resolve('/posts/[[page]]', { page: String(data.page + 1) })}
        data-sveltekit-preload-data="hover"
        >Next
        <ArrowRightIcon class="size-4" />
      </a>
    {/if}
  </div>
</div>

<style lang="postcss">
  @reference "../../../app.css";

  a {
    @apply flex items-center gap-2 font-medium text-zinc-700;

    /* can't use dark: modifier in @apply */
    @variant dark {
      @apply text-zinc-300;
    }
  }
</style>
