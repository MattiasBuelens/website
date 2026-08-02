<script lang="ts">
  import '../app.css'
  import '../prism.css'
  import type { Snippet } from 'svelte'
  import { MoonIcon, SunIcon } from 'heroicons-svelte/24/solid'
  import { browser } from '$app/environment'
  import { resolve } from '$app/paths'
  import { name } from '$lib/info'
  import { page } from '$app/state'

  let { children }: { children: Snippet } = $props()

  let isDarkMode = $state(
    browser ? Boolean(document.documentElement.classList.contains('dark')) : true
  )

  function disableTransitionsTemporarily() {
    document.documentElement.classList.add('**:transition-none!')
    window.setTimeout(() => {
      document.documentElement.classList.remove('**:transition-none!')
    }, 0)
  }
</script>

<div class="flex min-h-screen flex-col">
  <div class="flex w-full grow flex-col px-4 py-2">
    <header class="mx-auto flex w-full max-w-2xl items-center justify-between py-4 lg:pb-8">
      <a
        class="bg-linear-to-r from-teal-500 to-teal-600 bg-clip-text text-lg font-bold text-transparent! sm:text-2xl dark:to-teal-400"
        href={resolve('/')}
      >
        {name}
      </a>

      <button
        type="button"
        role="switch"
        aria-label="Toggle Dark Mode"
        aria-checked={isDarkMode}
        class="size-5 sm:h-8 sm:w-8 sm:p-1"
        onclick={() => {
          isDarkMode = !isDarkMode
          localStorage.setItem('isDarkMode', isDarkMode.toString())

          disableTransitionsTemporarily()

          document.querySelector('html')?.classList.toggle('dark', isDarkMode)
        }}
      >
        <MoonIcon class="hidden text-zinc-500 dark:block" />
        <SunIcon class="block text-zinc-400 dark:hidden" />
      </button>
    </header>
    <main class="mx-auto flex w-full grow flex-col" class:max-w-2xl={!page.data.layout?.fullWidth}>
      {@render children?.()}
    </main>
  </div>
</div>
