import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")

  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
  }

  try {
    // In a real implementation, you would:
    // 1. Use the YouTube Data API to fetch video metadata
    // 2. Or use a library like youtube-dl to get video info

    // For this demo, we'll return mock data
    return NextResponse.json({
      id: videoId,
      title: `YouTube Video ${videoId}`,
      duration: 300, // 5 minutes
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    })
  } catch (error) {
    console.error("Error fetching YouTube video data:", error)
    return NextResponse.json({ error: "Failed to fetch video data" }, { status: 500 })
  }
}
