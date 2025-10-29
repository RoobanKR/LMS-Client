
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    BookOpen,
    Clock,
    Users,
    FileText,
    PenTool,
    Target,
    Plus,
    Edit3,
    Check,
    X,
    Eye,
    EyeOff,
    Link,
    Info,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import DashboardLayoutProgramcoordinator from "../../components/layout"

type ContentType = "module" | "submodule" | "topic" | "subtopic"
type SectionType = "iDoLearning" | "iDoLecture" | "weDoGroup" | "weDoCase" | "youDoAssignment" | "youDoPractice"

interface ContentItem {
    id: string
    type: ContentType
    name: string
    hours: number
    groupId?: string
    isEditing?: boolean
}

interface ContentGroup {
    id: string
    items: string[]
    hours: number
    sectionType: SectionType
    contentType: ContentType
    name: string
}

interface HierarchicalItem {
    id: string
    name: string
    type: ContentType
    hours: Record<SectionType, number>
    children: HierarchicalItem[]
    groupId?: string
    path?: HierarchicalItem[]
}

const buildHierarchy = (sectionData: Record<SectionType, ContentItem[]>): HierarchicalItem[] => {
    const hierarchy: HierarchicalItem[] = []

    // Process modules
    contentHierarchy.module.forEach((moduleName) => {
        const moduleItem: HierarchicalItem = {
            id: `module-${moduleName}`,
            name: moduleName,
            type: "module",
            hours: { iDoLearning: 0, iDoLecture: 0, weDoGroup: 0, weDoCase: 0, youDoAssignment: 0, youDoPractice: 0 },
            children: [],
        }

        // Process submodules for this module
        if (contentHierarchy.submodule[moduleName]) {
            contentHierarchy.submodule[moduleName].forEach((submoduleName) => {
                const submoduleItem: HierarchicalItem = {
                    id: `submodule-${submoduleName}`,
                    name: submoduleName,
                    type: "submodule",
                    hours: { iDoLearning: 0, iDoLecture: 0, weDoGroup: 0, weDoCase: 0, youDoAssignment: 0, youDoPractice: 0 },
                    children: [],
                }

                // Process topics for this submodule
                if (contentHierarchy.topic[submoduleName]) {
                    contentHierarchy.topic[submoduleName].forEach((topicName) => {
                        const topicItem: HierarchicalItem = {
                            id: `topic-${topicName}`,
                            name: topicName,
                            type: "topic",
                            hours: {
                                iDoLearning: 0,
                                iDoLecture: 0,
                                weDoGroup: 0,
                                weDoCase: 0,
                                youDoAssignment: 0,
                                youDoPractice: 0,
                            },
                            children: [],
                        }

                        // Process subtopics for this topic
                        if (contentHierarchy.subtopic[topicName]) {
                            contentHierarchy.subtopic[topicName].forEach((subtopicName) => {
                                const subtopicItem: HierarchicalItem = {
                                    id: `subtopic-${subtopicName}`,
                                    name: subtopicName,
                                    type: "subtopic",
                                    hours: {
                                        iDoLearning: 0,
                                        iDoLecture: 0,
                                        weDoGroup: 0,
                                        weDoCase: 0,
                                        youDoAssignment: 0,
                                        youDoPractice: 0,
                                    },
                                    children: [],
                                }
                                topicItem.children.push(subtopicItem)
                            })
                        }

                        submoduleItem.children.push(topicItem)
                    })
                }

                moduleItem.children.push(submoduleItem)
            })
        }

        hierarchy.push(moduleItem)
    })

    // Now populate hours from sectionData and set groupIds
    Object.entries(sectionData).forEach(([sectionKey, items]) => {
        const section = sectionKey as SectionType
        items.forEach((item: { name: string; hours: number; groupId: string | undefined }) => {
            const findInHierarchy = (items: HierarchicalItem[], name: string): HierarchicalItem | null => {
                for (const hierarchyItem of items) {
                    if (hierarchyItem.name === name) return hierarchyItem
                    const found = findInHierarchy(hierarchyItem.children, name)
                    if (found) return found
                }
                return null
            }

            const target = findInHierarchy(hierarchy, item.name)
            if (target) {
                target.hours[section] = item.hours
                target.groupId = item.groupId
            }
        })
    })

    return hierarchy
}

