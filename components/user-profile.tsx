"use client"

import type React from "react"
import { updateProfile } from "@/lib/actions"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Calendar, Heart, Edit, Save, X, Loader2, Upload, Lock } from "lucide-react"
import Link from "next/link"
import { formatShortDate } from "@/lib/utils/date"

interface UserProfileProps {
  user: {
    id: string
    email: string
    full_name: string | null
    teacher: string | null
    school: string | null
    role: string | null
    created_at: string
    profile_image_url: string | null
    favorite_count: number
    isAdmin?: boolean // Add optional admin flag
  }
}

export default function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    teacher: user.teacher || "",
    school: user.school || "",
    profile_image_url: user.profile_image_url || "",
  })

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase()

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB")
      return
    }

    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-profile-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()

      setFormData((prev) => ({ ...prev, profile_image_url: result.url }))
      setImagePreview(result.url)
    } catch (error) {
      console.error("Image upload error:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      const result = await updateProfile({
        userId: user.id,
        email: user.email,
        fullName: formData.full_name || null,
        teacher: formData.teacher || null,
        school: formData.school || null,
        profileImageUrl: formData.profile_image_url || null,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to update profile")
      }

      setIsEditing(false)
      setImagePreview(null)
      window.location.reload()
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: user.full_name || "",
      teacher: user.teacher || "",
      school: user.school || "",
      profile_image_url: user.profile_image_url || "",
    })
    setImagePreview(null)
    setIsEditing(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-black/60 border-gray-800">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={imagePreview || user.profile_image_url || "/placeholder.svg"}
                  alt={user.full_name || user.email}
                />
                <AvatarFallback className="bg-red-600 text-white text-2xl">{initials}</AvatarFallback>
              </Avatar>

              <div>
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Full name"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <Input
                      value={formData.teacher}
                      onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                      placeholder="Teacher"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <Input
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      placeholder="School/Dojo"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Profile Image</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="hidden"
                          id="profile-image-upload"
                        />
                        <label
                          htmlFor="profile-image-upload"
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md cursor-pointer hover:bg-gray-700 transition-colors text-white text-sm"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>{uploadingImage ? "Uploading..." : "Choose Image"}</span>
                        </label>
                        {(imagePreview || user.profile_image_url) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, profile_image_url: "" }))
                              setImagePreview(null)
                            }}
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Upload an image file (max 5MB)</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-white mb-2">{user.full_name || "No name set"}</h1>
                    <div className="flex items-center space-x-4 text-gray-300">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      <Badge
                        className={
                          user.isAdmin
                            ? "bg-purple-600 text-white"
                            : user.role === "Teacher"
                              ? "bg-blue-600 text-white"
                              : "bg-green-600 text-white"
                        }
                      >
                        {user.isAdmin ? "Administrator" : user.role || "Student"}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading || uploadingImage}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading || uploadingImage}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="border-gray-600 text-gray-800 hover:bg-gray-100 hover:text-gray-900 bg-white/90 cursor-pointer hover:border-gray-500 transition-all duration-200"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats and Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Stats */}
        <Card className="bg-black/60 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Account Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-300">
                <Heart className="w-4 h-4 text-red-400" />
                <span>Favorite Videos</span>
              </div>
              <span className="text-white font-semibold">{user.favorite_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-300">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Member Since</span>
              </div>
              <span className="text-white font-semibold">{formatShortDate(user.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-black/60 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start bg-red-600 hover:bg-red-700 text-white">
              <a href="/favorites">
                <Heart className="w-4 h-4 mr-2" />
                View My Favorites
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <Link href="/change-password">
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <a href="/">
                <User className="w-4 h-4 mr-2" />
                Browse Video Library
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card className="bg-black/60 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <span className="text-white">{user.email}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact admin if needed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Teacher</label>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <span className="text-white">{user.teacher || "Not specified"}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">School/Dojo</label>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <span className="text-white">{user.school || "Not specified"}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Account Status</label>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <Badge
                  className={
                    user.isAdmin
                      ? "bg-purple-600 text-white"
                      : user.role === "Teacher"
                        ? "bg-blue-600 text-white"
                        : "bg-green-600 text-white"
                  }
                >
                  {user.isAdmin
                    ? "System Administrator"
                    : user.role === "Teacher"
                      ? "Approved Teacher"
                      : "Approved Student"}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {user.isAdmin
                  ? "You have full administrative access to the system."
                  : user.role === "Teacher"
                    ? "Your account has teacher privileges. Only administrators can change your role."
                    : "Your account has been approved for video access. Only administrators can change your role."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
