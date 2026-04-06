import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, X, Search, Plus } from "lucide-react"
import { getVideosForLevel, addVideoToLevel, removeVideoFromLevel, getAvailableVideos } from "@/lib/actions/curriculums"
import { useToast } from "@/hooks/use-toast"

interface CurriculumLevel {
  id: string
  name: string
  color: string
}

interface VideoItem {
  id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number | null
  recorded: string | null
}

interface VideoManagementPanelProps {
  readonly level: CurriculumLevel | null
  readonly onClose: () => void
}

export function VideoManagementPanel({ level, onClose }: VideoManagementPanelProps) {
  const { toast } = useToast()
  const [levelVideos, setLevelVideos] = useState<VideoItem[]>([])
  const [availableVideos, setAvailableVideos] = useState<VideoItem[]>([])
  const [videoSearch, setVideoSearch] = useState("")
  const [videoSearchLoading, setVideoSearchLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleVideoSearch = async (search: string) => {
    setVideoSearch(search)
    setVideoSearchLoading(true)
    try {
      const videos = await getAvailableVideos(search)
      setAvailableVideos(videos)
    } finally {
      setVideoSearchLoading(false)
    }
  }

  const handleAddVideoToLevel = async (videoId: string) => {
    if (!level) return
    const result = await addVideoToLevel(level.id, videoId)
    if (result.success) {
      const videos = await getVideosForLevel(level.id)
      setLevelVideos([...videos].sort((a, b) => a.title.localeCompare(b.title)))
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    }
  }

  const handleRemoveVideoFromLevel = async (videoId: string) => {
    if (!level) return
    const result = await removeVideoFromLevel(level.id, videoId)
    if (result.success) {
      setLevelVideos((prev) => prev.filter((v) => v.id !== videoId))
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    }
  }

  useEffect(() => {
    if (!level) {
      setIsOpen(false)
      return
    }
    setIsOpen(true)
    setVideoSearchLoading(true)
    const loadVideos = async () => {
      try {
        const [assignedVideos, availableList] = await Promise.all([
          getVideosForLevel(level.id),
          getAvailableVideos(),
        ])
        setLevelVideos([...assignedVideos].sort((a, b) => a.title.localeCompare(b.title)))
        setAvailableVideos(availableList)
        setVideoSearch("")
      } catch (error) {
        console.error("Error loading videos:", error)
        toast({ title: "Error", description: "Failed to load videos", variant: "destructive" })
      } finally {
        setVideoSearchLoading(false)
      }
    }
    loadVideos()
  }, [level, toast])

  if (!level || !isOpen) return null

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Videos for: <span style={{ color: level.color }}>{level.name}</span>
          </h3>
          <p className="text-sm text-gray-400">
            {levelVideos.length} video{levelVideos.length === 1 ? "" : "s"} assigned to this level
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false)
            onClose()
          }}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned Videos */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Assigned Videos ({levelVideos.length})
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {levelVideos.length === 0 ? (
              <p className="text-xs text-gray-500">No videos assigned</p>
            ) : (
              levelVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-800 border border-gray-700"
                >
                  <span className="text-sm text-white truncate flex-1 min-w-0 mr-2">{video.title}</span>
                  {video.recorded && (
                    <span className="text-xs text-gray-500 flex-shrink-0 mr-2">{video.recorded}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveVideoFromLevel(video.id)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0"
                    title="Remove from level"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Videos */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Add Videos</h4>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={videoSearch}
              onChange={(e) => handleVideoSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {videoSearchLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : (
              availableVideos
                .filter((v) => !levelVideos.some((lv) => lv.id === v.id))
                .map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-purple-500 transition"
                  >
                    <span className="text-sm text-white truncate flex-1 min-w-0 mr-2">{video.title}</span>
                    {video.recorded && (
                      <span className="text-xs text-gray-500 flex-shrink-0 mr-2">{video.recorded}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddVideoToLevel(video.id)}
                      className="text-purple-400 hover:text-purple-300 flex-shrink-0 font-medium text-xs"
                      title="Add to level"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
