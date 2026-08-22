import type { PageServerLoad } from './$types'
import { posts } from '#lib/data/posts.js'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params

  // get post with metadata
  const post = posts.find((post) => slug === post.slug)

  if (!post) {
    throw error(404, 'Post not found')
  }

  return {
    post
  }
}
