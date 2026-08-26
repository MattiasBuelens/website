import { browser } from '$app/env'
import { render } from 'svelte/server'
import { parse } from 'node-html-parser'
import readingTime from 'reading-time'
import type { Component } from 'svelte'

// we require some server-side APIs to parse all metadata
if (browser) {
  throw new Error(`posts can only be imported server-side`)
}

interface MarkdownHeading {
  id: string
  depth: number
  value: string
}

interface PostMetadata {
  headings: readonly MarkdownHeading[]
  title: string
  date: string
  updated?: string
  preview?: string
}

interface PostMarkdown {
  default: Component
  metadata: PostMetadata
}

interface SinglePost extends Omit<PostMetadata, 'date' | 'updated' | 'preview'> {
  headings: readonly MarkdownHeading[]
  slug: string
  isIndexFile: boolean
  date: Date
  updated?: Date
  preview: {
    html?: string
    text?: string
  }
  readingTime: string
}

export interface Post extends SinglePost {
  next: SinglePost | undefined
  previous: SinglePost | undefined
}

// Get all posts and add metadata
export const posts: Post[] = Object.entries(
  import.meta.glob<PostMarkdown>(['/posts/*.md', '/posts/*/index.md'], { eager: true })
)
  .map(([filepath, post]): SinglePost => {
    const body = parse(render(post.default).body)

    const preview = post.metadata.preview ? parse(post.metadata.preview) : body.querySelector('p')

    // exclude <details> elements (e.g. video transcripts) from the reading time estimate
    for (const details of body.querySelectorAll('details')) {
      details.remove()
    }

    return {
      ...post.metadata,

      // generate the slug from the file path
      slug: filepath
        .replace(/(\/index)?\.md/, '')
        .split('/')
        .pop()!,

      // whether or not this file is `my-post.md` or `my-post/index.md`
      // (needed to do correct dynamic import in posts/[slug].svelte)
      isIndexFile: filepath.endsWith('/index.md'),

      date: new Date(post.metadata.date),
      updated: post.metadata.updated ? new Date(post.metadata.updated) : undefined,

      preview: {
        html: preview?.toString(),
        // text-only preview (i.e no html elements), used for SEO
        text: preview?.structuredText ?? preview?.toString()
      },

      // get estimated reading time for the post
      readingTime: readingTime(body.structuredText).text
    }
  }) // sort by date
  .sort((a, b) => b.date.getTime() - a.date.getTime()) // add references to the next/previous post
  .map((post, index, allPosts) => ({
    ...post,
    next: allPosts[index - 1],
    previous: allPosts[index + 1]
  }))
