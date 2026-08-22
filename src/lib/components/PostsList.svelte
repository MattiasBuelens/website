<script lang="ts">
  import PostPreview from '#lib/components/PostPreview.svelte'
  import PostDate from '#lib/components/PostDate.svelte'
  import type { Post } from '#lib/data/posts.js'

  let { posts }: { posts: readonly Post[] } = $props()
</script>

<div class="flex flex-col gap-16 md:border-l md:border-zinc-100 md:pl-6 md:dark:border-zinc-700/40">
  {#each posts as post (post.slug)}
    <article class="grid grid-cols-4 items-start gap-8">
      <PostDate class="hidden flex-col text-sm md:flex" {post} />

      <div class="col-span-4 md:col-span-3">
        <PostPreview {post}>
          {#snippet eyebrow()}
            <PostDate class="md:hidden" {post} collapsed decorate />
          {/snippet}
        </PostPreview>
      </div>
    </article>
  {/each}
</div>
