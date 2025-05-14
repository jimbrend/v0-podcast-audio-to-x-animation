import { type NextRequest, NextResponse } from "next/server"

// X API endpoint for user lookup
const X_API_URL = "https://api.twitter.com/2/users/by/username/"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    // Check if we have a bearer token
    if (!process.env.X_BEARER_TOKEN) {
      console.warn("X_BEARER_TOKEN is not set, using fallback avatar")
      return NextResponse.json({
        username: username,
        profile_image_url: `/placeholder.svg?height=400&width=400&text=${username}`,
      })
    }

    // Fetch user data from X API
    const response = await fetch(`${X_API_URL}${username}?user.fields=profile_image_url`, {
      headers: {
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.warn(`X API returned error for username ${username}: ${response.status}`)
      // Return a fallback avatar instead of an error
      return NextResponse.json({
        username: username,
        profile_image_url: `/placeholder.svg?height=400&width=400&text=${username}`,
      })
    }

    const data = await response.json()

    // Check if we have the expected data
    if (!data.data || !data.data.profile_image_url) {
      console.warn(`X API returned unexpected data format for username ${username}`)
      return NextResponse.json({
        username: username,
        profile_image_url: `/placeholder.svg?height=400&width=400&text=${username}`,
      })
    }

    // Return only the necessary data
    return NextResponse.json({
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
      profile_image_url: data.data.profile_image_url,
    })
  } catch (error) {
    console.error("Error fetching X user data:", error)
    // Return a fallback avatar instead of an error
    return NextResponse.json({
      username: username,
      profile_image_url: `/placeholder.svg?height=400&width=400&text=${username}`,
    })
  }
}
