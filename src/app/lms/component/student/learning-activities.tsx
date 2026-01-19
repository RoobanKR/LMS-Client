"use client"
import React, { useState } from "react"
import {
  Play,
  CheckCircle,
  FileText,
  Video,
  BookOpen,
  Users,
  MessageCircle,
  PenTool,
  Award,
  Presentation,
  X,
} from "lucide-react"
import { PPTViewer } from "../component/ppt-viewer"

interface LearningItem {
  type: string
  title: string
  duration: string
  completed: boolean
}

interface Methods {
  ido?: LearningItem[]
  wedo?: LearningItem[]
  youdo?: LearningItem[]
}

interface LearningActivitiesProps {
  methods: Methods
  subtopicTitle: string
}

const methodIcons = {
  ido: { icon: Presentation, label: "I Do", color: "text-blue-600", bg: "bg-blue-50" },
  wedo: { icon: Users, label: "We Do", color: "text-green-600", bg: "bg-green-50" },
  youdo: { icon: CheckCircle, label: "You Do", color: "text-purple-600", bg: "bg-purple-50" },
}

const elementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  tutorial: BookOpen,
  interactive: Users,
  discussion: MessageCircle,
  assignment: PenTool,
  assessment: Award,
  example: FileText,
  workshop: Users,
  project: PenTool,
  exercise: Award,
}

export function LearningActivities({ methods, subtopicTitle }: LearningActivitiesProps) {
  const [showPPTViewer, setShowPPTViewer] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<LearningItem | null>(null)

  const handleActivityClick = (item: LearningItem, methodType: string) => {
    if (methodType === "ido") {
      setSelectedActivity(item)
      setShowPPTViewer(true)
    } else {
      // Handle other activity types
      console.log(`Opening ${item.type}: ${item.title}`)
    }
  }

  const closePPTViewer = () => {
    setShowPPTViewer(false)
    setSelectedActivity(null)
  }

  if (showPPTViewer && selectedActivity) {
    return (
      <div className="space-y-4">
        {/* Header with close button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black">Learning Activities - {subtopicTitle}</h3>
            <p className="text-sm text-gray-600">Currently viewing: {selectedActivity.title}</p>
          </div>
          <button onClick={closePPTViewer} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* PPT Viewer */}
        <PPTViewer
          pptUrl="https://yromfbntadbtdyanclef.supabase.co/storage/v1/object/public/smartlms/course/ppts/1757046939955_Animated-Intro-for-Social-Media-Platforms-by-Slidesgo.pptx"
          title={selectedActivity.title}
          onClose={closePPTViewer}
        />

        {/* Activity Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Presentation className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-800">I Do Activity</h4>
          </div>
          <p className="text-sm text-blue-700 mb-2">{selectedActivity.title}</p>
          <div className="flex items-center gap-4 text-xs text-blue-600">
            <span>Duration: {selectedActivity.duration}</span>
            {selectedActivity.completed && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-black">Learning Activities</h3>

      <div className="grid gap-2">
        {Object.entries(methods).map(([methodType, items]) => {
          if (!items) return null
          const methodConfig = methodIcons[methodType as keyof typeof methodIcons]
          const MethodIcon = methodConfig.icon

          return (
            <div key={methodType} className={`p-2 rounded border ${methodConfig.bg} border-gray-200`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <MethodIcon className={`w-3.5 h-3.5 ${methodConfig.color}`} />
                <h4 className={`font-medium ${methodConfig.color} text-xs`}>{methodConfig.label}</h4>
                <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded">
                  {items.filter((i) => i.completed).length}/{items.length}
                </span>
                {methodType === "ido" && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    PPT Available
                  </span>
                )}
              </div>
              <div className="grid gap-1.5">
                {items.map((item) => (
                  <div
                    key={item.title}
                    className="bg-white p-2 rounded border border-gray-100 hover:shadow-xs transition-shadow cursor-pointer group"
                    onClick={() => handleActivityClick(item, methodType)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {React.createElement(elementIcons[item.type] || FileText, {
                          className: "w-3.5 h-3.5 text-gray-500",
                        })}
                        <span className="font-medium text-black text-xs">{item.title}</span>
                        <span className="text-xs text-gray-500">{item.duration}</span>
                        {methodType === "ido" && <Presentation className="w-3 h-3 text-blue-500" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.completed && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                        <Play className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