const contentHierarchy = {
    module: ["Core Java Deep Dive", "Database Fundamentals and Maven", "Git-Version Control"],
    submodule: {
        "Core Java Deep Dive": [
            "Multi-threading",
            "Lambda Expressions and Stream API",
            "Generics and Collections",
            "Design Pattern (MVC)",
        ],
        "Database Fundamentals and Maven": ["Oracle, SQL", "Introduction to Data Access"],
        "Git-Version Control": ["Git Basics"],
    },
    topic: {
        "Multi-threading": ["Thread Basics", "Synchronization"],
        "Lambda Expressions and Stream API": ["Functional Interfaces", "Stream Operations"],
        "Generics and Collections": ["Generic Classes", "Collection Framework"],
        "Design Pattern (MVC)": ["MVC Architecture", "MVC with some working examples"],
        "Oracle, SQL": ["Introduction to Database", "SQL Basics"],
        "Introduction to Data Access": ["JDBC using Maven"],
        "Git Basics": ["Commit, Push, Clone"],
    },
    subtopic: {
        "Thread Basics": ["Creating Threads", "Thread Lifecycle"],
        Synchronization: ["Synchronized Methods", "Deadlocks"],
        "Functional Interfaces": ["Predicate", "Function"],
        "Stream Operations": ["Filter", "Map"],
        "Generic Classes": ["Type Parameters", "Wildcards"],
        "Collection Framework": ["List", "Set"],
        "MVC Architecture": ["Model", "View"],
        "MVC with some working examples": ["Controller", "Example"],
        "Introduction to Database": ["Keys & Constraints", "Normalizations"],
        "SQL Basics": ["DLL, DML", "Joins & Sub queries"],
        "JDBC using Maven": ["Connection", "Statements"],
        "Commit, Push, Clone": ["Basic Commands", "Branching"],
    },
}

const sectionConfig = {
    iDoLearning: {
        title: "Learning Skills",
        icon: BookOpen,
        color: "bg-blue-50 border-blue-200",
        iconColor: "text-blue-600",
    },
    iDoLecture: {
        title: "Lecture Hours",
        icon: FileText,
        color: "bg-blue-50 border-blue-200",
        iconColor: "text-blue-600",
    },
    weDoGroup: {
        title: "Group Activities",
        icon: Users,
        color: "bg-green-50 border-green-200",
        iconColor: "text-green-600",
    },
    weDoCase: { title: "Case Studies", icon: Target, color: "bg-green-50 border-green-200", iconColor: "text-green-600" },
    youDoAssignment: {
        title: "Assignments",
        icon: PenTool,
        color: "bg-purple-50 border-purple-200",
        iconColor: "text-purple-600",
    },
    youDoPractice: {
        title: "Practice",
        icon: Clock,
        color: "bg-purple-50 border-purple-200",
        iconColor: "text-purple-600",
    },
}

