"use client";
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Building,
  Check,
  Folder,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserTable } from "@/components/ui/alterationTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categoryService,
  fetchCategories,
} from "@/apiServices/dynamicFields/category";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";

interface Category {
  _id: string;
  categoryName: string;
  categoryDescription: string;
  categoryCode: string;
  courseNames: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface ModulePermissions {
  courseManagement: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    report: boolean;
  };
  userManagement: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    report: boolean;
  };
  testAccess: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    report: boolean;
  };
}

interface Permission {
  create: boolean;
  edit: boolean;
  delete: boolean;
  report: boolean;
}

interface Column<T> {
  key: string;
  label: string;
  width: string;
  align: "left" | "center" | "right";
  renderCell?: (item: T) => React.ReactNode;
}

interface ActionButtons {
  edit?: (item: any) => void;
  delete?: (item: any) => void;
  permissions?: (item: any) => void;
}

export default function CategoryManagementPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dataVersion, setDataVersion] = useState(0);

  const categoriesPerPage = 5;
  const queryClient = useQueryClient();
  const formVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  } as const;

  const overlayVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const [formData, setFormData] = useState({
    categoryName: "",
    categoryDescription: "",
    categoryCode: "",
    courseNames: [] as string[],
  });

  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>(
    {
      courseManagement: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
      userManagement: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
      testAccess: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
    }
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatus]);

  // Fetch categories with pagination and filters
  // Update your existing fetch query to include better search and filter logic
  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "categories",
      currentPage,
      debouncedSearchTerm,
      selectedStatus,
      dataVersion,
    ],
    queryFn: async () => {
      const { categories } = await fetchCategories();

      // Enhanced filtering logic
      const filteredCategories = categories.filter((category: Category) => {
        // Search term matching (case-insensitive)
        const searchTermMatch = debouncedSearchTerm
          ? [
            category.categoryName,
            category.categoryDescription,
            category.categoryCode,
            ...category.courseNames,
          ].some(
            (field) =>
              field &&
              field
                .toString()
                .toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase())
          )
          : true;

        // Status filter matching
        const statusMatch =
          !selectedStatus ||
          selectedStatus === "all";

        return searchTermMatch && statusMatch;
      });

      // Sorting (optional - by name alphabetically)
      const sortedCategories = [...filteredCategories].sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
      );

      // Pagination
      const startIndex = (currentPage - 1) * categoriesPerPage;
      const endIndex = startIndex + categoriesPerPage;
      const paginatedCategories = sortedCategories.slice(startIndex, endIndex);

      const totalPages = Math.ceil(sortedCategories.length / categoriesPerPage);

      return {
        categories: paginatedCategories,
        allCategories: categories,
        filteredCategories: sortedCategories,
        pagination: {
          currentPage,
          totalPages,
          totalCategories: sortedCategories.length,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !tags.includes(value)) {
        setTags((prev) => [...prev, value]);
      }
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategoryId(data._id);
      setShowAddModal(false);
      setShowSuccessModal(true);
      resetForm();
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create category");
      console.error("Error creating category:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowAddModal(false);
      setShowSuccessModal(true);
      resetForm();
      toast.success("Category updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update category");
      console.error("Error updating category:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowDeleteModal(false);
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete category");
      console.error("Error deleting category:", error);
    },
  });

  // Form handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formDataWithCourses = {
      ...formData,
      courseNames: tags,
    };

    if (selectedCategory) {
      updateMutation.mutate({
        id: selectedCategory._id,
        data: formDataWithCourses,
      });
    } else {
      createMutation.mutate(formDataWithCourses);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      categoryName: category.categoryName,
      categoryDescription: category.categoryDescription,
      categoryCode: category.categoryCode,
      courseNames: category.courseNames || [],
    });
    setTags(category.courseNames || []);
    setShowAddModal(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory._id);
    }
  };

  const resetForm = () => {
    setFormData({
      categoryName: "",
      categoryDescription: "",
      categoryCode: "",
      courseNames: [],
    });
    setTags([]);
    setSelectedCategory(null);
  };

  // Table columns
  const columns: Column<Category>[] = [
    {
      key: "categoryName",
      label: "Name",
      width: "25%",
      align: "left",
      renderCell: (category: Category) => (
        <div className="flex items-center">
          <div className="ml-2">
            <div className="text-xs font-medium text-gray-900">
              {category.categoryName}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "categoryDescription",
      label: "Description",
      width: "25%",
      align: "left",
    },
    {
      key: "courseNames",
      label: "Courses",
      width: "25%",
      align: "left",
      renderCell: (category: Category) => (
        <div className="flex flex-wrap gap-1 items-center ">
          {category.courseNames?.map((course, index) => (
            <Badge
              key={course}
              className={`px-1.5 py-0.5 rounded-full text-xxs sm:text-xs ${index === 0
                  ? "bg-purple-100 text-purple-800"
                  : index === 1
                    ? "bg-blue-100 text-blue-800"
                    : index === 2
                      ? "bg-yellow-100 text-yellow-800"
                      : index === 3
                        ? "bg-pink-100 text-pink-800"
                        : "bg-green-100 text-green-800"
                }`}
            >
              {course}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  const actionButtons: ActionButtons = {
    edit: handleEdit,
    delete: handleDelete,
  };

  const currentCategories = categoriesData?.categories || [];
  const pagination = categoriesData?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalCategories: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

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
              <Building className="h-3 w-3 text-blue-600" />
              <div>
                <h3 className="text-xs font-medium text-gray-900">
                  Category Management
                </h3>
                <p className="text-xs text-gray-500">
                  Manage category types and models
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-6"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Category
            </Button>
          </div>

          {/* Filter Section */}
          <div className="flex items-center gap-1 bg-white px-3 py-2 ">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">
                Total categories:
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                {currentCategories.length}
              </span>
            </div>
            <div className="relative flex-grow">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white px-3 py-2 ">
                {/* Search Input */}
                <div className="relative flex-grow w-full sm:w-auto">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, description, code or courses..."
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
              users={currentCategories}
              isLoading={isLoading}
              columns={columns}
              actionButtons={actionButtons}
              pagination={{
                currentPage: currentPage,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalCategories,
                itemsPerPage: categoriesPerPage,
                onPageChange: (page) => setCurrentPage(page),
              }}
            />
          </div>

          {/* Add/Edit Modal */}
          <AnimatePresence>
            {showAddModal && (
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm p-2 sm:p-4"
              >
                <motion.div
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative w-[60vw] rounded-lg bg-white shadow-2xl max-h-[95vh] flex flex-col"
                >
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm">
                    <div className="relative max-w-md w-full rounded-lg overflow-hidden shadow-lg bg-white">
                      {/* Close icon button */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          resetForm();
                        }}
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {/* Header */}
                      <div className="bg-blue-50 p-4 flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                          <Folder className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {selectedCategory
                              ? "Edit Category"
                              : "Add New Service"}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {selectedCategory
                              ? "Update the category details below."
                              : "Create a new category for your institution."}
                          </p>
                        </div>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSubmit} className="p-4 space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category Name
                          </label>
                          <input
                            type="text"
                            value={formData.categoryName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                categoryName: e.target.value,
                              })
                            }
                            placeholder="Enter category name"
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course Names
                          </label>
                          <input
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Type course name and press Enter..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1 pr-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 rounded hover:bg-muted p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category Description
                          </label>
                          <textarea
                            value={formData.categoryDescription}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                categoryDescription: e.target.value,
                              })
                            }
                            placeholder="Enter category description"
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              setShowAddModal(false);
                              resetForm();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="rounded-full bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
                            disabled={
                              createMutation.isPending ||
                              updateMutation.isPending
                            }
                          >
                            {createMutation.isPending ||
                              updateMutation.isPending ? (
                              <>
                                <Send className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : selectedCategory ? (<>
                              <Send className="h-4 w-4" />
                              Update Category
                            </>
                            ) : (<>
                              <Send className="h-4 w-4" />
                              Create Category
                            </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Success Modal */}
          <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      {selectedCategory
                        ? "Category Updated Successfully"
                        : "Category Created Successfully"}
                    </DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Category ID:</strong> {newCategoryId}
                </p>
                {tags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">
                      Course Names:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tags.map((course) => (
                        <Badge
                          key={course}
                          variant="outline"
                          className="text-xs"
                        >
                          {course}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setShowSuccessModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AnimatePresence>
            {showDeleteModal && (
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm p-2 sm:p-4"
              >
                <motion.div
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative w-[60vw] rounded-lg bg-white shadow-2xl max-h-[95vh] flex flex-col"
                >
                  <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 relative">
                      {/* Close Icon */}
                      <button
                        onClick={() => setShowDeleteModal(false)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {/* Icon */}
                      <div className="flex justify-center mb-4">
                        <div className="bg-red-100 p-3 rounded-full">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-semibold text-center text-gray-900 mb-2">
                        Delete Service
                      </h2>

                      {/* Description */}
                      <p className="text-sm text-center text-gray-600">
                        Are you sure you want to delete the service{" "}
                        <strong>{selectedCategory?.categoryName}</strong>?<br />
                        <span className="text-red-600 font-medium">
                          This action cannot be undone.
                        </span>
                      </p>

                      {/* Buttons */}
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteModal(false)}
                          disabled={deleteMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={confirmDelete}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      </div>
                    </div>
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
