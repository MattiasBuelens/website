<script lang="ts">
  import type { PageData } from './$types'
  import { website, name, bio, avatar } from '#lib/info.js'
  import ToC from '#lib/components/ToC.svelte'
  import ArrowLeftIcon from '#lib/components/ArrowLeftIcon.svelte'
  import SocialLinks from '#lib/components/SocialLinks.svelte'
  import { resolve } from '$app/paths'
  import { afterNavigate } from '$app/navigation'
  import PostDate from '#lib/components/PostDate.svelte'

  let { data }: { data: PageData } = $props()

  // generated open-graph image for sharing on social media.
  // see https://og-image.vercel.app/ for more options.
  const ogImage = $derived(getOgImage(data.post.title))

  function getOgImage(title: string): string {
    return `https://og-image.vercel.app/**${encodeURIComponent(
      title
    )}**?theme=light&md=1&fontSize=100px&images=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fhyper-color-logo.svg`
  }

  const url = $derived(`${website}/${data.post.slug}`)

  // marks the end of the post, so the ToC can activate its last entry
  let contentEnd: HTMLElement | undefined = $state()

  // preserve posts navigation if we came from e.g. /posts/2
  let goBackPage: string | undefined = $state(undefined)

  afterNavigate(({ from, shallow }) => {
    if (shallow) return

    if (from?.route.id === '/posts/[[page]]') {
      goBackPage = from.params!.page
    } else {
      goBackPage = undefined
    }
  })
</script>

<svelte:head>
  <title>{data.post.title} - {name}</title>
  <meta name="description" content={data.post.preview.text} />
  <meta name="author" content={name} />

  <!-- Facebook Meta Tags -->
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.post.title} />
  <meta property="og:description" content={data.post.preview.text} />
  <meta property="og:image" content={ogImage} />

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:domain" content={website} />
  <meta property="twitter:url" content={url} />
  <meta name="twitter:title" content={data.post.title} />
  <meta name="twitter:description" content={data.post.preview.text} />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>

<div class="lg:grid-cols-center-2xl mx-auto grid max-w-2xl grid-cols-1 lg:max-w-none">
  <div class="hidden pt-8 lg:block">
    <div class="sticky top-0 flex w-full justify-end pt-11 pr-8">
      <a
        class="group -top-1 -left-16 mb-8 hidden size-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-md ring-1 shadow-zinc-800/5 ring-zinc-900/5 transition lg:flex dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0 dark:ring-white/10 dark:hover:border-zinc-700 dark:hover:ring-white/20 dark:focus-visible:ring-2"
        href={goBackPage ? resolve('/posts/[[page]]', { page: goBackPage }) : resolve('posts')}
        aria-label="Go back to posts"
      >
        <ArrowLeftIcon
          class="size-4 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:stroke-zinc-500 dark:group-hover:stroke-zinc-400"
        />
      </a>
    </div>
  </div>

  <div class="mx-auto w-full overflow-x-hidden">
    <article>
      <header class="flex flex-col">
        <h1
          class="mt-6 text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100"
        >
          {data.post.title}
        </h1>
        <PostDate class="text-sm sm:text-base" post={data.post} decorate collapsed />
      </header>

      <!-- render the post -->
      <div class="prose">
        <data.component />
      </div>
      <div bind:this={contentEnd} aria-hidden="true"></div>
    </article>

    <!-- bio -->
    <hr />
    <div class="py-8">
      <div class="grid gap-8">
        <div class="order-1 col-span-2 flex justify-center gap-6 md:order-2">
          <SocialLinks />
        </div>
        <div class="order-2 flex justify-center md:order-1 md:col-span-2">
          <a href={resolve('/')} class="inline-block rounded-full">
            <img
              src={avatar}
              alt={name}
              class="mx-auto size-24 rounded-full ring-2 ring-zinc-200 md:h-28 md:w-28 dark:ring-zinc-700"
            />
          </a>
        </div>
        <p class="order-3 text-base text-zinc-600 dark:text-zinc-400">
          {bio}
        </p>
      </div>
    </div>
  </div>

  <!-- table of contents -->
  <div class="hidden pt-10 xl:block">
    <aside class="sticky top-8 ml-8 hidden w-48 xl:block" aria-label="Table of Contents">
      <ToC post={data.post} {contentEnd} />
    </aside>
  </div>
</div>
