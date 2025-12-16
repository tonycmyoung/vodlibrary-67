"use client"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import VideoModal from "@/components/video-modal"

// Mock dependencies
vi.mock("@/lib/actions", () => ({
  saveVideo: vi.fn(),
}))

vi.mock("@/lib/video-utils", () => ({
  extractVideoMetadata: vi.fn(),
}))

const { saveVideo } = await import("@/lib/actions")
const { extractVideoMetadata } = await import("@/lib/video-utils")

describe("VideoModal", () => {
  const mockCurriculums = [
    { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1 },
    { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2 },
  ]

  const mockCategories = [
    { id: "cat-1", name: "Bo", color: "#ff0000" },
    { id: "cat-2", name: "Sai", color: "#00ff00" },
  ]

  const mockPerformers = [
    { id: "perf-1", name: "John Doe" },
    { id: "perf-2", name: "Jane Smith" },
  ]

  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render modal with title for new video", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByText("Add New Video")).toBeInTheDocument()
  })

  it("should render modal with title for editing video", () => {
    const editingVideo = {
      id: "video-1",
      title: "Test Video",
      description: "Test description",
      video_url: "https://example.com/video.mp4",
      thumbnail_url: "https://example.com/thumb.jpg",
      duration_seconds: 125,
      is_published: true,
      recorded: "2023",
      curriculums: [],
      categories: [],
      performers: [],
    }

    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={editingVideo}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByText("Edit Video: Test Video")).toBeInTheDocument()
  })

  it("should render all form fields", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByLabelText("Title *")).toBeInTheDocument()
    expect(screen.getByLabelText("Description")).toBeInTheDocument()
    expect(screen.getByLabelText("Video URL *")).toBeInTheDocument()
    expect(screen.getByLabelText("Thumbnail URL")).toBeInTheDocument()
    expect(screen.getByLabelText("Recorded")).toBeInTheDocument()
  })

  it("should render curriculum checkboxes", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByText("10.Kyu")).toBeInTheDocument()
    expect(screen.getByText("9.Kyu")).toBeInTheDocument()
  })

  it("should render category checkboxes", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByText("Bo")).toBeInTheDocument()
    expect(screen.getByText("Sai")).toBeInTheDocument()
  })

  it("should render performer checkboxes", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("Jane Smith")).toBeInTheDocument()
  })

  it("should update form data when inputs change", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    const titleInput = screen.getByLabelText("Title *")
    const descriptionInput = screen.getByLabelText("Description")
    const videoUrlInput = screen.getByLabelText("Video URL *")

    fireEvent.change(titleInput, { target: { value: "New Video" } })
    fireEvent.change(descriptionInput, { target: { value: "New description" } })
    fireEvent.change(videoUrlInput, { target: { value: "https://example.com/new.mp4" } })

    expect(titleInput).toHaveValue("New Video")
    expect(descriptionInput).toHaveValue("New description")
    expect(videoUrlInput).toHaveValue("https://example.com/new.mp4")
  })

  it("should toggle curriculum checkboxes", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    const curriculumCheckbox = screen.getByLabelText("10.Kyu") as HTMLInputElement
    expect(curriculumCheckbox.checked).toBe(false)

    fireEvent.click(curriculumCheckbox)
    expect(curriculumCheckbox.checked).toBe(true)

    fireEvent.click(curriculumCheckbox)
    expect(curriculumCheckbox.checked).toBe(false)
  })

  it("should auto-fill metadata when auto-fill button is clicked", async () => {
    vi.mocked(extractVideoMetadata).mockResolvedValue({
      thumbnail: "https://example.com/auto-thumb.jpg",
      duration: 130,
    })

    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    const videoUrlInput = screen.getByLabelText("Video URL *")
    fireEvent.change(videoUrlInput, { target: { value: "https://example.com/video.mp4" } })

    const autoFillButton = screen.getByTitle("Auto-fill metadata")
    fireEvent.click(autoFillButton)

    await waitFor(() => {
      expect(extractVideoMetadata).toHaveBeenCalledWith("https://example.com/video.mp4")
    })

    await waitFor(() => {
      const thumbnailInput = screen.getByLabelText("Thumbnail URL")
      expect(thumbnailInput).toHaveValue("https://example.com/auto-thumb.jpg")
    })
  })

  it("should show error when auto-fill fails", async () => {
    vi.mocked(extractVideoMetadata).mockRejectedValue(new Error("Failed to extract metadata"))

    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    const videoUrlInput = screen.getByLabelText("Video URL *")
    fireEvent.change(videoUrlInput, { target: { value: "https://example.com/video.mp4" } })

    const autoFillButton = screen.getByTitle("Auto-fill metadata")
    fireEvent.click(autoFillButton)

    await waitFor(() => {
      expect(screen.getByText("Could not extract video metadata. Please fill in manually.")).toBeInTheDocument()
    })
  })

  it("should call saveVideo when form is submitted", async () => {
    vi.mocked(saveVideo).mockResolvedValue({ success: true })

    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    const titleInput = screen.getByLabelText("Title *")
    const videoUrlInput = screen.getByLabelText("Video URL *")

    fireEvent.change(titleInput, { target: { value: "Test Video" } })
    fireEvent.change(videoUrlInput, { target: { value: "https://example.com/video.mp4" } })

    const submitButton = screen.getByRole("button", { name: /Add Video/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(saveVideo).toHaveBeenCalled()
      expect(mockOnSave).toHaveBeenCalled()
    })
  })

  it("should call onClose when Cancel button is clicked", () => {
    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={null}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("should populate form with editing video data", () => {
    const editingVideo = {
      id: "video-1",
      title: "Existing Video",
      description: "Existing description",
      video_url: "https://example.com/existing.mp4",
      thumbnail_url: "https://example.com/existing-thumb.jpg",
      duration_seconds: 200,
      is_published: false,
      recorded: "2022",
      curriculums: [mockCurriculums[0]],
      categories: [mockCategories[0]],
      performers: [mockPerformers[0]],
    }

    render(
      <VideoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        editingVideo={editingVideo}
        curriculums={mockCurriculums}
        categories={mockCategories}
        performers={mockPerformers}
      />,
    )

    expect(screen.getByLabelText("Title *")).toHaveValue("Existing Video")
    expect(screen.getByLabelText("Description")).toHaveValue("Existing description")
    expect(screen.getByLabelText("Video URL *")).toHaveValue("https://example.com/existing.mp4")
    expect(screen.getByLabelText("Recorded")).toHaveValue("2022")

    const curriculumCheckbox = screen.getByLabelText("10.Kyu") as HTMLInputElement
    expect(curriculumCheckbox.checked).toBe(true)
  })
})
