"use client"

import type React from "react"

import { useState } from "react"
import { X, Play, Loader2, Youtube, FileVideo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { processPodcast } from "@/lib/process-podcast"
import { processYoutubeVideo } from "@/lib/process-youtube"
import PodcastPreview from "./podcast-preview"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import ChunkedUploader from "./chunked-uploader"

export default function PodcastUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [handle1, setHandle1] = useState("")
  const [handle2, setHandle2] = useState("")
  const [processing, setProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [inputMethod, setInputMethod] = useState<"file" | "youtube">("file")
  const [result, setResult] = useState<{
    audioData: number[][]
    speakers: number[]
    avatarUrls: string[]
  } | null>(null)

  const handleFileChange = (file: File | null) => {
    setFile(file)
    setUploadProgress(0)
  }

  const handleProgressUpdate = (progress: number) => {
    setUploadProgress(progress)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (inputMethod === "file" && !file) {
      alert("Please upload a video file")
      return
    }

    if (inputMethod === "youtube" && !youtubeUrl) {
      alert("Please enter a YouTube URL")
      return
    }

    if (!handle1 || !handle2) {
      alert("Please enter X handles for both speakers")
      return
    }

    setProcessing(true)
    try {
      let result

      if (inputMethod === "file" && file) {
        // Process uploaded file
        result = await processPodcast(file, [handle1, handle2])
      } else if (inputMethod === "youtube" && youtubeUrl) {
        // Process YouTube video
        result = await processYoutubeVideo(youtubeUrl, [handle1, handle2])
      }

      if (result) {
        setResult(result)
      }
    } catch (error) {
      console.error("Error processing podcast:", error)
      alert("Error processing the video. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setYoutubeUrl("")
    setResult(null)
    setUploadProgress(0)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="preview" disabled={!result}>
            Preview & Download
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label>Input Method</Label>
              <RadioGroup
                defaultValue="file"
                value={inputMethod}
                onValueChange={(value) => setInputMethod(value as "file" | "youtube")}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="file" />
                  <Label htmlFor="file" className="flex items-center cursor-pointer">
                    <FileVideo className="h-4 w-4 mr-2" />
                    Upload Video File
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="youtube" id="youtube" />
                  <Label htmlFor="youtube" className="flex items-center cursor-pointer">
                    <Youtube className="h-4 w-4 mr-2" />
                    YouTube URL
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {inputMethod === "file" ? (
              <div className="space-y-2">
                <Label htmlFor="podcast">Upload Podcast Video (up to 2GB)</Label>
                {!file ? (
                  <ChunkedUploader
                    onFileSelected={handleFileChange}
                    onProgressUpdate={handleProgressUpdate}
                    maxSize={2 * 1024 * 1024 * 1024} // 2GB in bytes
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Play className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3 truncate">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Uploading...</span>
                          <span>{uploadProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube Video URL</Label>
                <div className="flex">
                  <Input
                    id="youtube-url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1"
                  />
                  {youtubeUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => setYoutubeUrl("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="handle1">Speaker 1 X Handle</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    @
                  </span>
                  <Input
                    id="handle1"
                    value={handle1}
                    onChange={(e) => setHandle1(e.target.value)}
                    placeholder="elonmusk"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="handle2">Speaker 2 X Handle</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    @
                  </span>
                  <Input
                    id="handle2"
                    value={handle2}
                    onChange={(e) => setHandle2(e.target.value)}
                    placeholder="lexfridman"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  (inputMethod === "file" && !file) ||
                  (inputMethod === "youtube" && !youtubeUrl) ||
                  !handle1 ||
                  !handle2 ||
                  processing
                }
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Video"
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview" className="p-6">
          {result && (
            <PodcastPreview
              audioData={result.audioData}
              speakers={result.speakers}
              avatarUrls={result.avatarUrls}
              handles={[handle1, handle2]}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
