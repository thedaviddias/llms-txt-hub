import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeSanitize from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import rehypeRaw from "rehype-raw"

const websitesDirectory = path.join(process.cwd(), "content", "websites")

export interface WebsiteMetadata {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  category?: string
  lastUpdated: string
  score: number
  favorites: number
}

export async function getAllWebsites(): Promise<WebsiteMetadata[]> {
  console.log("Attempting to read websites from:", websitesDirectory)

  if (!fs.existsSync(websitesDirectory)) {
    console.error("Websites directory does not exist:", websitesDirectory)
    return []
  }

  const fileNames = fs.readdirSync(websitesDirectory)
  console.log("Files found in websites directory:", fileNames)

  if (fileNames.length === 0) {
    console.warn("No website files found in directory")
    return []
  }

  const websites = fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "")
      const fullPath = path.join(websitesDirectory, fileName)
      console.log("Reading file:", fullPath)

      const fileContents = fs.readFileSync(fullPath, "utf8")
      const { data } = matter(fileContents)

      console.log("Parsed website data:", { slug, ...data })

      return {
        slug,
        ...data,
      } as WebsiteMetadata
    })

  console.log("Total websites parsed:", websites.length)
  return websites
}

export async function getWebsiteBySlug(slug: string) {
  const fullPath = path.join(websitesDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, "utf8")
  const { data, content } = matter(fileContents)

  // Remove the first heading that matches the project name
  const lines = content.split("\n")
  const filteredLines = lines.filter((line) => {
    // Skip any line that is an h1 heading containing the project name
    const isH1WithProjectName = line.trim().match(new RegExp(`^#\\s+${data.name}\\s*$`))
    return !isH1WithProjectName
  })
  const contentWithoutTitle = filteredLines.join("\n")

  // Process markdown content
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(contentWithoutTitle)

  const htmlContent = processedContent.toString()

  const allWebsites = await getAllWebsites()
  const currentIndex = allWebsites.findIndex((website) => website.slug === slug)
  const previousProject = currentIndex > 0 ? allWebsites[currentIndex - 1] : null
  const nextProject = currentIndex < allWebsites.length - 1 ? allWebsites[currentIndex + 1] : null
  const relatedProjects = allWebsites
    .filter((website) => website.category === data.category && website.slug !== slug)
    .slice(0, 4)

  return {
    ...data,
    slug,
    content: htmlContent,
    relatedProjects,
    previousProject,
    nextProject,
  }
}

