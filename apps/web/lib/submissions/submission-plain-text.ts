/** Escape user text for an MDX text node without leaving raw HTML or expressions. */
export const serializeSubmissionMdxText = (value: string): string =>
  value.replace(/\r\n?/g, '\n').replace(/[\\`*_[\]{}()<>#+\-.!|~>=&]/g, '\\$&')
