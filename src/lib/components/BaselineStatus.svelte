<script lang="ts" module>
  import { browser } from '$app/env'

  if (browser) {
    // baseline-status doesn't work in SSR mode
    await import('baseline-status')
  }
</script>

<script lang="ts">
  let {
    featureId
  }: {
    featureId: string
  } = $props()
</script>

<baseline-status {featureId}></baseline-status>
