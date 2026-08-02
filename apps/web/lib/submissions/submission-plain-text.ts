/** Escape user text so CommonMark, GFM, and MDX parse it only as literal text. */
export const serializeSubmissionMetadata = (value: string): string =>
  value.replace(/\r\n?/g, '\n').replace(/[\\`*_[\]{}()<>#+\-.!|~>=]/g, '\\$&')

/** Escape user text for an MDX text node without leaving raw HTML or expressions. */
export const serializeSubmissionMdxText = (value: string): string =>
  serializeSubmissionMetadata(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;')
