
"use client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, Search, BookOpen, Clock, Users, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Copy, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayoutProgramcoordinator from "../../components/layout";
import AddItemPopup from "../../components/mainaddpopup";

// Types
interface CourseItem {
    id: string;
    title: string;
    duration: string;
    lessons: number;
    status: "Published" | "Draft" | "Unpublished";
    children?: CourseItem[];
}

interface NavigationState {
    level: number; // 0 = first level, 1 = second level, etc.
    path: string[]; // Array of parent IDs/names for breadcrumb
    parentId?: string; // ID of parent item
    currentData: any[];
}

export default function DynamicCourseStructurePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State for selected course structure level
    const [selectedLevel, setSelectedLevel] = useState<string>("module-submodule-topic-subtopic");

    // Navigation state
    const [navigationState, setNavigationState] = useState<NavigationState>({
        level: 0,
        path: [],
        parentId: undefined,
        currentData: [] // Add this to track current level data
    });

    // State for popup
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    // Initialize with empty data
    const [courseData, setCourseData] = useState<CourseItem[]>([]);

    // Course structure options
    const courseStructureOptions = [
        { value: "module-submodule-topic-subtopic", label: "Module → Submodule → Topic → Subtopic" },
        { value: "module-submodule-topic", label: "Module → Submodule → Topic" },
        { value: "module-topic-subtopic", label: "Module → Topic → Subtopic" },
        { value: "module-topic", label: "Module → Topic" },
        { value: "topic-subtopic", label: "Topic → Subtopic" },
        { value: "topic", label: "Topic Only" }
    ];

    // Initialize navigation from URL params
    useEffect(() => {
        const level = searchParams.get('level') ? parseInt(searchParams.get('level')!) : 0;
        const pathStr = searchParams.get('path');
        const parentId = searchParams.get('parentId');
        const structure = searchParams.get('structure');

        if (structure) {
            setSelectedLevel(structure);
        }

        // Get the current data based on parentId
        const currentData = parentId ? getChildrenById(parentId) : courseData;

        setNavigationState({
            level,
            path: pathStr ? pathStr.split(',') : [],
            parentId: parentId || undefined,
            currentData // Store the current level data
        });
    }, [searchParams, courseData]);

    // Helper function to get children by parent ID
    const getChildrenById = (parentId: string): CourseItem[] => {
        const findItem = (items: CourseItem[]): CourseItem | null => {
            for (const item of items) {
                if (item.id === parentId) return item;
                if (item.children) {
                    const found = findItem(item.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const parentItem = findItem(courseData);
        return parentItem?.children || [];
    };
    // Get levels array from selected structure
    const getLevels = () => {
        return selectedLevel.split('-');
    };

    // Get current level name
    const getCurrentLevel = () => {
        const levels = getLevels();
        return levels[navigationState.level] || levels[levels.length - 1];
    };

    // Get next level name
    const getNextLevel = () => {
        const levels = getLevels();
        return levels[navigationState.level + 1] || null;
    };

    // Get current level display name
    const getCurrentLevelDisplayName = () => {
        const level = getCurrentLevel();
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    // Get next level display name
    const getNextLevelDisplayName = () => {
        const level = getNextLevel();
        return level ? level.charAt(0).toUpperCase() + level.slice(1) : null;
    };

    // Check if we should show the next level column
    const shouldShowNextLevelColumn = () => {
        return getNextLevel() !== null && navigationState.level < getLevels().length - 1;
    };

    // Get current data to display based on navigation state
    // Get current data to display based on navigation state
    const getCurrentData = (): CourseItem[] => {
        if (navigationState.level === 0) {
            return courseData;
        }

        // Navigate to the correct level based on parentId
        if (!navigationState.parentId) return [];

        const findItemById = (items: CourseItem[], id: string): CourseItem | null => {
            for (const item of items) {
                if (item.id === id) return item;
                if (item.children) {
                    const found = findItemById(item.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const parentItem = findItemById(courseData, navigationState.parentId);
        return parentItem?.children || [];
    };

    // Navigate to next level
    // Navigate to next level
    const navigateToNextLevel = (item: CourseItem) => {
        const newPath = [...navigationState.path];
        // Only add to path if we're at the expected level
        if (newPath.length === navigationState.level) {
            newPath.push(item.title);
        } else {
            // If we're not at the expected level (due to navigation), replace from current level
            newPath.splice(navigationState.level, newPath.length - navigationState.level, item.title);
        }

        const newLevel = navigationState.level + 1;
        const newCurrentData = item.children || [];

        const params = new URLSearchParams();
        params.set('level', newLevel.toString());
        params.set('path', newPath.join(','));
        params.set('parentId', item.id);
        params.set('structure', selectedLevel);

        setNavigationState(prev => ({
            ...prev,
            level: newLevel,
            path: newPath,
            parentId: item.id,
            currentData: newCurrentData
        }));

        router.push(`?${params.toString()}`);
    };

    // Navigate back to previous level
    const navigateBack = () => {
        if (navigationState.level > 0) {
            const newPath = navigationState.path.slice(0, -1);
            const newLevel = navigationState.level - 1;

            // Get the new parent ID
            let newParentId: string | undefined = undefined;
            if (newLevel > 0) {
                // Find the parent of the current parent
                newParentId = findParentId(navigationState.parentId);
            }

            // Get the data for the previous level
            const newCurrentData = newParentId ? getChildrenById(newParentId) : courseData;

            const params = new URLSearchParams();
            params.set('level', newLevel.toString());
            if (newPath.length > 0) {
                params.set('path', newPath.join(','));
            }
            if (newParentId) {
                params.set('parentId', newParentId);
            }
            params.set('structure', selectedLevel);

            setNavigationState({
                level: newLevel,
                path: newPath,
                parentId: newParentId,
                currentData: newCurrentData
            });

            router.push(`?${params.toString()}`);
        }
    };

    // Helper function to find parent ID
    const findParentId = (childId: string): string | undefined => {
        const findParent = (items: CourseItem[], targetId: string): CourseItem | null => {
            for (const item of items) {
                if (item.children?.some(child => child.id === targetId)) {
                    return item;
                }
                if (item.children) {
                    const found = findParent(item.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findParent(courseData, childId);
        return parent?.id;
    };

    // Handle structure change - reset navigation
    const handleStructureChange = (newStructure: string) => {
        setSelectedLevel(newStructure);
        setNavigationState({ level: 0, path: [], parentId: undefined });

        const params = new URLSearchParams();
        params.set('structure', newStructure);
        router.push(`?${params.toString()}`);
    };

    const findItemIdByPath = (path: string[]): string | undefined => {
        let currentItems = courseData;
        let parentId: string | undefined = undefined;

        for (const pathItem of path) {
            const item = currentItems.find(i => i.title === pathItem);
            if (!item) return undefined;

            parentId = item.id;
            currentItems = item.children || [];
        }

        return parentId;
    };

    // Generate breadcrumbs
    // Generate breadcrumbs
    const generateBreadcrumbs = () => {
        const breadcrumbs = [
            {
                href: "/programcoordinator/pages/dashboardprogramcoordinator",
                title: "Dashboard",
                isLink: true
            },
            {
                href: "/programcoordinator/pages/courseadd",
                title: "Course Structure",
                isLink: true
            }
        ];

        // Add path-based breadcrumbs up to current level
        for (let i = 0; i < navigationState.level; i++) {
            const level = i;
            const params = new URLSearchParams();
            params.set('level', level.toString());
            params.set('path', navigationState.path.slice(0, level + 1).join(','));

            // Get parent ID for this level
            let parentId: string | undefined = undefined;
            if (level > 0) {
                // Find the parent ID by traversing the path
                let currentItems = courseData;
                for (let j = 0; j < level; j++) {
                    const pathItem = navigationState.path[j];
                    const item = currentItems.find(item => item.title === pathItem);
                    if (!item) break;
                    parentId = item.id;
                    currentItems = item.children || [];
                }
            }

            if (parentId) {
                params.set('parentId', parentId);
            }
            params.set('structure', selectedLevel);

            breadcrumbs.push({
                href: `?${params.toString()}`,
                title: navigationState.path[i],
                level: level,
                parentId: parentId,
                isLink: true
            });
        }

        return breadcrumbs;
    };

    // Helper function to get parent ID at a specific level
    const getParentIdAtLevel = (targetLevel: number) => {
        if (targetLevel === 0) return undefined;

        let currentLevel = 0;
        let currentData = courseData;
        let parentId: string | undefined = undefined;

        while (currentLevel < targetLevel && currentData.length > 0) {
            // Find the item that matches our current path
            const pathItem = navigationState.path[currentLevel];
            const item = currentData.find(i => i.title === pathItem);

            if (!item) break;

            parentId = item.id;
            currentData = item.children || [];
            currentLevel++;
        }

        return parentId;
    };

    // Handle adding new item
    // Handle adding new item
    // Handle adding new item
    const handleAddItem = (newItem: any) => {
        setCourseData(prev => {
            const newData = JSON.parse(JSON.stringify(prev)); // Deep clone

            if (navigationState.level === 0) {
                // Add to root level
                newData.push({ ...newItem, children: [] });
            } else if (navigationState.parentId) {
                // Find and add to parent
                const findAndAdd = (items: CourseItem[]): boolean => {
                    for (const item of items) {
                        if (item.id === navigationState.parentId) {
                            if (!item.children) {
                                item.children = [];
                            }
                            item.children.push({ ...newItem, children: [] });
                            return true;
                        }
                        if (item.children) {
                            if (findAndAdd(item.children)) {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                findAndAdd(newData);
            }

            return newData;
        });

        // Update the navigation state to reflect the addition
        setNavigationState(prev => {
            // Get updated children for current level
            const updatedChildren = navigationState.parentId
                ? getChildrenById(navigationState.parentId)
                : courseData;

            return {
                ...prev,
                currentData: updatedChildren
            };
        });
    };

    // Handle deleting an item
    const handleDeleteItem = (itemId: string) => {
        setCourseData(prev => {
            if (navigationState.level === 0) {
                // Delete from root level
                return prev.filter(item => item.id !== itemId);
            } else {
                // Delete from nested level
                const newData = [...prev];
                const pathIds = navigationState.path.slice(0, -1); // Remove the last item (current page title)

                let currentLevel = newData;

                // Traverse to the parent level
                for (const pathId of pathIds) {
                    const parentIndex = currentLevel.findIndex(item => item.id === pathId);
                    if (parentIndex >= 0) {
                        if (!currentLevel[parentIndex].children) {
                            // No children to delete from
                            return prev;
                        }
                        currentLevel = currentLevel[parentIndex].children || [];
                    } else {
                        // Parent not found, return previous state
                        return prev;
                    }
                }

                // Delete the item
                const filteredLevel = currentLevel.filter(item => item.id !== itemId);

                // Update the parent's children
                let parentLevel = newData;
                for (const pathId of pathIds) {
                    const parentIndex = parentLevel.findIndex(item => item.id === pathId);
                    if (parentIndex >= 0) {
                        if (pathId === pathIds[pathIds.length - 1]) {
                            // We're at the direct parent level
                            parentLevel[parentIndex].children = filteredLevel;
                            break;
                        }
                        parentLevel = parentLevel[parentIndex].children || [];
                    }
                }

                return newData;
            }
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Published":
                return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "Draft":
                return "bg-amber-50 text-amber-700 border border-amber-200";
            case "Unpublished":
                return "bg-slate-50 text-slate-600 border border-slate-200";
            default:
                return "bg-slate-50 text-slate-600 border border-slate-200";
        }
    };

    const currentData = getCurrentData();
    const breadcrumbs = generateBreadcrumbs();

    return (
        <DashboardLayoutProgramcoordinator>
            <div className="mx-auto">
                {/* Breadcrumbs */}
                <div className="mb-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {generateBreadcrumbs().map((breadcrumb, index) => (
                                <div key={index} className="flex items-center">
                                    {index > 0 && <BreadcrumbSeparator className="text-slate-400" />}
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            href={breadcrumb.href}
                                            className="text-slate-600 hover:text-indigo-600 transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const newCurrentData = breadcrumb.parentId
                                                    ? getChildrenById(breadcrumb.parentId)
                                                    : courseData;

                                                setNavigationState({
                                                    level: breadcrumb.level || 0,
                                                    path: navigationState.path.slice(0, (breadcrumb.level || 0) + 1),
                                                    parentId: breadcrumb.parentId,
                                                    currentData: newCurrentData
                                                });

                                                router.push(breadcrumb.href);
                                            }}
                                        >
                                            {breadcrumb.title}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                </div>
                            ))}
                            {/* Current page - not clickable */}
                            <div className="flex items-center">
                                <BreadcrumbSeparator className="text-slate-400" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-slate-900 font-medium">
                                        Add {getCurrentLevelDisplayName()}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </div>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Back button for deeper levels */}
                {navigationState.level > 0 && (
                    <div className="mb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={navigateBack}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to {navigationState.path[navigationState.path.length - 1] || 'Previous Level'}
                        </Button>
                    </div>
                )}

                {/* Course Structure Level Selector - Only show at root level */}
                {navigationState.level === 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">Course Structure:</span>
                            <Select value={selectedLevel} onValueChange={handleStructureChange}>
                                <SelectTrigger className="w-[300px]">
                                    <SelectValue placeholder="Select course structure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseStructureOptions?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {/* Header with search and add button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="relative w-full sm:flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={`Search ${getCurrentLevel()}s...`}
                            className="w-full pl-8 bg-slate-50/80 border-slate-200 text-xs h-8 focus:ring-0 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Select>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                                <SelectItem value="published" className="text-xs">Published</SelectItem>
                                <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                                <SelectItem value="unpublished" className="text-xs">Unpublished</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            size={'sm'}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-5 hover:cursor-pointer whitespace-nowrap"
                            onClick={() => setIsPopupOpen(true)}
                        >
                            <PlusIcon className="h-4 w-4" />
                            Add {getCurrentLevelDisplayName()}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 hover:bg-slate-100/70 border-b border-slate-200">
                                <TableHead className="font-semibold text-slate-700 py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        {getCurrentLevelDisplayName()} Title
                                    </div>
                                </TableHead>
                                <TableHead className="text-center font-semibold text-slate-700 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Duration
                                    </div>
                                </TableHead>
                                <TableHead className="text-center font-semibold text-slate-700 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Items
                                    </div>
                                </TableHead>
                                <TableHead className="text-center font-semibold text-slate-700 py-4">Status</TableHead>
                                {shouldShowNextLevelColumn() && (
                                    <TableHead className="text-center font-semibold text-slate-700 py-4">
                                        {getNextLevelDisplayName()}s
                                    </TableHead>
                                )}
                                <TableHead className="text-right font-semibold text-slate-700 py-4 px-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="text-sm">
                            {currentData.length > 0 ? (
                                navigationState?.currentData?.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        className="hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100 group"
                                    >
                                        <TableCell className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-xs">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs">
                                                        {item.title}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-medium">
                                                <Clock className="h-3 w-3" />
                                                {item.duration}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 rounded-full text-blue-700 text-xs font-medium">
                                                <Users className="h-3 w-3" />
                                                {item.lessons}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusStyle(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </TableCell>
                                        {shouldShowNextLevelColumn() && (
                                            <TableCell className="text-center py-4">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-3 text-xs bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100 hover:border-green-300 transition-all duration-200"
                                                    onClick={() => navigateToNextLevel(item)}
                                                >
                                                    <PlusIcon className="h-3 w-3 mr-1" />
                                                    View & Add {getNextLevelDisplayName()}
                                                </Button>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right py-4 px-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem className="text-slate-700 hover:text-indigo-600">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-slate-700 hover:text-blue-600">
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteItem(item.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={shouldShowNextLevelColumn() ? 6 : 5} className="py-8 text-center text-slate-500">
                                        No {getCurrentLevel()}s found. Click "Add {getCurrentLevelDisplayName()}" to create one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Add Item Popup */}
                <AddItemPopup
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    onAdd={handleAddItem}
                    levelName={getCurrentLevelDisplayName()}
                    nextLevelName={getNextLevelDisplayName()}
                />
            </div>
        </DashboardLayoutProgramcoordinator>
    );
}