export default function CourseStructureBuilder() {
    const [sectionData, setSectionData] = useState<Record<SectionType, ContentItem[]>>({
        iDoLearning: [],
        iDoLecture: [],
        weDoGroup: [],
        weDoCase: [],
        youDoAssignment: [],
        youDoPractice: [],
    })

    const [contentGroups, setContentGroups] = useState<ContentGroup[]>([])
    const [selectedItems, setSelectedItems] = useState<Record<SectionType, string[]>>({
        iDoLearning: [],
        iDoLecture: [],
        weDoGroup: [],
        weDoCase: [],
        youDoAssignment: [],
        youDoPractice: [],
    })
    const [sectionContentTypes, setSectionContentTypes] = useState<Record<SectionType, ContentType>>({
        iDoLearning: "module",
        iDoLecture: "module",
        weDoGroup: "module",
        weDoCase: "module",
        youDoAssignment: "module",
        youDoPractice: "module",
    })
    const [showPreview, setShowPreview] = useState(false)
    const [editingItem, setEditingItem] = useState<string | null>(null)
    const [tempHours, setTempHours] = useState<string>("")

    const getAvailableItems = (contentType: ContentType): string[] => {
        if (contentType === "module") return contentHierarchy.module
        if (contentType === "submodule") return Object.values(contentHierarchy.submodule).flat()
        if (contentType === "topic") return Object.values(contentHierarchy.topic).flat()
        if (contentType === "subtopic") return Object.values(contentHierarchy.subtopic).flat()
        return []
    }

    const addItemsToSection = (sectionType: SectionType, items: string[], hours: number) => {
        const contentType = sectionContentTypes[sectionType]
        const groupId = items.length > 1 ? Math.random().toString(36).substring(2, 9) : undefined

        if (items.length > 1) {
            const newGroup: ContentGroup = {
                id: groupId!,
                items: [...items],
                hours,
                sectionType,
                contentType,
                name: `Group of ${items.length} items`,
            }
            setContentGroups((prev) => [...prev, newGroup])
        }

        const newItems: ContentItem[] = items.map((item) => ({
            id: Math.random().toString(36).substring(2, 9),
            type: contentType,
            name: item,
            hours,
            groupId,
        }))

        setSectionData((prev) => ({
            ...prev,
            [sectionType]: [...prev[sectionType], ...newItems],
        }))

        setSelectedItems((prev) => ({
            ...prev,
            [sectionType]: [],
        }))
    }

    const updateItemHours = (sectionType: SectionType, itemId: string, newHours: number) => {
        setSectionData((prev) => ({
            ...prev,
            [sectionType]: prev[sectionType].map((item) => {
                if (item.id === itemId) {
                    // If item is part of a group, update all items in the group
                    if (item.groupId) {
                        const updatedItems = prev[sectionType].map((groupItem) =>
                            groupItem.groupId === item.groupId ? { ...groupItem, hours: newHours } : groupItem,
                        )
                        // Update the group record
                        setContentGroups((prevGroups) =>
                            prevGroups.map((group) => (group.id === item.groupId ? { ...group, hours: newHours } : group)),
                        )
                        return updatedItems.find((i) => i.id === itemId) || item
                    }
                    return { ...item, hours: newHours }
                }
                return item
            }),
        }))
    }

    const removeItem = (sectionType: SectionType, itemId: string) => {
        setSectionData((prev) => {
            const item = prev[sectionType].find((i) => i.id === itemId)
            if (item?.groupId) {
                // Remove entire group
                const groupItems = prev[sectionType].filter((i) => i.groupId === item.groupId)
                setContentGroups((prevGroups) => prevGroups.filter((g) => g.id !== item.groupId))
                return {
                    ...prev,
                    [sectionType]: prev[sectionType].filter((i) => i.groupId !== item.groupId),
                }
            }
            return {
                ...prev,
                [sectionType]: prev[sectionType].filter((i) => i.id !== itemId),
            }
        })
    }

    const toggleItemSelection = (sectionType: SectionType, itemName: string) => {
        setSelectedItems((prev) => ({
            ...prev,
            [sectionType]: prev[sectionType].includes(itemName)
                ? prev[sectionType].filter((item) => item !== itemName)
                : [...prev[sectionType], itemName],
        }))
    }

    const InlineHoursEditor = ({
        item,
        sectionType,
        onUpdate,
    }: {
        item: ContentItem
        sectionType: SectionType
        onUpdate: (hours: number) => void
    }) => {
        const [isEditing, setIsEditing] = useState(false)
        const [value, setValue] = useState(item.hours.toString())
        const inputRef = useRef<HTMLInputElement>(null)

        useEffect(() => {
            if (isEditing && inputRef.current) {
                inputRef.current.focus()
                inputRef.current.select()
            }
        }, [isEditing])

        const handleSave = () => {
            const hours = Number.parseFloat(value) || 0
            onUpdate(hours)
            setIsEditing(false)
        }

        const handleCancel = () => {
            setValue(item.hours.toString())
            setIsEditing(false)
        }

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") handleCancel()
        }

        if (isEditing) {
            return (
                <div className="flex items-center gap-0.5">
                    <Input
                        ref={inputRef}
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-5 w-12 text-xs p-1"
                        step="0.1"
                        min="0"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSave} className="h-5 w-5 p-0">
                        <Check className="h-2.5 w-2.5 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel} className="h-5 w-5 p-0">
                        <X className="h-2.5 w-2.5 text-red-600" />
                    </Button>
                </div>
            )
        }

        return (
            <div className="flex items-center gap-0.5 group">
                <span className="text-xs font-medium min-w-[1.5rem]">{item.hours.toFixed(1)}</span>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Edit3 className="h-2.5 w-2.5" />
                </Button>
            </div>
        )
    }

    const QuickAddSection = ({ sectionType }: { sectionType: SectionType }) => {
        const [quickHours, setQuickHours] = useState("")
        const contentType = sectionContentTypes[sectionType]
        const selectedCount = selectedItems[sectionType].length
        const config = sectionConfig[sectionType]

        // Add this function inside QuickAddSection component, before the hierarchicalItems declaration
        const getAssignedItemsInSection = (sectionType: SectionType): string[] => {
            return sectionData[sectionType].map((item) => item.name)
        }

        const assignedItems = getAssignedItemsInSection(sectionType)

        // Get hierarchical structure based on content type
        const getHierarchicalItems = (contentType: ContentType) => {
            switch (contentType) {
                case "module":
                    return contentHierarchy.module.map((module) => ({
                        parent: null,
                        items: [module],
                    }))

                case "submodule":
                    return Object.entries(contentHierarchy.submodule).map(([module, submodules]) => ({
                        parent: module,
                        items: submodules,
                    }))

                case "topic":
                    return Object.entries(contentHierarchy.topic).map(([submodule, topics]) => ({
                        parent: submodule,
                        items: topics,
                    }))

                case "subtopic":
                    return Object.entries(contentHierarchy.subtopic).map(([topic, subtopics]) => ({
                        parent: topic,
                        items: subtopics,
                    }))

                default:
                    return []
            }
        }

        const hierarchicalItems = getHierarchicalItems(contentType)

        return (
            <Card className={`${config.color} border`}>
                <CardHeader className="">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <config.icon className={`h-3 w-3 ${config.iconColor}`} />
                            <CardTitle className="text-xs">{config.title}</CardTitle>
                        </div>
                        <Select
                            value={contentType}
                            onValueChange={(value: ContentType) => {
                                setSectionContentTypes((prev) => ({ ...prev, [sectionType]: value }))
                                setSelectedItems((prev) => ({ ...prev, [sectionType]: [] }))
                            }}
                        >
                            <SelectTrigger className="h-6 bg-white shadow-md text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="module">Module</SelectItem>
                                <SelectItem value="submodule">Submodule</SelectItem>
                                <SelectItem value="topic">Topic</SelectItem>
                                <SelectItem value="subtopic">Subtopic</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* Item Selection with Hierarchy */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium">
                            Select {contentType}s:
                            {contentType !== "module" && (
                                <span className="text-gray-500 ml-1 text-xs">
                                    (grouped by {contentType === "submodule" ? "module" : contentType === "topic" ? "submodule" : "topic"}
                                    )
                                </span>
                            )}
                        </Label>
                        {assignedItems.length > 0 && (
                            <div className="text-xs text-gray-500 bg-gray-50 p-1 rounded">
                                <Info className="h-2.5 w-2.5 inline mr-1" />
                                {assignedItems.length} {contentType}(s) already assigned
                            </div>
                        )}
                        <div className="max-h-32 overflow-y-auto border rounded p-1 bg-white space-y-2">
                            {hierarchicalItems.map((group, groupIndex) => (
                                <div key={groupIndex} className="space-y-0.5">
                                    {/* Parent Header (if not module level) */}
                                    {group.parent && (
                                        <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-1 py-0.5 rounded flex items-center gap-1">
                                            <BookOpen className="h-2.5 w-2.5" />
                                            {group.parent}
                                        </div>
                                    )}

                                    {/* Child Items */}
                                    <div className={`space-y-0.5 ${group.parent ? "ml-3" : ""}`}>
                                        {group.items.map((item) => {
                                            const isAssigned = assignedItems.includes(item)
                                            return (
                                                <label
                                                    key={item}
                                                    className={`flex items-center gap-1 p-0.5 rounded cursor-pointer ${isAssigned ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:bg-gray-50 cursor-pointer"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems[sectionType].includes(item)}
                                                        onChange={() => !isAssigned && toggleItemSelection(sectionType, item)}
                                                        disabled={isAssigned}
                                                        className="h-2.5 w-2.5"
                                                    />
                                                    <span className={`text-xs flex items-center gap-1 ${isAssigned ? "text-gray-400" : ""}`}>
                                                        {contentType === "submodule" && <div className="w-1 h-1 bg-blue-400 rounded-full"></div>}
                                                        {contentType === "topic" && <div className="w-1 h-1 bg-green-400 rounded-full"></div>}
                                                        {contentType === "subtopic" && <div className="w-1 h-1 bg-purple-400 rounded-full"></div>}
                                                        {item}
                                                        {isAssigned && (
                                                            <Badge variant="secondary" className="text-xs ml-1 bg-gray-200 text-gray-500 px-1 py-0">
                                                                Assigned
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Add Controls */}
                    {selectedCount > 0 && (
                        <div className="flex items-center gap-1 p-1 bg-white rounded border">
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                                {selectedCount} selected
                            </Badge>
                            <Input
                                type="number"
                                placeholder="Hours"
                                value={quickHours}
                                onChange={(e) => setQuickHours(e.target.value)}
                                className="h-6 w-16 text-xs p-1"
                                step="0.1"
                                min="0"
                            />
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (quickHours && selectedCount > 0) {
                                        addItemsToSection(sectionType, selectedItems[sectionType], Number.parseFloat(quickHours))
                                        setQuickHours("")
                                    }
                                }}
                                disabled={!quickHours || selectedCount === 0}
                                className="h-6 text-xs px-2"
                            >
                                <Plus className="h-2.5 w-2.5 mr-0.5" />
                                Add
                            </Button>
                        </div>
                    )}

                    {/* Selected Items Preview */}
                    {selectedCount > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-1">
                            <Label className="text-xs font-medium text-blue-800">Selected items:</Label>
                            <div className="mt-0.5 flex flex-wrap gap-0.5">
                                {selectedItems[sectionType].map((item) => (
                                    <Badge key={item} variant="secondary" className="text-xs px-1 py-0">
                                        {item}
                                        <button
                                            onClick={() => toggleItemSelection(sectionType, item)}
                                            className="ml-0.5 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-2 w-2" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Added Items */}
                    <div className="space-y-0.5">
                        {sectionData[sectionType].length > 0 && <Label className="text-xs font-medium">Added items:</Label>}
                        {sectionData[sectionType]
                            .reduce(
                                (groups, item) => {
                                    if (item.groupId) {
                                        const existingGroup = groups.find((g) => g.groupId === item.groupId)
                                        if (existingGroup) {
                                            existingGroup.items.push(item)
                                        } else {
                                            groups.push({ groupId: item.groupId, items: [item] })
                                        }
                                    } else {
                                        groups.push({ groupId: null, items: [item] })
                                    }
                                    return groups
                                },
                                [] as Array<{ groupId: string | null; items: ContentItem[] }>,
                            )
                            .map((group, index) => (
                                <div key={group.groupId || `single-${index}`} className="bg-white rounded border p-1">
                                    {group.items.length > 1 ? (
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <Link className="h-2.5 w-2.5 text-blue-500" />
                                                    <span className="text-xs font-medium text-blue-600">Group ({group.items.length} items)</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <InlineHoursEditor
                                                        item={group.items[0]}
                                                        sectionType={sectionType}
                                                        onUpdate={(hours) => updateItemHours(sectionType, group.items[0].id, hours)}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeItem(sectionType, group.items[0].id)}
                                                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600 ml-3">
                                                {group.items.map((item) => item.name).join(", ")}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs">{group.items[0].name}</span>
                                                <Badge variant="outline" className="text-xs px-1 py-0">
                                                    {group.items[0].type}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <InlineHoursEditor
                                                    item={group.items[0]}
                                                    sectionType={sectionType}
                                                    onUpdate={(hours) => updateItemHours(sectionType, group.items[0].id, hours)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeItem(sectionType, group.items[0].id)}
                                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                                >
                                                    <X className="h-2.5 w-2.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    const PreviewTable = ({ sectionData }: { sectionData: Record<SectionType, ContentItem[]> }) => {
        const hierarchy = buildHierarchy(sectionData)

        // Calculate total rows needed for proper rowspan calculation
        const calculateTotalRows = (items: HierarchicalItem[]): number => {
            let totalRows = 0
            items.forEach((item) => {
                if (item.children.length === 0) {
                    totalRows += 1
                } else {
                    totalRows += calculateTotalRows(item.children)
                }
            })
            return totalRows
        }

        // Get all leaf nodes (bottom level items) for rendering
        const getLeafNodes = (items: HierarchicalItem[]): HierarchicalItem[] => {
            const leaves: HierarchicalItem[] = []

            const traverse = (nodes: HierarchicalItem[], path: HierarchicalItem[] = []) => {
                nodes.forEach((node) => {
                    const currentPath = [...path, node]
                    if (node.children.length === 0) {
                        // This is a leaf node, store the full path
                        leaves.push({
                            ...node,
                            // Store the path in a custom property for reference
                            path: currentPath,
                        } as any)
                    } else {
                        traverse(node.children, currentPath)
                    }
                })
            }

            traverse(items)
            return leaves
        }

        // Find items that should be merged based on groupId
        const findGroupedItems = (
            path: HierarchicalItem[],
            sectionType: SectionType,
        ): { items: HierarchicalItem[]; rowSpan: number; hours: number } | null => {
            // Check from most specific to least specific for grouped items
            for (let i = path.length - 1; i >= 0; i--) {
                const item = path[i]
                if (item.hours[sectionType] > 0 && item.groupId) {
                    // Find all items in the same group
                    const group = contentGroups.find((g) => g.id === item.groupId && g.sectionType === sectionType)
                    if (group) {
                        // Calculate total rowspan for all items in the group
                        const groupItems = group.items
                            .map((itemName) => {
                                const findInHierarchy = (items: HierarchicalItem[], name: string): HierarchicalItem | null => {
                                    for (const hierarchyItem of items) {
                                        if (hierarchyItem.name === name) return hierarchyItem
                                        const found = findInHierarchy(hierarchyItem.children, name)
                                        if (found) return found
                                    }
                                    return null
                                }
                                return findInHierarchy(hierarchy, itemName)
                            })
                            .filter(Boolean) as HierarchicalItem[]

                        const totalRowSpan = groupItems.reduce((sum, groupItem) => {
                            return sum + calculateTotalRows([groupItem])
                        }, 0)

                        return {
                            items: groupItems,
                            rowSpan: totalRowSpan,
                            hours: group.hours,
                        }
                    }
                }

                // Fallback to individual item if not grouped
                if (item.hours[sectionType] > 0) {
                    const rowSpan = calculateTotalRows([item])
                    return { items: [item], rowSpan, hours: item.hours[sectionType] }
                }
            }
            return null
        }

        // Track which cells have already been rendered to avoid duplicates
        const renderedCells = new Set<string>()

        // Calculate totals - Fixed to handle grouped items correctly
        const calculateTotalsForPreview = () => {
            const totals: Record<SectionType, number> = {
                iDoLearning: 0,
                iDoLecture: 0,
                weDoGroup: 0,
                weDoCase: 0,
                youDoAssignment: 0,
                youDoPractice: 0,
            }

            Object.entries(sectionData).forEach(([sectionKey, items]) => {
                const section = sectionKey as SectionType
                const processedGroups = new Set<string>() // Track processed groups

                items.forEach((item: { hours: number; groupId?: string }) => {
                    if (item.groupId) {
                        // If item is part of a group and we haven't processed this group yet
                        if (!processedGroups.has(item.groupId)) {
                            totals[section] += item.hours // Add hours only once per group
                            processedGroups.add(item.groupId)
                        }
                        // If group already processed, skip (don't add hours again)
                    } else {
                        // Individual item, add its hours
                        totals[section] += item.hours
                    }
                })
            })

            return totals
        }

        const renderHierarchicalRows = (): React.JSX.Element[] => {
            const leafNodes = getLeafNodes(hierarchy)
            const rows: React.JSX.Element[] = []

            leafNodes.forEach((leaf, index) => {
                const path = (leaf as any).path as HierarchicalItem[]

                rows.push(
                    <tr key={leaf.id} className="border-b border-slate-200">
                        {/* Module Column */}
                        {path[0] &&
                            !renderedCells.has(`module-${path[0].name}`) &&
                            (() => {
                                renderedCells.add(`module-${path[0].name}`)
                                const rowSpan = calculateTotalRows([path[0]])
                                return (
                                    <td rowSpan={rowSpan} className="border border-slate-300 text-xs p-1 font-medium bg-blue-50">
                                        {path[0].name}
                                    </td>
                                )
                            })()}

                        {/* Submodule Column */}
                        {path[1] &&
                            !renderedCells.has(`submodule-${path[1].name}`) &&
                            (() => {
                                renderedCells.add(`submodule-${path[1].name}`)
                                const rowSpan = calculateTotalRows([path[1]])
                                return (
                                    <td rowSpan={rowSpan} className="border border-slate-300 text-xs p-1 bg-blue-25">
                                        {path[1].name}
                                    </td>
                                )
                            })()}

                        {/* Topic Column */}
                        {path[2] &&
                            !renderedCells.has(`topic-${path[2].name}`) &&
                            (() => {
                                renderedCells.add(`topic-${path[2].name}`)
                                const rowSpan = calculateTotalRows([path[2]])
                                return (
                                    <td rowSpan={rowSpan} className="border border-slate-300 text-xs p-1">
                                        {path[2].name}
                                    </td>
                                )
                            })()}

                        {/* Subtopic Column */}
                        <td className="border border-slate-300 text-xs p-1">
                            {path[3] ? path[3].name : path[2] ? path[2].name : "-"}
                        </td>

                        {/* Learning Level */}
                        <td className="border border-slate-300 text-xs p-1 text-center bg-gray-50">Basic</td>

                        {/* Hours Columns with Group Merging - Fixed calculation */}
                        {(
                            [
                                "iDoLearning",
                                "iDoLecture",
                                "weDoGroup",
                                "weDoCase",
                                "youDoAssignment",
                                "youDoPractice",
                            ] as SectionType[]
                        ).map((sectionType) => {
                            const groupedItems = findGroupedItems(path, sectionType)

                            if (groupedItems && groupedItems.items.length > 0) {
                                // Check if this is the first item in the group to render the merged cell
                                const firstItemInGroup = groupedItems.items[0]
                                const cellKey = `${sectionType}-group-${firstItemInGroup.groupId || firstItemInGroup.name}`

                                if (!renderedCells.has(cellKey)) {
                                    renderedCells.add(cellKey)
                                    return (
                                        <td
                                            key={sectionType}
                                            rowSpan={groupedItems.rowSpan}
                                            className="border border-slate-300 text-xs p-1 text-center bg-blue-50"
                                        >
                                            <div className="font-medium">{groupedItems.hours.toFixed(1)}</div>
                                            {groupedItems.items.length > 1 && (
                                                <div className="text-xs text-slate-500 mt-0.5">(Group of {groupedItems.items.length})</div>
                                            )}
                                        </td>
                                    )
                                }
                            } else {
                                // No hours for this section
                                const cellKey = `${sectionType}-${path.map((p) => p.name).join("-")}`
                                if (!renderedCells.has(cellKey)) {
                                    renderedCells.add(cellKey)
                                    return (
                                        <td key={sectionType} className="border border-slate-300 text-xs p-1 text-center">
                                            -
                                        </td>
                                    )
                                }
                            }
                            return null
                        })}
                    </tr>,
                )
            })

            return rows
        }

        // Calculate totals
        const totals = calculateTotalsForPreview()
        const grandTotal = Object.values(totals).reduce((sum, hours) => sum + hours, 0)

        return (
            <Card className="mt-3">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Course Structure Preview</CardTitle>
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs font-semibold px-1 py-1">
                                Total: {grandTotal.toFixed(1)} Hours
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center shadow-md gap-1 h-6 px-2 text-xs"
                            >
                                {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                {showPreview ? "Hide Preview" : "Show Preview"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {showPreview && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-slate-300">
                                <thead>
                                    <tr>
                                        <th
                                            rowSpan={3}
                                            className="border border-slate-300 bg-blue-100 text-center text-xs font-semibold p-1 w-16"
                                        >
                                            Module
                                        </th>
                                        <th
                                            rowSpan={3}
                                            className="border border-slate-300 bg-blue-100 text-center text-xs font-semibold p-1 w-24"
                                        >
                                            Submodule
                                        </th>
                                        <th
                                            rowSpan={3}
                                            className="border border-slate-300 bg-blue-100 text-center text-xs font-semibold p-1 w-24"
                                        >
                                            Topic
                                        </th>
                                        <th
                                            rowSpan={3}
                                            className="border border-slate-300 bg-blue-100 text-center text-xs font-semibold p-1 w-24"
                                        >
                                            Subtopic
                                        </th>
                                        <th
                                            rowSpan={3}
                                            className="border border-slate-300 bg-blue-100 text-center text-xs font-semibold p-1 w-16"
                                        >
                                            Learning Level
                                        </th>
                                        <th
                                            colSpan={6}
                                            className="border border-slate-300 bg-yellow-200 text-center text-xs font-semibold p-1"
                                        >
                                            Teaching Learning Elements
                                        </th>
                                    </tr>
                                    <tr>
                                        <th
                                            colSpan={2}
                                            className="border border-slate-300 bg-yellow-100 text-center text-xs font-semibold p-1"
                                        >
                                            I Do
                                        </th>
                                        <th
                                            colSpan={2}
                                            className="border border-slate-300 bg-green-100 text-center text-xs font-semibold p-1"
                                        >
                                            We Do
                                        </th>
                                        <th
                                            colSpan={2}
                                            className="border border-slate-300 bg-blue-100 text-center text-xs font-semibold p-1"
                                        >
                                            You Do
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="border border-slate-300 bg-yellow-50 text-center text-xs font-semibold p-0.5">
                                            Learning Skills
                                        </th>
                                        <th className="border border-slate-300 bg-yellow-50 text-center text-xs font-semibold p-0.5">
                                            Lecture Hours
                                        </th>
                                        <th className="border border-slate-300 bg-green-50 text-center text-xs font-semibold p-0.5">
                                            Group Activities
                                        </th>
                                        <th className="border border-slate-300 bg-green-50 text-center text-xs font-semibold p-0.5">
                                            Case Studies
                                        </th>
                                        <th className="border border-slate-300 bg-blue-50 text-center text-xs font-semibold p-0.5">
                                            Assignments
                                        </th>
                                        <th className="border border-slate-300 bg-blue-50 text-center text-xs font-semibold p-0.5">
                                            Practice
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderHierarchicalRows()}

                                    {/* Totals Row */}
                                    <tr className="bg-slate-50 font-semibold">
                                        <td colSpan={5} className="border border-slate-300 text-xs p-1 text-right">
                                            Total Hours
                                        </td>
                                        <td className="border border-slate-300 text-xs p-1 text-center">{totals.iDoLearning.toFixed(1)}</td>
                                        <td className="border border-slate-300 text-xs p-1 text-center">{totals.iDoLecture.toFixed(1)}</td>
                                        <td className="border border-slate-300 text-xs p-1 text-center">{totals.weDoGroup.toFixed(1)}</td>
                                        <td className="border border-slate-300 text-xs p-1 text-center">{totals.weDoCase.toFixed(1)}</td>
                                        <td className="border border-slate-300 text-xs p-1 text-center">
                                            {totals.youDoAssignment.toFixed(1)}
                                        </td>
                                        <td className="border border-slate-300 text-xs p-1 text-center">
                                            {totals.youDoPractice.toFixed(1)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Quick Summary Cards - Always Visible */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
                        {Object.entries(sectionConfig).map(([key, config]) => {
                            const sectionKey = key as SectionType
                            const hours = totals[sectionKey]
                            return (
                                <Card key={key} className={`${config.color} text-center`}>
                                    <CardContent className="p-2">
                                        <config.icon className={`h-3 w-3 mx-auto mb-0.5 ${config.iconColor}`} />
                                        <div className="text-sm font-bold">{hours.toFixed(1)}</div>
                                        <div className="text-xs text-gray-600">{config.title}</div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <DashboardLayoutProgramcoordinator>
            <TooltipProvider>
                <div className="space-y-3 p-2 mx-auto">
                    {/* Breadcrumb */}
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard" className="text-xs">
                                    Dashboard
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/programcoordinator/pages/courseadd" className="text-xs">
                                    Course Structure
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-xs">Pedagogy Builder</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold">Course Structure Builder</h1>
                            <p className="text-xs text-gray-600">Design your course pedagogy with I Do, We Do, You Do methodology</p>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                    <Info className="h-3 w-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                                <p className="text-xs">
                                    <strong>I Do:</strong> Instructor-led learning
                                    <br />
                                    <strong>We Do:</strong> Collaborative activities
                                    <br />
                                    <strong>You Do:</strong> Independent practice
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Main Content */}
                    <Tabs defaultValue="builder" className="space-y-3">
                        <TabsList className="h-8 rounded-lg bg-muted p-1 flex gap-1 shadow-sm">
                            <TabsTrigger
                                value="builder"
                                className="text-sm px-4 py-1.5 rounded-md transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-white hover:text-primary"
                            >
                                Builder
                            </TabsTrigger>
                            <TabsTrigger
                                value="preview"
                                className="text-sm px-4 py-1.5 rounded-md transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-white hover:text-primary"
                            >
                                Preview & Summary
                            </TabsTrigger>
                        </TabsList>


                        <TabsContent value="builder" className="space-y-3">
                            {/* I Do Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 mb-2">
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                    <h2 className="text-sm font-semibold">I Do - Instructor Led</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-2">
                                    <QuickAddSection sectionType="iDoLearning" />
                                    <QuickAddSection sectionType="iDoLecture" />
                                </div>
                            </div>

                            {/* We Do Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 mb-2">
                                    <Users className="h-4 w-4 text-green-600" />
                                    <h2 className="text-sm font-semibold">We Do - Collaborative</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-2">
                                    <QuickAddSection sectionType="weDoGroup" />
                                    <QuickAddSection sectionType="weDoCase" />
                                </div>
                            </div>

                            {/* You Do Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 mb-2">
                                    <PenTool className="h-4 w-4 text-purple-600" />
                                    <h2 className="text-sm font-semibold">You Do - Independent</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-2">
                                    <QuickAddSection sectionType="youDoAssignment" />
                                    <QuickAddSection sectionType="youDoPractice" />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview">
                            <PreviewTable sectionData={sectionData} />
                        </TabsContent>
                    </Tabs>
                </div>
            </TooltipProvider>
        </DashboardLayoutProgramcoordinator>
    )
}

