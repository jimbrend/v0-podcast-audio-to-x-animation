// This is a mock implementation of podcast processing
// In a real application, this would be a server action that:
// 1. Processes the audio to detect speakers (diarization)
// 2. Fetches avatar images from X.com API
// 3. Returns the processed data

export async function processPodcast(
  file: File,
  handles: string[],
): Promise<{
  audioData: number[][]
  speakers: number[]
  avatarUrls: string[]
}> {
  return new Promise(async (resolve) => {
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

      // Create a FileReader to read the file
      const reader = new FileReader()

      reader.onload = async (e) => {
        if (!e.target?.result) return

        // Create an AudioContext to process the audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        try {
          // Decode the audio data
          const arrayBuffer = e.target.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Get the audio data from the buffer
          const audioData: number[][] = []
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            audioData.push(Array.from(audioBuffer.getChannelData(channel)))
          }

          // Enhanced speaker detection with ordering and consistency
          const speakers: number[] = []
          const sampleRate = audioBuffer.sampleRate
          const samplesPerSecond = Math.floor(sampleRate)
          
          // Track speaker statistics
          let speakerStats = {
            totalTime: [0, 0], // Total speaking time for each speaker
            lastSpeaker: -1,   // Last detected speaker
            firstSpeaker: -1,  // First speaker to speak
            consecutiveCount: 0 // Count of consecutive same-speaker segments
          }
          
          // Analyze each second of audio
          for (let second = 0; second < audioBuffer.duration; second++) {
            const startSample = second * samplesPerSecond
            const endSample = Math.min((second + 1) * samplesPerSecond, audioBuffer.length)
            
            // Calculate average volume and energy for each channel in this second
            let channelStats = audioData.map(channel => {
              let sum = 0
              let energy = 0
              for (let i = startSample; i < endSample; i++) {
                const sample = channel[i]
                sum += Math.abs(sample)
                energy += sample * sample
              }
              return {
                volume: sum / (endSample - startSample),
                energy: energy / (endSample - startSample)
              }
            })
            
            // Determine which channel is more active using both volume and energy
            const channel0Score = channelStats[0].volume * 0.7 + channelStats[0].energy * 0.3
            const channel1Score = channelStats[1].volume * 0.7 + channelStats[1].energy * 0.3
            
            // Add a small bias towards the last speaker to maintain consistency
            const consistencyBias = 0.1
            const adjustedScore0 = channel0Score + (speakerStats.lastSpeaker === 0 ? consistencyBias : 0)
            const adjustedScore1 = channel1Score + (speakerStats.lastSpeaker === 1 ? consistencyBias : 0)
            
            // Determine the speaker for this segment
            let speaker = adjustedScore0 > adjustedScore1 ? 0 : 1
            
            // If this is the first segment with significant audio, record the first speaker
            if (speakerStats.firstSpeaker === -1 && (adjustedScore0 > 0.1 || adjustedScore1 > 0.1)) {
              speakerStats.firstSpeaker = speaker
            }
            
            // Update speaker statistics
            speakerStats.totalTime[speaker]++
            if (speaker === speakerStats.lastSpeaker) {
              speakerStats.consecutiveCount++
            } else {
              speakerStats.consecutiveCount = 1
            }
            speakerStats.lastSpeaker = speaker
            
            speakers.push(speaker)
          }

          // If we detected a first speaker, ensure consistent ordering
          if (speakerStats.firstSpeaker !== -1) {
            // If the first speaker was speaker 1, swap all speaker assignments
            if (speakerStats.firstSpeaker === 1) {
              speakers.forEach((speaker, index) => {
                speakers[index] = speaker === 0 ? 1 : 0
              })
            }
          }

          resolve({
            audioData,
            speakers,
            avatarUrls,
          })
        } catch (error) {
          console.error("Error processing audio:", error)
          throw error
        } finally {
          audioContext.close()
        }
      }

      // Read the file as an ArrayBuffer
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error in processPodcast:", error)
      // Fallback to placeholders if something goes wrong
      resolve({
        audioData: [[0], [0]],
        speakers: [0],
        avatarUrls: handles.map((handle) => `/placeholder.svg?height=400&width=400&text=${handle.replace("@", "")}`),
      })
    }
  })
}
