// This is an endpoint that generates a basic rss feed for your posts.
// It is OK to delete this file if you don't want an RSS feed.
// credit: https://scottspence.com/posts/make-an-rss-feed-with-sveltekit#add-posts-for-the-rss-feed

import type { RequestHandler } from './$types'
import { posts } from '$lib/data/posts'
import { name, website } from '$lib/info'

export const prerender = true

// update this to something more appropriate for your website
const websiteDescription = `${name}'s blog`
const postsUrl = `${website}/posts`

export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({
    'Cache-Control': `max-age=0, s-max-age=600`,
    'Content-Type': 'application/xml'
  })

  const indent = ' '.repeat(4)
  const xml = `<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
  <channel>
    <title>${name}</title>
    <link>${website}</link>
    <description>${websiteDescription}</description>
    <atom:link href="${website}/rss.xml" rel="self" type="application/rss+xml" />
    ${posts
      .map(
        (post) => `${indent}<item>
      <guid>${postsUrl}/${post.slug}</guid>
      <title>${post.title}</title>
      <description>${post.preview.text}</description>
      <link>${postsUrl}/${post.slug}</link>
      <pubDate>${post.date.toUTCString()}</pubDate>
    </item>`
      )
      .join('\n')}
  </channel>
</rss>`

  return new Response(xml)
}
