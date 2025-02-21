import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import fs from "fs"
import path from "path"
import matter from "gray-matter"

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { projectSlug } = await req.json()
    const userId = session.user.id

    // Update the project's MDX file
    const filePath = path.join(process.cwd(), "content", "websites", `${projectSlug}.mdx`)
    const fileContents = fs.readFileSync(filePath, "utf8")
    const { data, content } = matter(fileContents)

    data.favorites = (data.favorites || 0) + 1

    const updatedFileContents = matter.stringify(content, data)
    fs.writeFileSync(filePath, updatedFileContents)

    // Store the user's favorite in the database
    await supabase.from("favorites").upsert({ user_id: userId, project_slug: projectSlug })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error favoriting project:", error)
    return NextResponse.json({ success: false, error: "Failed to favorite project" }, { status: 500 })
  }
}

