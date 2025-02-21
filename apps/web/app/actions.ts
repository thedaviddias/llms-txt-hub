"use server"

import { Octokit } from "@octokit/rest"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { getAllWebsites } from "@/lib/mdx"
import {
  calculateProjectScores,
  getFeaturedProjects,
  getRecentlyUpdatedProjects,
  getCommunityFavorites,
} from "@/lib/project-utils"
import Fuse from "fuse.js"

const owner = "your-github-username"
const repo = "your-repo-name"

export async function submitLlmsTxt(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  const { access_token } = session.provider_token

  const octokit = new Octokit({ auth: access_token })

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const website = formData.get("website") as string
  const llmsUrl = formData.get("llmsUrl") as string
  const llmsFullUrl = formData.get("llmsFullUrl") as string
  const githubUsername = session.user.user_metadata.user_name

  const now = new Date().toISOString()

  // Create the content for the new MDX file
  const content = `---
name: ${name}
description: ${description}
website: ${website}
llmsUrl: ${llmsUrl}
llmsFullUrl: ${llmsFullUrl || ""}
lastUpdated: "${now}"
score: 0
favorites: 0
---

# ${name}

${description}

## Links

- Website: [${website}](${website})
- llms.txt: [View llms.txt](${llmsUrl})
${llmsFullUrl ? `- llms-full.txt: [View llms-full.txt](${llmsFullUrl})` : ""}

## About

Add any additional information about ${name} here.
`

  try {
    // Create a new branch
    const branchName = `submit-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`
    const mainRef = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    })

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainRef.data.object.sha,
    })

    // Create the new MDX file in the new branch
    const filePath = `content/websites/${name.toLowerCase().replace(/\s+/g, "-")}.mdx`
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Add ${name} to llms.txt directory`,
      content: Buffer.from(content).toString("base64"),
      branch: branchName,
    })

    // Create a pull request
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: `Add ${name} to llms.txt directory`,
      head: branchName,
      base: "main",
      body: `This PR adds ${name} to the llms.txt directory.

Submitted by: @${githubUsername}

Website: ${website}
llms.txt: ${llmsUrl}
${llmsFullUrl ? `llms-full.txt: ${llmsFullUrl}` : ""}

Please review and merge if appropriate.`,
    })

    revalidatePath("/")
    return { success: true, prUrl: pr.data.html_url }
  } catch (error) {
    console.error("Error creating PR:", error)
    return { success: false, error: "Failed to create PR" }
  }
}

export async function favoriteProject(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("Unauthorized")
  }

  const projectSlug = formData.get("projectSlug") as string
  const userId = session.user.id

  try {
    // Update the project's favorites count in the database
    const { data, error } = await supabase
      .from("projects")
      .update({ favorites: supabase.sql`favorites + 1` })
      .eq("slug", projectSlug)
      .select("favorites")
      .single()

    if (error) throw error

    // Store the user's favorite
    await supabase.from("favorites").upsert({ user_id: userId, project_slug: projectSlug })

    revalidatePath("/")
    return { success: true, newFavoriteCount: data.favorites }
  } catch (error) {
    console.error("Error favoriting project:", error)
    return { success: false, error: "Failed to favorite project" }
  }
}

export async function getHomePageData() {
  const allProjects = await calculateProjectScores()
  const featuredProjects = getFeaturedProjects(allProjects, 4)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 4)
  const communityFavorites = getCommunityFavorites(allProjects, 4)

  return {
    allProjects,
    featuredProjects,
    recentlyUpdatedProjects,
    communityFavorites,
  }
}

export async function searchProjects(query: string) {
  const websites = await getAllWebsites()
  const fuse = new Fuse(websites, {
    keys: ["name", "description", "category"],
    threshold: 0.3,
  })

  const results = query ? fuse.search(query).map((result) => result.item) : []
  return results
}

