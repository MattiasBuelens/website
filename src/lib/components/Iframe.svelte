<script lang="ts">
  import type { SvelteHTMLElements } from 'svelte/elements'
  let {
    src,
    title = '',
    allowfullscreen = true,
    ...rest
  }: SvelteHTMLElements['iframe'] & {
    src: string
  } = $props()
</script>

<iframe
  class="not-prose aspect-video w-full"
  {src}
  {title}
  frameborder="0"
  {allowfullscreen}
  {...rest}
></iframe>
