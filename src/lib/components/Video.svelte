<script lang="ts">
  import type { SvelteHTMLElements } from 'svelte/elements'
  import 'youtube-video-element'
  import 'player.style/minimal'
  let {
    id,
    src,
    title = '',
    controls = true,
    playsinline = true,
    ...rest
  }: SvelteHTMLElements['video'] & {
    as?: string
    src: string
  } = $props()

  const isYoutube = $derived(src.startsWith('https://www.youtube.com/'))
</script>

{#if isYoutube}
  <youtube-video
    class="not-prose aspect-video w-full"
    {id}
    {src}
    {title}
    {controls}
    {playsinline}
    {...rest}
  ></youtube-video>
{:else if controls}
  <media-theme-minimal class="not-prose aspect-video w-full" {id} {title}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video slot="media" crossorigin="anonymous" {playsinline} {src} {...rest}></video>
  </media-theme-minimal>
{:else}
  <!-- svelte-ignore a11y_media_has_caption -->
  <video
    class="not-prose aspect-video w-full"
    crossorigin="anonymous"
    {playsinline}
    {id}
    {src}
    {title}
    {...rest}
  ></video>
{/if}

<style lang="postcss">
  media-theme-minimal {
    --media-accent-color: var(--color-teal-500);
  }
</style>
