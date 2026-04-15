"use client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { PlusIcon, Search, X, Filter, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import DashboardLayout from "../../component/layout";
import { StaffLayout } from "../../component/stafflayout/staff-layout";
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from "react";
import { UserTable } from '@/components/ui/alterationTable';
import { courseStructureApi } from "@/apiServices/createCourseStucture";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CourseStatistics } from "./coursestructurecomponents/CourseStatistics";
import { CourseFilters } from "./coursestructurecomponents/CourseFilters";
import { CourseTableColumns } from "./coursestructurecomponents/CourseTableColumns";
import { CourseModals } from "./coursestructurecomponents/CourseModals";
import { useCoursePermissions } from "./coursestructurecomponents/types/useCoursePermissions";
import { useCourseFilters } from "./coursestructurecomponents/types/useCourseFilters";
import { CourseStructure, Permission, UserData } from "./coursestructurecomponents/types/index";
import { getCurrentUser, getUserRole, hasPermission, formatDate } from "./coursestructurecomponents/types/util";
import AddCourseSettingsPopup from "../../component/Addcoursestructure/addcoursestructurepopupcomp";

export default function CourseStructurePage() {
    const [userRole, setUserRole] = useState<string>('');
    const queryClient = useQueryClient();
    const router = useRouter();
    
    // UI States
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [courseToEdit, setCourseToEdit] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<CourseStructure | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [courseForDetails, setCourseForDetails] = useState<CourseStructure | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<CourseStructure | null>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [selectedHierarchy, setSelectedHierarchy] = useState<any>(null);
    const [selectedPedagogy, setSelectedPedagogy] = useState<any>(null);
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
    
    // Filters
    const {
        showFilters,
        setShowFilters,
        statusFilter,
        setStatusFilter,
        categoryFilter,
        setCategoryFilter,
        levelFilter,
        setLevelFilter,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        clearFilters
    } = useCourseFilters();
    
    // Permissions
    const {
        userPermissions,
        canAddCourse,
        canAddCourseStructure,
        hasAnyCoursePermission,
        userData
    } = useCoursePermissions();

    // Get user role from localStorage
    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);
        
        const handleStorageChange = () => {
            const updatedRole = getUserRole();
            setUserRole(updatedRole);
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        const observer = new MutationObserver(() => {
            setCurrentTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        });
        observer.observe(document.documentElement, { attributes: true });
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            observer.disconnect();
        };
    }, []);

    // Fetch data
    const { data: courseStructures = [], isLoading, error } = useQuery(courseStructureApi.getAll());
    const deleteMutation = useMutation({
        mutationFn: (courseId: string) => courseStructureApi.delete(courseId).mutationFn(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courseStructures'] });
            setShowDeleteModal(false);
            setCourseToDelete(null);
        },
        onError: (error: Error) => {
            console.error('Delete failed:', error);
            alert('Failed to delete course structure');
        }
    });

    // Calculate statistics
    const calculateStatistics = (courses: CourseStructure[]) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const totalCourses = courses.length;
        const recentCourses = courses.filter(course => 
            new Date(course.createdAt || course.updatedAt) >= sevenDaysAgo
        ).length;
        const activeCourses = courses.filter(course => course.isActive === true).length;

        return {
            total: totalCourses,
            recent: recentCourses,
            active: activeCourses
        };
    };

    const statistics = calculateStatistics(courseStructures);
    
    // Filter and sort data
    let filteredStructures = courseStructures.filter((structure: CourseStructure) => {
        const matchesSearch = 
            structure.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            structure.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            structure.clientData?.clientCompany.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || structure.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || structure.category === categoryFilter;
        const matchesLevel = levelFilter === 'all' || structure.courseLevel === levelFilter;

        return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
    });

    // Get unique values for filters
    const categories = [...new Set(courseStructures.map((course: CourseStructure) => course.category))] as string[];
    const levels = [...new Set(courseStructures.map((course: CourseStructure) => course.courseLevel))] as string[];

    // Apply sorting
    if (sortField) {
        filteredStructures = [...filteredStructures].sort((a: any, b: any) => {
            let aValue, bValue;

            switch (sortField) {
                case 'date':
                    aValue = new Date(a.updatedAt).getTime();
                    bValue = new Date(b.updatedAt).getTime();
                    break;
                case 'courseName':
                    aValue = a.courseName.toLowerCase();
                    bValue = b.courseName.toLowerCase();
                    break;
                case 'clientName':
                    aValue = (a.clientData?.clientCompany || a.clientName).toLowerCase();
                    bValue = (b.clientData?.clientCompany || b.clientName).toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    } else {
        filteredStructures = filteredStructures.sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    const itemsPerPage = 8;
    const paginatedData = filteredStructures.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToPedagogyPage = (courseId: string) => {
        const query = new URLSearchParams({ courseId: courseId ?? '' }).toString();
        router.push(`/lms/pages/coursestructure/pedagogy2?${query}`);
    };

    const confirmDelete = async () => {
        if (!courseToDelete) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(courseToDelete._id);
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = CourseTableColumns({
        sortField,
        sortDirection,
        handleSort: (field) => {
            if (sortField === field) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                setSortField(field);
                setSortDirection('asc');
            }
        },
        getSortIcon: (field) => {
            if (sortField !== field) {
                return <ArrowUpDown className="h-3 w-3 ml-1 opacity-60 dark:opacity-40" />;
            }
            return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
        },
        setSelectedCourse,
        setSelectedHierarchy,
        setSelectedPedagogy,
        canAddCourseStructure,
        userPermissions,
        goToPedagogyPage,
        handleViewFullDetails: (course: CourseStructure) => {
            setCourseForDetails(course);
            setShowFullDetails(true);
        },
        handleEditCourse: (courseId: string) => {
            setCourseToEdit(courseId);
            setIsPopupOpen(true);
        },
        handleDeleteCourse: (course: CourseStructure) => {
            setCourseToDelete(course);
            setShowDeleteModal(true);
        }
    });

    // Show loading state
    if (userRole === '') {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                currentTheme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
            }`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
        );
    }

    // Check access
    if (userRole !== 'admin' && userRole !== 'staff' && userRole !== 'programcoordinator' && userRole !== 'faculty') {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                currentTheme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
            }`}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    const pageContent = (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-screen bg-white dark:bg-gray-950"
        >
            <div className="w-full px-0">
                {/* Header Section */}
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 w-full px-6 py-4">
                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col gap-1">
                                <Breadcrumb className="flex-shrink-0">
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbLink 
                                                href={userRole === 'admin' ? "/lms/pages/admindashboard" : "/lms/pages/staffdashboard"}
                                                className="text-xs text-blue-500 dark:text-blue-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                                            >
                                                Dashboard
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator className="text-gray-400 dark:text-gray-600" />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                Course Management
                                            </BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                                
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white font-sans tracking-tight">
                                        Course Structures
                                    </h1>
                                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                        {filteredStructures.length} course{filteredStructures.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {canAddCourse && (
                                <Button
                                    onClick={() => setIsPopupOpen(true)}
                                    className="h-9 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 shadow-sm"
                                >
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Add Course
                                </Button>
                            )}
                        </div>

                        {/* Search and Stats Row */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 w-full">
                            <div className="flex-1 max-w-4xl">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <Input
                                        type="text"
                                        placeholder="Search courses, codes, clients, or categories..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-8 h-10 text-sm border-gray-300 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 font-sans w-full bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder-gray-500"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <CourseStatistics statistics={statistics} isLoading={isLoading} />
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 h-9 text-xs font-medium border-gray-300 dark:border-gray-700 ${
                                        showFilters 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' 
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <Filter className="h-4 w-4" />
                                    Filters
                                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <CourseFilters
                        showFilters={showFilters}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        categoryFilter={categoryFilter}
                        setCategoryFilter={setCategoryFilter}
                        levelFilter={levelFilter}
                        setLevelFilter={setLevelFilter}
                        sortField={sortField}
                        setSortField={setSortField}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        categories={categories}
                        levels={levels}
                        clearFilters={clearFilters}
                    />
                </div>

                {/* Table Section */}
                <div className="w-full px-6 pt-6">
                    <div className="w-full">
                        <div className="bg-white dark:bg-gray-900 overflow-hidden w-full rounded-lg border border-gray-200 dark:border-gray-800">
                            <UserTable
                                users={paginatedData}
                                isLoading={isLoading}
                                columns={columns}
                                pagination={{
                                    currentPage: currentPage,
                                    totalPages: Math.ceil(filteredStructures.length / itemsPerPage),
                                    totalItems: filteredStructures.length,
                                    itemsPerPage: itemsPerPage,
                                    onPageChange: (page) => setCurrentPage(page),
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {canAddCourse && (
                <AddCourseSettingsPopup
                    isOpen={isPopupOpen}
                    onClose={() => {
                        setIsPopupOpen(false);
                        setCourseToEdit(null);
                    }}
                    courseId={courseToEdit || undefined}
                    totalCourses={courseStructures.length}
                />
            )}

            <CourseModals
                showFullDetails={showFullDetails}
                setShowFullDetails={setShowFullDetails}
                courseForDetails={courseForDetails}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                selectedHierarchy={selectedHierarchy}
                setSelectedHierarchy={setSelectedHierarchy}
                selectedPedagogy={selectedPedagogy}
                setSelectedPedagogy={setSelectedPedagogy}
                showDeleteModal={showDeleteModal}
                setShowDeleteModal={setShowDeleteModal}
                courseToDelete={courseToDelete}
                isDeleting={isDeleting}
                confirmDelete={confirmDelete}
                userPermissions={userPermissions}
                setCourseToEdit={setCourseToEdit}
                setIsPopupOpen={setIsPopupOpen}
            />
        </motion.div>
    );

    if (userRole === 'admin') {
        return <DashboardLayout>{pageContent}</DashboardLayout>;
    } else {
        return <StaffLayout>{pageContent}</StaffLayout>;
    }
}