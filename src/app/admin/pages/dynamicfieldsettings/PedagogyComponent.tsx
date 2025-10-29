"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    BookOpen,
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    Send,
    AlertTriangle,
    User,
    Users,
    HelpCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserTable } from "@/components/ui/alterationTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { pedagogyStructureApi } from "@/apiServices/dynamicFields/pedagogyStructureService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PedagogyElement {
    id: string;
    name: string;
    _id?: string;
}

interface PedagogyActivity {
    id: string;
    name: string;
    title: string;
    icon: React.ReactNode;
    elements: PedagogyElement[];
}

interface Column<T> {
    key: string;
    label: string;
    width: string;
    align: "left" | "center" | "right";
    renderCell?: (item: T, index?: number) => React.ReactNode;
}

export default function PedagogyManagementComponent() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedActivity, setSelectedActivity] = useState<PedagogyActivity | null>(null);
    const [showElementsPopup, setShowElementsPopup] = useState(false);
    const [showElementForm, setShowElementForm] = useState(false);
    const [editingElement, setEditingElement] = useState<PedagogyElement | null>(null);
    const [elementFormData, setElementFormData] = useState({ name: "" });
    const [currentPage, setCurrentPage] = useState(1);
    const [elementCurrentPage, setElementCurrentPage] = useState(1);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [elementToDelete, setElementToDelete] = useState<PedagogyElement | null>(null);


    const [localActivities, setLocalActivities] = useState<PedagogyActivity[]>([]);

    const queryClient = useQueryClient();
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('smartcliff_token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    // React Query hooks
    const { data: structures, isLoading, error } = useQuery(pedagogyStructureApi.getAll());


    // Update localActivities when structures data changes
    useEffect(() => {
        if (structures && !isLoading && !error) {
            setLocalActivities(transformStructureToActivities(structures));
        }
    }, [structures, isLoading, error]);

    // Mutation hooks
    const createElementMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error("Authentication token not found.");
            const structureId = structures && structures[0]?._id;

            const sectionMap = {
                "i_do": "I_Do",
                "we_do": "We_Do",
                "you_do": "You_Do"
            } as const;

            const section = sectionMap[selectedActivity?.id as keyof typeof sectionMap];

            // For creating, we need to add to the existing array
            const updateData = {
                [section]: [data.name]
            };

            if (structureId) {
                // Update existing structure
                return pedagogyStructureApi.create().mutationFn(updateData);
            } else {
                // Create new structure
                return pedagogyStructureApi.create().mutationFn(updateData);
            }
        },

        onMutate: async (newElement) => {
            // Optimistically update the UI
            if (selectedActivity) {
                setLocalActivities(prev => {
                    return prev.map(activity => {
                        if (activity.id === selectedActivity.id) {
                            const newElementWithId = {
                                id: `${selectedActivity.id}_${activity.elements.length}`,
                                name: newElement.name,
                                originalIndex: activity.elements.length
                            };
                            return {
                                ...activity,
                                elements: [...activity.elements, newElementWithId]
                            };
                        }
                        return activity;
                    });
                });

                // Also update the selectedActivity in state
                setSelectedActivity(prev => {
                    if (!prev) return prev;
                    const newElementWithId = {
                        id: `${prev.id}_${prev.elements.length}`,
                        name: newElement.name,
                        originalIndex: prev.elements.length
                    };
                    return {
                        ...prev,
                        elements: [...prev.elements, newElementWithId]
                    };
                });
            }
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedagogyStructures'] });
            toast.success("Element created successfully");
        },
        onError: (error: any) => {
            toast.error(`Error creating element: ${error.message}`);
        }
    });
    const updateElementMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error("Authentication token not found.");
            const structureId = structures && structures[0]?._id;
            if (!structureId) throw new Error("No structure found");

            const sectionMap = {
                "i_do": "I_Do",
                "we_do": "We_Do",
                "you_do": "You_Do"
            } as const;

            const section = sectionMap[selectedActivity?.id as keyof typeof sectionMap];

            const currentStructure = structures[0];
            const currentArray = currentStructure[section] || [];

            // Find the index of the element to update
            const elementIndex = currentArray.findIndex((_item: any, index: number) =>
                `i_do_${index}` === data.elementId ||
                `we_do_${index}` === data.elementId ||
                `you_do_${index}` === data.elementId
            );

            if (elementIndex === -1) throw new Error("Element not found");

            // Use the new index-based update endpoint
            const updateData = {
                section: section,
                index: elementIndex,
                newValue: data.name
            };

            // Use the correct update endpoint
            return pedagogyStructureApi.updateArrayElement(structureId).mutationFn(updateData);
        },
        onMutate: async (updatedElement) => {
            // Extract index from element ID
            const index = parseInt(updatedElement.elementId.split('_').pop() || '0');

            // Optimistically update the UI
            if (selectedActivity) {
                setLocalActivities(prev => {
                    return prev.map(activity => {
                        if (activity.id === selectedActivity.id) {
                            const updatedElements = activity.elements.map((el, i) =>
                                i === index ? { ...el, name: updatedElement.name } : el
                            );
                            return {
                                ...activity,
                                elements: updatedElements
                            };
                        }
                        return activity;
                    });
                });

                // Also update the selectedActivity in state
                setSelectedActivity(prev => {
                    if (!prev) return prev;
                    const updatedElements = prev.elements.map((el, i) =>
                        i === index ? { ...el, name: updatedElement.name } : el
                    );
                    return {
                        ...prev,
                        elements: updatedElements
                    };
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedagogyStructures'] });
            toast.success("Element updated successfully");
        },
        onError: (error: any) => {
            toast.error(`Error updating element: ${error.message}`);
        }
    });

    const deleteElementMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error("Authentication token not found.");
            const structureId = structures && structures[0]?._id;
            if (!structureId) throw new Error("No structure found");

            const sectionMap = {
                "i_do": "I_Do",
                "we_do": "We_Do",
                "you_do": "You_Do"
            } as const;

            const section = sectionMap[selectedActivity?.id as keyof typeof sectionMap];

            // Get current array
            const currentStructure = structures[0];
            const currentArray = currentStructure[section] || [];

            // Find the index of the element to delete
            const elementIndex = currentArray.findIndex((_item: any, index: number) =>
                `i_do_${index}` === data.elementId ||
                `we_do_${index}` === data.elementId ||
                `you_do_${index}` === data.elementId
            );

            if (elementIndex === -1) throw new Error("Element not found");

            // Use the new index-based delete endpoint
            const deleteData = {
                section: section,
                index: elementIndex
            };

            // Use the correct delete endpoint
            return pedagogyStructureApi.deleteArrayElement(structureId).mutationFn(deleteData);
        },
        onMutate: async (deletedElement) => {
            // Extract index from element ID
            const index = parseInt(deletedElement.elementId.split('_').pop() || '0');

            // Optimistically update the UI
            if (selectedActivity) {
                setLocalActivities(prev => {
                    return prev.map(activity => {
                        if (activity.id === selectedActivity.id) {
                            const updatedElements = activity.elements.filter((_, i) => i !== index);
                            return {
                                ...activity,
                                elements: updatedElements
                            };
                        }
                        return activity;
                    });
                });

                // Also update the selectedActivity in state
                setSelectedActivity(prev => {
                    if (!prev) return prev;
                    const updatedElements = prev.elements.filter((_, i) => i !== index);
                    return {
                        ...prev,
                        elements: updatedElements
                    };
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedagogyStructures'] });
            toast.success("Element deleted successfully");
        },
        onError: (error: any) => {
            toast.error(`Error deleting element: ${error.message}`);
        }
    });

    const ITEMS_PER_PAGE = 5;

    // Transform database structure to component format
    const transformStructureToActivities = (dbStructures: any[]): PedagogyActivity[] => {
        if (!dbStructures || dbStructures.length === 0) return [];

        // Get the first structure (assuming one structure per institution)
        const structure = dbStructures[0];

        return [
            {
                id: "i_do",
                name: "I_Do",
                title: "I Do (Teacher Demonstration)",
                icon: <User className="h-4 w-4 text-blue-600" />,
                elements: structure.I_Do?.map((item: string, index: number) => ({
                    id: `i_do_${index}`,
                    name: item,
                })) || [],
            },
            {
                id: "we_do",
                name: "We_Do",
                title: "We Do (Guided Practice)",
                icon: <Users className="h-4 w-4 text-green-600" />,
                elements: structure.We_Do?.map((item: string, index: number) => ({
                    id: `we_do_${index}`,
                    name: item,
                })) || [],
            },
            {
                id: "you_do",
                name: "You_Do",
                title: "You Do (Independent Practice)",
                icon: <User className="h-4 w-4 text-purple-600" />,
                elements: structure.You_Do?.map((item: string, index: number) => ({
                    id: `you_do_${index}`,
                    name: item,
                })) || [],
            },
        ];
    };
    // Filter activities based on search
    const filteredActivities = localActivities.filter(
        (activity) =>
            activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
    const paginatedActivities = filteredActivities.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalElementPages = selectedActivity
        ? Math.ceil(selectedActivity.elements.length / ITEMS_PER_PAGE)
        : 0;
    const paginatedElements = selectedActivity
        ? selectedActivity.elements.slice(
            (elementCurrentPage - 1) * ITEMS_PER_PAGE,
            elementCurrentPage * ITEMS_PER_PAGE
        )
        : [];

    const handleViewElements = (activity: PedagogyActivity) => {
        setSelectedActivity(activity);
        setShowElementsPopup(true);
        setElementCurrentPage(1);
    };

    const handleAddNewElement = () => {
        setEditingElement(null);
        setElementFormData({ name: "" });
        setShowElementForm(true);
    };

    const handleEditElement = (element: PedagogyElement) => {
        setEditingElement(element);
        setElementFormData({
            name: element.name,
        });
        setShowElementForm(true);
    };

    const handleDeleteElement = (element: PedagogyElement) => {
        setElementToDelete(element);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteElement = async () => {
        if (!elementToDelete || !selectedActivity) return;

        try {
            await deleteElementMutation.mutateAsync({
                elementId: elementToDelete.id
            });
            setShowDeleteConfirm(false);
            setElementToDelete(null);
        } catch (error) {
            // Error handling is done in the mutation
        }
    };

    const handleElementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedActivity) return;

        try {
            if (editingElement) {
                // Update existing element
                await updateElementMutation.mutateAsync({
                    elementId: editingElement.id,
                    name: elementFormData.name
                });
            } else {
                // Create new element
                await createElementMutation.mutateAsync({
                    name: elementFormData.name
                });
            }

            setShowElementForm(false);
        } catch (error) {
            // Error handling is done in the mutation
        }
    };

    // Table columns
    const columns: Column<PedagogyActivity>[] = [
        {
            key: "activity",
            label: "Pedagogy Activity",
            width: "60%",
            align: "left",
            renderCell: (activity: PedagogyActivity) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        {activity.icon}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 text-xs">{activity.title}</div>
                        <div className="text-xs text-gray-400">{activity.name}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "elements",
            label: "Pedagogy Elements",
            width: "30%",
            align: "center",
            renderCell: (activity: PedagogyActivity) => (
                <div
                    className="text-center text-xs text-blue-600 font-semibold cursor-pointer hover:underline"
                    onClick={() => handleViewElements(activity)}
                >
                    {activity.elements.length > 0
                        ? ` ${activity.elements.length} Click to view`
                        : "0 Click to add"}
                </div>
            ),
        },
    ];

    const isLoadingMutation =
        createElementMutation.isPending ||
        updateElementMutation.isPending ||
        deleteElementMutation.isPending;

    // Show loading state
    if (isLoading) {
        return (
            <div className="p-1">
                <div className="mx-auto p-4 bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading pedagogy data...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="p-1">
                <div className="mx-auto p-4 bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-center py-8">
                        <AlertTriangle className="h-8 w-8 text-red-500 mr-2" />
                        <span className="text-sm text-red-600">Error loading pedagogy data</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-1">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.5,
                    ease: "easeIn",
                }}
            >
                <div className="mx-auto p-0 bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Header Section */}
                    <div className="flex items-start justify-between bg-gray-100 px-3 py-2 rounded-t-2xl">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-3 w-3 text-blue-600" />
                            <div>
                                <h3 className="text-xs font-medium text-gray-900">Pedagogy Management</h3>
                                <p className="text-xs text-gray-500">Manage teaching methodologies and activities</p>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500">
                            {(structures && structures.length > 0) ? "Live Data" : "No Data"}
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div className="flex items-center gap-1 bg-white px-3 py-2 ">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">Pedagogy Activities:</span>
                            <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                                {filteredActivities.length}
                            </span>
                        </div>
                        <div className="relative flex-grow">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white px-3 py-2 ">
                                {/* Search Input */}
                                <div className="relative flex-grow w-full sm:w-auto">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search activities..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-7 h-6 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Table */}
                    <div className="overflow-x-auto">
                        <UserTable
                            users={paginatedActivities}
                            isLoading={isLoading}
                            columns={columns}
                            actionButtons={false as any}
                            pagination={{
                                currentPage: currentPage,
                                totalPages: totalPages,
                                totalItems: filteredActivities.length,
                                itemsPerPage: ITEMS_PER_PAGE,
                                onPageChange: (page) => setCurrentPage(page),
                            }}
                        />
                    </div>

                    {/* Elements Popup */}
                    <AnimatePresence>
                        {showElementsPopup && selectedActivity && (
                            <motion.div
                                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowElementsPopup(false)}
                            >
                                <motion.div
                                    className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Popup Header */}
                                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            {selectedActivity.icon}
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    {selectedActivity.title} Pedagogy Elements
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-6"
                                                onClick={handleAddNewElement}
                                                disabled={isLoadingMutation}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add Element
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => setShowElementsPopup(false)}
                                                disabled={isLoadingMutation}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Popup Content */}
                                    <div className="overflow-y-auto flex-grow">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-[10%]">
                                                        S.No
                                                    </th>
                                                    <th className="px-3 py-2 text-xs font-medium text-gray-700 text-left w-[80%]">
                                                        Element Name
                                                    </th>
                                                    <th className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-[10%]">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedActivity.elements.length > 0 ? (
                                                    paginatedElements.map((element, index) => {
                                                        const elementIndex = (elementCurrentPage - 1) * ITEMS_PER_PAGE + index;
                                                        return (
                                                            <motion.tr
                                                                key={element.id}
                                                                className="hover:bg-gray-50"
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                            >
                                                                <td className="px-3 py-2 text-center text-xs">
                                                                    <span className="font-medium text-gray-700">
                                                                        {elementIndex + 1}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-xs">
                                                                    <div className="font-medium text-gray-900">{element.name}</div>
                                                                </td>
                                                                <td className="px-3 py-2 text-center text-xs">
                                                                    <div className="flex justify-center space-x-2">
                                                                        <motion.button
                                                                            className="text-green-600 hover:text-green-900 hover:bg-green-50 h-7 w-7 p-1 rounded flex items-center justify-center"
                                                                            onClick={() => handleEditElement(element)}
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            title="Edit Element"
                                                                            disabled={isLoadingMutation}
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </motion.button>
                                                                        <motion.button
                                                                            className="text-red-600 hover:text-red-900 hover:bg-red-50 h-7 w-7 p-1 rounded flex items-center justify-center"
                                                                            onClick={() => handleDeleteElement(element)}
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            title="Delete Element"
                                                                            disabled={isLoadingMutation}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </motion.button>
                                                                    </div>
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td
                                                            colSpan={6}
                                                            className="px-4 py-10 text-center text-sm text-gray-500"
                                                        >
                                                            No elements found for this activity
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Popup Footer */}
                                    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
                                        <div className="text-xs text-gray-600">
                                            Showing {paginatedElements.length} of {selectedActivity.elements.length}{" "}
                                            elements
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => setElementCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={elementCurrentPage === 1 || isLoadingMutation}
                                            >
                                                <ChevronLeft className="h-3 w-3" />
                                            </Button>
                                            <span className="text-xs text-gray-600">
                                                Page {elementCurrentPage} of {totalElementPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                className="h-6 px-2 text-xs"
                                                onClick={() =>
                                                    setElementCurrentPage((p) => Math.min(totalElementPages, p + 1))
                                                }
                                                disabled={elementCurrentPage === totalElementPages || totalElementPages === 0 || isLoadingMutation}
                                            >
                                                <ChevronRight className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Element Form Popup */}
                    <AnimatePresence>
                        {showElementForm && (
                            <motion.div
                                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowElementForm(false)}
                            >
                                <motion.div
                                    className="bg-white rounded-lg shadow-xl max-w-md w-full"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    transition={{ ease: "easeInOut", duration: 0.3 }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                                                    <Plus className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {editingElement ? "Edit Element" : "Add New Element"}
                                                    </h3>
                                                    <p className="text-xs text-gray-500">
                                                        {editingElement
                                                            ? "Update the details of this element."
                                                            : `Add a new element to the "${selectedActivity?.title}" activity.`}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-200/50"
                                                onClick={() => setShowElementForm(false)}
                                                disabled={isLoadingMutation}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleElementSubmit} className="p-6 space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Element Name
                                                </label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs">Name of the teaching element or strategy.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <div className="relative">
                                                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={elementFormData.name}
                                                    onChange={(e) =>
                                                        setElementFormData((prev) => ({ ...prev, name: e.target.value }))
                                                    }
                                                    className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    placeholder="e.g., 'Think-Pair-Share'"
                                                    required
                                                    disabled={isLoadingMutation}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setShowElementForm(false)}
                                                className="px-6 py-2 text-sm rounded-full transition-all"
                                                disabled={isLoadingMutation}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm rounded-full shadow-md hover:shadow-lg transition-all"
                                                disabled={isLoadingMutation}
                                            >
                                                {isLoadingMutation ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                        {editingElement ? "Updating..." : "Creating..."}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4 mr-1" />
                                                        {editingElement ? "Update Element" : "Create Element"}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Delete Confirmation Popup */}
                    <AnimatePresence>
                        {showDeleteConfirm && elementToDelete && (
                            <motion.div
                                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                    <div className="text-center">
                                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                            <AlertTriangle className="h-6 w-6 text-red-600" />
                                        </div>
                                        <h3 className="mt-5 text-lg font-medium text-gray-900">Delete Element</h3>
                                        <div className="mt-2 text-sm text-gray-500">
                                            <p>Are you sure you want to delete the element "{elementToDelete.name}"?</p>
                                            <p className="font-semibold text-red-500">This action cannot be undone.</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={deleteElementMutation.isPending}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={confirmDeleteElement}
                                            disabled={deleteElementMutation.isPending}
                                        >
                                            {deleteElementMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Delete'
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}