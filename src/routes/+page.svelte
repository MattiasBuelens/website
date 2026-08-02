<script lang="ts">
  import type { PageData } from './$types'
  import ArrowRightIcon from '$lib/components/ArrowRightIcon.svelte'
  import PostsList from '$lib/components/PostsList.svelte'
  import SocialLinks from '$lib/components/SocialLinks.svelte'
  import { avatar, bio, name } from '$lib/info'

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{name}</title>
  <meta name="description" content={bio} />
</svelte:head>

<div class="flex grow flex-col gap-8 pb-16">
  <!-- bio -->
  <section class="flex flex-col items-center gap-16 pb-16 pt-8">
    <div class="flex w-full flex-col items-center gap-6 rounded-lg">
      <img
        src={avatar}
        alt={name}
        class="mx-auto size-36 rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700"
      />
      <div class="flex gap-6">
        <SocialLinks />
      </div>
      <p class="text-base text-zinc-600 dark:text-zinc-400">
        {bio}
      </p>
    </div>
  </section>
  <section class="w-full">
    <div class="mb-8 flex items-center justify-between gap-4">
      <h2 class="text-sm font-medium text-zinc-500 dark:text-zinc-400 sm:text-base">
        Recently Published
      </h2>
      <a href="/posts" class="flex items-center gap-1 text-sm font-medium text-teal-500"
        >View All <ArrowRightIcon class="size-4" /></a
      >
    </div>
    <PostsList posts={data.posts} />
  </section>
</div>
