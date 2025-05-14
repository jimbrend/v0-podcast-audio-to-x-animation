"use client"

import { useRef, useEffect, useState } from "react"
import { Download, Pause, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { exportAnimation } from "@/lib/export-video"

interface PodcastPreviewProps {
  audioData: number[][]
  speakers: number[]
  avatarUrls: string[]
  handles: string[]
}

export default function PodcastPreview({ audioData, speakers, avatarUrls, handles }: PodcastPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentSpeaker, setCurrentSpeaker] = useState(-1)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const [isExporting, setIsExporting] = useState(false)
  const [avatarLoadErrors, setAvatarLoadErrors] = useState<boolean[]>([false, false])

  // Initialize audio context and buffer
  useEffect(() => {
    if (!audioData) return

    const initAudio = async () => {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create buffer
      const buffer = audioContext.createBuffer(audioData.length, audioData[0].length, audioContext.sampleRate)

      // Fill buffer with audio data
      for (let channel = 0; channel < audioData.length; channel++) {
        const channelData = buffer.getChannelData(channel)
        for (let i = 0; i < audioData[channel].length; i++) {
          channelData[i] = audioData[channel][i]
        }
      }

      setDuration(buffer.duration)

      // Setup canvas for visualization
      drawVisualization(0)
    }

    initAudio()

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [audioData])

  // Play/pause audio
  const togglePlayback = () => {
    if (!audioContextRef.current) return

    if (isPlaying) {
      // Pause
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
        sourceNodeRef.current = null
      }
      setIsPlaying(false)
      cancelAnimationFrame(animationFrameRef.current)
    } else {
      // Play
      playAudio(currentTime)
    }
  }

  const playAudio = (startTime: number) => {
    if (!audioContextRef.current || !audioData) return

    // Create buffer
    const buffer = audioContextRef.current.createBuffer(
      audioData.length,
      audioData[0].length,
      audioContextRef.current.sampleRate,
    )

    // Fill buffer with audio data
    for (let channel = 0; channel < audioData.length; channel++) {
      const channelData = buffer.getChannelData(channel)
      for (let i = 0; i < audioData[channel].length; i++) {
        channelData[i] = audioData[channel][i]
      }
    }

    // Create source node
    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(audioContextRef.current.destination)

    // Start playback
    source.start(0, startTime)
    sourceNodeRef.current = source
    startTimeRef.current = audioContextRef.current.currentTime - startTime
    setIsPlaying(true)

    // Update time and visualization
    const updateTime = () => {
      if (!audioContextRef.current) return

      const currentTime = audioContextRef.current.currentTime - startTimeRef.current

      if (currentTime >= buffer.duration) {
        // End of audio
        setIsPlaying(false)
        setCurrentTime(0)
        drawVisualization(0)
        return
      }

      setCurrentTime(currentTime)

      // Find current speaker
      const speakerIndex = Math.floor((currentTime / buffer.duration) * speakers.length)
      if (speakerIndex < speakers.length) {
        setCurrentSpeaker(speakers[speakerIndex])
      }

      drawVisualization(currentTime)
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }

    animationFrameRef.current = requestAnimationFrame(updateTime)
  }

  // Handle seeking
  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    setCurrentTime(newTime)

    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
      }
      playAudio(newTime)
    } else {
      drawVisualization(newTime)
    }
  }

  // Draw visualization
  const drawVisualization = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas || !audioData) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background
    ctx.fillStyle = "#f9fafb"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calculate current position
    const position = (time / duration) * canvas.width

    // Draw timeline
    ctx.fillStyle = "#e5e7eb"
    ctx.fillRect(0, canvas.height - 30, canvas.width, 2)

    // Draw current position
    ctx.fillStyle = "#3b82f6"
    ctx.fillRect(position, canvas.height - 35, 2, 10)

    // Draw avatars
    const avatarSize = 80
    const avatarY = canvas.height / 2 - avatarSize / 2 - 40

    // Load avatar images
    const avatar1 = new Image()
    avatar1.crossOrigin = "anonymous"
    avatar1.onload = () => {
      const newErrors = [...avatarLoadErrors]
      newErrors[0] = false
      setAvatarLoadErrors(newErrors)
      drawAvatarCircle(ctx, canvas.width / 3, avatarY, avatarSize, avatar1)
    }
    avatar1.onerror = () => {
      const newErrors = [...avatarLoadErrors]
      newErrors[0] = true
      setAvatarLoadErrors(newErrors)
      // Draw fallback avatar
      drawFallbackAvatar(ctx, canvas.width / 3, avatarY, avatarSize, handles[0])
    }
    if (!avatarLoadErrors[0]) {
      avatar1.src = avatarUrls[0]
    }

    const avatar2 = new Image()
    avatar2.crossOrigin = "anonymous"
    avatar2.onload = () => {
      const newErrors = [...avatarLoadErrors]
      newErrors[1] = false
      setAvatarLoadErrors(newErrors)
      drawAvatarCircle(ctx, (2 * canvas.width) / 3, avatarY, avatarSize, avatar2)
    }
    avatar2.onerror = () => {
      const newErrors = [...avatarLoadErrors]
      newErrors[1] = true
      setAvatarLoadErrors(newErrors)
      // Draw fallback avatar
      drawFallbackAvatar(ctx, (2 * canvas.width) / 3, avatarY, avatarSize, handles[1])
    }
    if (!avatarLoadErrors[1]) {
      avatar2.src = avatarUrls[1]
    }

    // If we already know there are errors, draw fallbacks immediately
    if (avatarLoadErrors[0]) {
      drawFallbackAvatar(ctx, canvas.width / 3, avatarY, avatarSize, handles[0])
    }
    if (avatarLoadErrors[1]) {
      drawFallbackAvatar(ctx, (2 * canvas.width) / 3, avatarY, avatarSize, handles[1])
    }

    // Draw handles
    ctx.font = "16px Inter, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillStyle = "#111827"

    ctx.fillText(`@${handles[0]}`, canvas.width / 3, avatarY + avatarSize + 25)
    ctx.fillText(`@${handles[1]}`, (2 * canvas.width) / 3, avatarY + avatarSize + 25)

    // Highlight current speaker
    if (currentSpeaker !== -1) {
      const speakerX = currentSpeaker === 0 ? canvas.width / 3 : (2 * canvas.width) / 3

      // Draw highlight circle
      ctx.beginPath()
      ctx.arc(speakerX, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2)
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 4
      ctx.stroke()

      // Draw sound waves
      const waveCount = 3
      const maxRadius = avatarSize / 2 + 30
      const minRadius = avatarSize / 2 + 10

      for (let i = 0; i < waveCount; i++) {
        const progress = (Date.now() % 2000) / 2000
        const waveProgress = (progress + i / waveCount) % 1
        const radius = minRadius + (maxRadius - minRadius) * waveProgress
        const opacity = 1 - waveProgress

        ctx.beginPath()
        ctx.arc(speakerX, avatarY + avatarSize / 2, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }

  // Helper function to draw avatar in a circle
  const drawAvatarCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    image: HTMLImageElement,
  ) => {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(image, x - size / 2, y, size, size)

    ctx.restore()
  }

  // Helper function to draw fallback avatar
  const drawFallbackAvatar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, handle: string) => {
    ctx.save()

    // Draw circle background
    ctx.beginPath()
    ctx.arc(x, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = "#e5e7eb"
    ctx.fill()

    // Draw text
    ctx.font = `${size / 4}px Inter, system-ui, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#6b7280"
    ctx.fillText(`@${handle}`, x, y + size / 2)

    ctx.restore()
  }

  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Download animation as video
  const downloadVideo = async () => {
    try {
      if (!canvasRef.current || !audioData) return

      // Show loading state
      setIsExporting(true)

      // Export the animation
      const blob = await exportAnimation(canvasRef.current, audioData, duration)

      // Create a download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `podcast-animation-${handles.join("-")}.png`
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsExporting(false)
      }, 100)
    } catch (error) {
      console.error("Error exporting video:", error)
      alert("Failed to export animation. Please try again.")
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider value={[currentTime]} max={duration} step={0.01} onValueChange={handleSeek} />
      </div>

      <div className="flex justify-between">
        <Button onClick={togglePlayback} variant="outline" size="icon">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button onClick={downloadVideo} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Animation
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
