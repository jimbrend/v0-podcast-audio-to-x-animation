// This is a client-side implementation that calls the server API
// The server API will:
// 1. Download the YouTube video
// 2. Extract the audio
// 3. Process the audio to detect speakers (diarization)
// 4. Return the processed data

export async function processYoutubeVideo(
  youtubeUrl: string,
  handles: string[],
): Promise<{
  audioData: number[][]
  speakers: number[]
  avatarUrls: string[]
}> {
  try {
    // Fetch avatar URLs from X.com API
    const avatarUrls = await Promise.all(
      handles.map(async (handle) => {
        try {
          const cleanHandle = handle.replace("@", "").trim()
          console.log(`Fetching avatar for handle: ${cleanHandle}`)

          const response = await fetch(`/api/x-user?username=${cleanHandle}`)
          const userData = await response.json()

          if (userData.error) {
            console.warn(`Error from X API for ${cleanHandle}: ${userData.error}`)
            return `/placeholder.svg?height=400&width=400&text=${cleanHandle}`
          }

          // Get the original size image by removing _normal from the URL if it exists
          const avatarUrl = userData.profile_image_url || `/placeholder.svg?height=400&width=400&text=${cleanHandle}`
          return avatarUrl.includes("_normal.") ? avatarUrl.replace("_normal", "") : avatarUrl
        } catch (error) {
          console.error(`Error fetching avatar for ${handle}:`, error)
          // Return placeholder if API call fails
          return `/placeholder.svg?height=400&width=400&text=${handle.replace("@", "")}`
        }
      }),
    )

    // Call the server API to process the YouTube video
    const response = await fetch("/api/process-youtube", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ youtubeUrl }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to process YouTube video")
    }

    const { audioData, speakers } = await response.json()

    return {
      audioData,
      speakers,
      avatarUrls,
    }
  } catch (error) {
    console.error("Error processing YouTube video:", error)
    // Provide fallback data instead of rejecting
    return {
      audioData: [[0], [0]],
      speakers: [0],
      avatarUrls: handles.map((handle) => `/placeholder.svg?height=400&width=400&text=${handle.replace("@", "")}`),
    }
  }
}
