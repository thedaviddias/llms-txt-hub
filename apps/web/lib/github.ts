import { Octokit } from "@octokit/rest"

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is not set")
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

export interface GitHubProject {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  lastUpdated: string
  owner: {
    login: string
    avatarUrl: string
  }
}

export async function fetchGitHubProjects(tag: string): Promise<GitHubProject[]> {
  try {
    const response = await octokit.search.repos({
      q: `topic:${tag}`,
      sort: "stars",
      order: "desc",
      per_page: 10,
    })

    return response.data.items.map((item) => ({
      name: item.name,
      fullName: item.full_name,
      description: item.description || "",
      url: item.html_url,
      stars: item.stargazers_count,
      lastUpdated: item.updated_at,
      owner: {
        login: item.owner.login,
        avatarUrl: item.owner.avatar_url,
      },
    }))
  } catch (error) {
    console.error("Error fetching GitHub projects:", error)
    return []
  }
}

