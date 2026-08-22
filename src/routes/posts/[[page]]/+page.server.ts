import type { EntryGenerator, PageServerLoad } from './$types'
import { posts } from '#lib/data/posts.js'
import { countPages, paginate, rangeTo } from '#lib/util.js'
import { error } from '@sveltejs/kit'

const limit = 10
const numPages = countPages(posts, limit)

export const load: PageServerLoad = async ({ params }) => {
  const page = params.page ? parseInt(params.page, 10) : 1

  const postsForPage = paginate(posts, { limit, page })

  // if page doesn't exist, 404
  if (postsForPage.length === 0 && page > 1) {
    throw error(404, 'Page not found')
  }

  return {
    posts: postsForPage,
    page,
    limit
  }
}

// List all pages for SSR
// https://svelte.dev/docs/kit/page-options#entries
export const entries: EntryGenerator = () => {
  return [
    // /posts/
    { page: undefined },
    // /posts/[[page]]
    ...rangeTo(numPages).map((i) => ({ page: String(i + 1) }))
  ]
}
