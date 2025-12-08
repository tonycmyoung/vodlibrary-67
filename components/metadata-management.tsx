"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Tags, Users } from "lucide-react"
import CurriculumManagement from "@/components/curriculum-management"
import CategoryManagement from "@/components/category-management"
import PerformerManagement from "@/components/performer-management"

export default function MetadataManagement() {
  const [activeTab, setActiveTab] = useState("curriculum")

  return (
    <Card className="bg-black/60 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Metadata Management</CardTitle>
        <p className="text-gray-400 text-sm">Manage curriculum, categories, and performers</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
            <TabsTrigger
              value="curriculum"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-gray-300 hover:text-white transition-colors"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Curriculum
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-gray-300 hover:text-white transition-colors"
            >
              <Tags className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="performers"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-gray-300 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Performers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="mt-6">
            <CurriculumManagement />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="performers" className="mt-6">
            <PerformerManagement />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
