<script lang="ts">
  import type { Snippet } from 'svelte'

  const {
    children
  }: {
    children: Snippet
  } = $props()
</script>

<ol class="timeline">
  {@render children()}
</ol>

<style lang="postcss">
  .timeline {
    margin-block: calc(var(--spacing) * 8);
    padding-left: calc(var(--spacing) * 0.5);
    list-style: none;
  }
</style>
