<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { SvelteHTMLElements } from 'svelte/elements'
  let {
    as = 'div',
    href = undefined,
    class: _class = undefined,
    eyebrow,
    title,
    description,
    actions,
    ...rest
  }: Omit<SvelteHTMLElements['div'], 'title'> & {
    as?: string
    href?: string
    class?: string
    eyebrow?: Snippet
    title?: Snippet
    description?: Snippet
    actions?: Snippet
  } = $props()
</script>

<svelte:element
  this={as}
  class={['group relative flex flex-col items-start', _class].join(' ')}
  {...rest}
>
  {@render eyebrow?.()}

  {#if title}
    <div class="text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
      {#if href}
        <div
          class="absolute -inset-x-4 -inset-y-6 z-0 scale-95 bg-zinc-50 opacity-0 transition group-hover:scale-100 group-hover:opacity-100 sm:-inset-x-6 sm:rounded-2xl dark:bg-zinc-800/50"
        ></div>
        <a {href} data-sveltekit-preload-data="hover">
          <span class="absolute -inset-x-4 -inset-y-6 z-20 sm:-inset-x-6 sm:rounded-2xl"></span>
          <span class="relative z-10">
            {@render title?.()}
          </span>
        </a>
      {:else}
        {@render title?.()}
      {/if}
    </div>
  {/if}

  {#if description}
    <div class="relative z-10 flex-1 text-sm text-zinc-600 dark:text-zinc-400" class:mt-2={!!title}>
      {@render description?.()}
    </div>
  {/if}

  {#if actions}
    <div aria-hidden="true" class="relative z-10 mt-4 flex items-center">
      {@render actions?.()}
    </div>
  {/if}
</svelte:element>
