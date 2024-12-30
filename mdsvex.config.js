import autolinkHeadings from 'rehype-autolink-headings'
import slugPlugin from 'rehype-slug'
import relativeImages from 'mdsvex-relative-images'
import remarkHeadings from '@vcarl/remark-headings'

/** @type {import('mdsvex').MdsvexOptions} */
export default {
  extensions: ['.svx', '.md'],
  smartypants: {
    quotes: true,
    ellipses: true,
    backticks: true,
    dashes: 'oldschool'
  },
  remarkPlugins: [relativeImages, headings],
  rehypePlugins: [
    slugPlugin,
    [
      autolinkHeadings,
      {
        behavior: 'wrap'
      }
    ]
  ]
}

/**
 * Parses headings and includes the result in metadata
 */
function headings() {
  return function transformer(tree, vfile) {
    // run remark-headings plugin
    remarkHeadings()(tree, vfile)

    // include the headings data in mdsvex frontmatter
    vfile.data.fm ??= {}
    vfile.data.fm.headings = vfile.data.headings.map((heading) => ({
      ...heading,
      // slugify heading.value
      id: heading.value
        .toLowerCase()
        .replace(/\s/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    }))
  }
}
