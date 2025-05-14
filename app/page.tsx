import PodcastUploader from "@/components/podcast-uploader"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Podcast Animator</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload your podcast, assign X handles, and create animated videos for social media
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <PodcastUploader />
        </div>
      </main>
    </div>
  )
}
