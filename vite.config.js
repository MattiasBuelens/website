import { mdsvex } from 'mdsvex'
import mdsvexConfig from './mdsvex.config.js'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapterStatic from '@sveltejs/adapter-static'
import adapterCloudflare from '@sveltejs/adapter-cloudflare'
import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    sveltekit({
      extensions: ['.svelte', ...mdsvexConfig.extensions],
      // Consult https://github.com/sveltejs/svelte-preprocess
      // for more information about preprocessors
      preprocess: [vitePreprocess(), mdsvex(mdsvexConfig)],

      adapter:
        process.env.ADAPTER === 'cloudflare'
          ? adapterCloudflare({ fallback: 'plaintext' })
          : adapterStatic({ fallback: '404.html' }),

      // remove this if you don't want prerendering
      prerender: { entries: ['*', '/sitemap.xml', '/rss.xml'] }
    }),
    tailwindcss()
  ],
  // allows vite access to ./posts
  server: {
    fs: {
      allow: ['./']
    }
  }
})
