import { NextResponse } from "next/server"
import ytdl from "ytdl-core"
import { createWriteStream } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { promisify } from "util"
import { pipeline } from "stream"
import { AudioContext } from "node-web-audio-api"

const pipelineAsync = promisify(pipeline)

export async function POST(request: Request) {
  try {
    const { youtubeUrl } = await request.json()

    if (!youtubeUrl) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 })
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(youtubeUrl)) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    // Get video info
    const info = await ytdl.getInfo(youtubeUrl)
    const videoId = info.videoDetails.videoId

    // Create temporary file paths
    const tempDir = tmpdir()
    const audioPath = join(tempDir, `${videoId}.mp3`)

    // Download audio
    const audioStream = ytdl(youtubeUrl, {
      quality: "highestaudio",
      filter: "audioonly",
    })

    // Save to temporary file
    const writeStream = createWriteStream(audioPath)
    await pipelineAsync(audioStream, writeStream)

    // Read the file as an ArrayBuffer
    const fileBuffer = await promisify(require("fs").readFile)(audioPath)

    // Process audio using node-web-audio-api
    const audioContext = new AudioContext()
    const arrayBuffer = await audioContext.decodeAudioData(fileBuffer)

    // Extract audio data
    const audioData: number[][] = []
    for (let channel = 0; channel < arrayBuffer.numberOfChannels; channel++) {
      audioData.push(Array.from(arrayBuffer.getChannelData(channel)))
    }

    // Simple speaker detection based on audio levels
    const speakers: number[] = []
    const sampleRate = arrayBuffer.sampleRate
    const samplesPerSecond = Math.floor(sampleRate)

    // Analyze each second of audio
    for (let second = 0; second < arrayBuffer.duration; second++) {
      const startSample = second * samplesPerSecond
      const endSample = Math.min((second + 1) * samplesPerSecond, arrayBuffer.length)

      // Calculate average volume for each channel in this second
      let channelVolumes = audioData.map(channel => {
        let sum = 0
        for (let i = startSample; i < endSample; i++) {
          sum += Math.abs(channel[i])
        }
        return sum / (endSample - startSample)
      })

      // Determine which channel is louder (simplified speaker detection)
      const speaker = channelVolumes[0] > channelVolumes[1] ? 0 : 1
      speakers.push(speaker)
    }

    // Clean up temporary file
    try {
      await promisify(require("fs").unlink)(audioPath)
    } catch (error) {
      console.error("Error cleaning up temporary file:", error)
    }

    return NextResponse.json({
      audioData,
      speakers,
    })
  } catch (error) {
    console.error("Error processing YouTube video:", error)
    return NextResponse.json(
      { error: "Failed to process YouTube video" },
      { status: 500 }
    )
  }
} 