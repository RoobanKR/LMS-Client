"use client"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { PlusIcon, Search, BookOpen, Clock, Users, Eye, Edit, Copy, Trash2, CheckCircle, XCircle, Loader2, X, ImageIcon, BadgeCheck, BookOpenText, Layers, LayoutDashboard, Shapes, ListChecks, ChevronRight, Mail, Phone, User, FileText, Activity, MapPin, Briefcase, Building2, LayersIcon, FolderIcon, LayoutGridIcon, UserCheck, MoreVertical, ExternalLink, ChevronDown, ChevronUp, Filter, UploadIcon, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import DashboardLayout from "../../component/layout";
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AddCourseSettingsPopup from "../../component/addcoursestructurepopup";
import { UserTable } from '@/components/ui/alterationTable';
import { courseStructureApi } from "@/apiServices/createCourseStucture";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/apiServices/tokenVerify";

// Permission Types
interface Permission {
    permissionName: string;
    permissionKey: string;
    permissionFunctionality: string[];
    icon: string;
    color: string;
    description: string;
    isActive: boolean;
    order: number;
    _id: string;
    createdAt: string;
    updatedAt: string;
}

interface UserData {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
        _id: string;
        originalRole: string;
        renameRole: string;
        roleValue: string;
    };
    permissions: Permission[];
}

interface VerifyTokenResponse {
    valid: boolean;
    user: UserData;
}

// Permission utility functions
const hasPermission = (
    permissions: Permission[],
    permissionKey: string,
    functionality?: string
): boolean => {
    
    const permission = permissions.find(p => p.permissionKey === permissionKey);
    
    if (!permission) {
        return false;
    }
    
    if (!permission.isActive) {
        return false;
    }
    
    if (functionality) {
        // Trim whitespace for comparison
        const trimmedFunctionality = functionality.trim();
        const hasFunc = permission.permissionFunctionality.some(func => 
            func.trim() === trimmedFunctionality
        );
      
        return hasFunc;
    }
    
    return true;
};

const getPermission = (
    permissions: Permission[],
    permissionKey: string
): Permission | undefined => {
    return permissions.find(p => p.permissionKey === permissionKey && p.isActive);
};

// Debug helper function
const debugPermissions = (permissions: Permission[], permissionKey: string) => {
    const permission = permissions.find(p => p.permissionKey === permissionKey);
    if (!permission) {
        return;
    }
};

type CourseStructure = {
    _id: string;
    clientName: string;
    clientData: {
        clientCompany: string;
        clientAddress: string;
        contactPersons: Array<{
            name: string;
            email: string;
            phoneNumber: string;
            isPrimary: boolean;
        }>;
        description: string;
        status: string;
    };
    serviceType: string;
    serviceModal: string;
    category: string;
    courseCode: string;
    courseName: string;
    courseDescription: string;
    courseDuration: string;
    courseLevel: string;
    updatedAt: string;
    createdAt: string;
    resourcesType: string[];
    courseHierarchy: string[];
    I_Do: string[];
    We_Do: string[];
    You_Do: string[];
    courseImage?: string;
    status: 'Published' | 'Draft' | 'Unpublished';
    isActive: boolean;
};

// Custom Dropdown Component with permissions
interface CustomDropdownProps {
    course: CourseStructure;
    onViewDetails: (course: CourseStructure) => void;
    onEdit: (courseId: string) => void;
    onDuplicate: (courseId: string) => void;
    onDelete: (course: CourseStructure) => void;
    userPermissions: Permission[];
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
    course, 
    onViewDetails, 
    onEdit, 
    onDuplicate, 
    onDelete,
    userPermissions
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    
    // Check permissions - Use exact functionality names from your data
    const canViewDetails = hasPermission(userPermissions, 'coursestructure', ' View Full Details');
    const canAddParticipants = hasPermission(userPermissions, 'coursestructure', 'Add Participants');
    const canEditCourse = hasPermission(userPermissions, 'coursestructure', ' Edit Course');
    const canDuplicateCourse = hasPermission(userPermissions, 'coursestructure', 'Dublicate');
    const canDeleteCourse = hasPermission(userPermissions, 'coursestructure', 'Delete Course');
    const canUploadResources = hasPermission(userPermissions, 'coursestructure', 'Upload Resourses');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAction = (action: string) => {
        setIsOpen(false);
        switch (action) {
            case 'view':
                onViewDetails(course);
                break;
            case 'edit':
                onEdit(course._id);
                break;
            case 'duplicate':
                onDuplicate(course._id);
                break;
            case 'delete':
                onDelete(course);
                break;
            case 'participants':
                goToParticipantsPage(course._id);
                break;
        }
    };
    
    const goToUploadResourses = (courseId: string) => {
        const courseIdToPass = courseId;
        const query = new URLSearchParams({
            courseId: courseIdToPass ?? '',
        }).toString();
        router.push(`/lms/pages/coursestructure/uploadcourseresources?${query}`);
    };
    
    const goToParticipantsPage = (courseId: string) => {
        const query = new URLSearchParams({
            courseId: courseId ?? '',
        }).toString();
        router.push(`/lms/pages/coursestructure/course-participants?${query}`);
    };
    
    // Get course management permission
    const coursePermission = getPermission(userPermissions, 'coursestructure');
    const hasCourseManagementAccess = coursePermission?.isActive || false;
    const hasAnyPermission = canViewDetails || canAddParticipants || canUploadResources || canEditCourse || canDuplicateCourse || canDeleteCourse;

    if (!hasCourseManagementAccess) {
        return (
            <button
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 border border-gray-200 transition-all duration-200 group opacity-50 cursor-not-allowed"
                disabled
            >
                <MoreVertical className="h-3 w-3 text-gray-400" />
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-200 group"
                disabled={!hasAnyPermission}
            >
                <MoreVertical className="h-3 w-3 text-gray-600 group-hover:text-gray-700" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                    >
                        {/* View Full Details */}
                        {canViewDetails && (
                            <button
                                onClick={() => handleAction('view')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                            >
                                <Eye className="h-4 w-4 text-blue-600" />
                                View Full Details
                            </button>
                        )}
                        
                        {/* Add Participants */}
                        {canAddParticipants && (
                            <button
                                onClick={() => handleAction('participants')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                            >
                                <UserPlus className="h-4 w-4 text-green-600" />
                                Add Participants
                            </button>
                        )}
                        
                        {/* Upload Resources */}
                        {canUploadResources && (
                            <button
                                onClick={() => goToUploadResourses(course._id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                            >
                                <UploadIcon className="h-4 w-4 text-blue-600" />
                                Upload Resources
                            </button>
                        )}
                        
                        {/* Edit Course */}
                        {canEditCourse && (
                            <button
                                onClick={() => handleAction('edit')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                            >
                                <Edit className="h-4 w-4 text-blue-600" />
                                Edit Course
                            </button>
                        )}
                        
                        {/* Duplicate Course */}
                        {canDuplicateCourse && (
                            <button
                                onClick={() => handleAction('duplicate')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                            >
                                <Copy className="h-4 w-4 text-purple-600" />
                                Duplicate
                            </button>
                        )}
                        
                        {/* Show divider only if there are items above and delete below */}
                        {(canViewDetails || canAddParticipants || canUploadResources || canEditCourse || canDuplicateCourse) && canDeleteCourse && (
                            <div className="border-t border-gray-200 my-1"></div>
                        )}
                        
                        {/* Delete Course */}
                        {canDeleteCourse && (
                            <button
                                onClick={() => handleAction('delete')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Course
                            </button>
                        )}
                        
                        {/* If no permissions show message */}
                        {!canViewDetails && !canAddParticipants && !canUploadResources && !canEditCourse && !canDuplicateCourse && !canDeleteCourse && (
                            <div className="px-3 py-2 text-xs text-gray-500 text-center italic">
                                No actions available
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function CourseStructurePage() {
    const queryClient = useQueryClient()
    const router = useRouter();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<'date' | 'courseName' | 'clientName' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [selectedCourse, setSelectedCourse] = useState<CourseStructure | null>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [selectedHierarchy, setSelectedHierarchy] = useState<any>(null);
    const [selectedPedagogy, setSelectedPedagogy] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<CourseStructure | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [courseToEdit, setCourseToEdit] = useState<string | null>(null);
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [courseForDetails, setCourseForDetails] = useState<CourseStructure | null>(null);
    
    // New filter states
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    
    // User permissions state
    const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [canAddCourse, setCanAddCourse] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [canAddCourseStructure, setCanAddCourseStructure] = useState(false);

    // Fetch user permissions on component mount
    useEffect(() => {
        const fetchUserPermissions = async () => {
            try {
                setIsLoadingPermissions(true);
                const response = await getCurrentUser();
                
                if (response.valid && response.user) {
                    setUserData(response.user);
                    
                    if (response.user.permissions && Array.isArray(response.user.permissions)) {
                        setUserPermissions(response.user.permissions);
                        debugPermissions(response.user.permissions, 'coursestructure');
                        
                        // Check if user can add course - Using 'Add Course' from your permission data
                        const canAdd = hasPermission(response.user.permissions, 'coursestructure', 'Add Course');
                        setCanAddCourse(canAdd);
                        
                        // Check if user can add course structure
                        const canAddStructure = hasPermission(response.user.permissions, 'coursestructure', 'Add Course Structure');
                        setCanAddCourseStructure(canAddStructure);
                    } else {
                        setUserPermissions([]);
                    }
                } else {
                }
            } catch (error) {
                console.error('Failed to fetch user permissions:', error);
            } finally {
                setIsLoadingPermissions(false);
            }
        };

        fetchUserPermissions();
    }, []);

    const formatDate = (d: string): string => new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
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
        const inactiveCourses = courses.filter(course => course.isActive === false).length;

        return {
            total: totalCourses,
            recent: recentCourses,
            active: activeCourses,
            inactive: inactiveCourses
        };
    };

    // Handle sort
    const handleSort = (field: 'date' | 'courseName' | 'clientName') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Get sort icon
    const getSortIcon = (field: 'date' | 'courseName' | 'clientName') => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 opacity-60" />;
        }
        return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
    };

    const goToPedagogyPage = (courseId: string) => {
        const courseIdToPass = courseId;
        const query = new URLSearchParams({
            courseId: courseIdToPass ?? '',
        }).toString();
        router.push(`/lms/pages/coursestructure/pedagogy2?${query}`);
    };

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
    const statistics = calculateStatistics(courseStructures);
    
    // Filter structures based on search term and filters
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
        // Default sort by date (newest first)
        filteredStructures = filteredStructures.sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    // Handle dropdown actions
    const handleViewFullDetails = (course: CourseStructure) => {
        setCourseForDetails(course);
        setShowFullDetails(true);
    };

    const handleEditCourse = (courseId: string) => {
        setCourseToEdit(courseId);
        setIsPopupOpen(true);
    };

    const handleDuplicateCourse = (courseId: string) => {
        // Add your duplicate logic here
    };

    const handleDeleteCourse = (course: CourseStructure) => {
        setCourseToDelete(course);
        setShowDeleteModal(true);
    };

    // Clear all filters
    const clearFilters = () => {
        setStatusFilter('all');
        setCategoryFilter('all');
        setLevelFilter('all');
    };

    // Table columns configuration
    const columns = [
        {
            key: 'courseDate',
            label: (
                <div className="flex items-center cursor-pointer hover:text-gray-900 transition-colors" onClick={() => handleSort('date')}>
                    <span className="text-xs font-semibold text-gray-700">Date</span>
                    {getSortIcon('date')}
                </div>
            ),
            width: '10%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <div className="text-xs font-medium text-gray-900 font-sans">
                    {formatDate(structure.updatedAt)}
                </div>
            )
        },
        {
            key: 'clientName',
            label: (
                <div className="flex items-center cursor-pointer hover:text-gray-900 transition-colors" onClick={() => handleSort('clientName')}>
                    <span className="text-xs font-semibold text-gray-700">Client</span>
                    {getSortIcon('clientName')}
                </div>
            ),
            width: '14%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <div className="text-xs font-medium text-gray-900 font-sans truncate">
                    {structure.clientData?.clientCompany || structure.clientName}
                </div>
            )
        },
        {
            key: 'courseName',
            label: (
                <div className="flex items-center cursor-pointer hover:text-gray-900 transition-colors" onClick={() => handleSort('courseName')}>
                    <span className="text-xs font-semibold text-gray-700">Course Name</span>
                    {getSortIcon('courseName')}
                </div>
            ),
            width: '18%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <button
                    onClick={() => setSelectedCourse(structure)}
                    className="flex flex-col text-left w-full hover:bg-gray-50 rounded px-1 py-1 transition-colors"
                >
                    <span className="text-sm font-semibold text-gray-900 font-sans truncate">{structure.courseName}</span>
                    <span className="text-xs text-gray-500 font-medium font-sans">{structure.courseCode}</span>
                </button>
            )
        },
        {
            key: 'courseDetails',
            label: 'Course Details',
            width: '12%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-gray-700 font-sans">{structure.category}</span>
                    <span className="text-xs text-gray-500 font-sans">{structure.courseDuration}m • {structure.courseLevel}</span>
                </div>
            )
        },
        {
            key: 'courseHierarchy',
            label: 'Structure',
            width: '10%',
            align: 'center' as const,
            renderCell: (structure: CourseStructure) => (
                <button
                    onClick={() => setSelectedHierarchy({
                        resourcesType: structure.resourcesType,
                        courseHierarchy: structure.courseHierarchy
                    })}
                    className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all duration-200 group w-full"
                >
                    <LayersIcon className="h-3 w-3 text-indigo-600 group-hover:text-indigo-700" />
                    <span className="text-xs font-medium text-indigo-700 group-hover:text-indigo-800">View</span>
                </button>
            )
        },
        {
            key: 'pedagogy',
            label: 'Pedagogy',
            width: '10%',
            align: 'center' as const,
            renderCell: (structure: CourseStructure) => (
                <button
                    onClick={() => setSelectedPedagogy({
                        I_Do: structure.I_Do,
                        We_Do: structure.We_Do,
                        You_Do: structure.You_Do
                    })}
                    className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all duration-200 group w-full"
                >
                    <Users className="h-3 w-3 text-purple-600 group-hover:text-purple-700" />
                    <span className="text-xs font-medium text-purple-700 group-hover:text-purple-800">View</span>
                </button>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '18%',
            align: 'center' as const,
            renderCell: (structure: CourseStructure) => {

                return (
                    <div className="flex gap-1 justify-center">
                        {canAddCourseStructure && (
                            <button
                                onClick={() => goToPedagogyPage(structure._id)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all duration-200 group"
                            >
                                <ListChecks className="h-3 w-3 text-emerald-600 group-hover:text-emerald-700" />
                                <span className="text-xs font-medium text-emerald-700 group-hover:text-emerald-800">Add Course Structure</span>
                            </button>
                        )}
                        
                        {/* Custom Dropdown */}
                        <CustomDropdown
                            course={structure}
                            onViewDetails={handleViewFullDetails}
                            onEdit={handleEditCourse}
                            onDuplicate={handleDuplicateCourse}
                            onDelete={handleDeleteCourse}
                            userPermissions={userPermissions}
                        />
                    </div>
                );
            }
        }
    ];

    const confirmDelete = async () => {
        if (!courseToDelete) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(courseToDelete._id);
        } finally {
            setIsDeleting(false);
        }
    };

    const itemsPerPage = 8;
    const paginatedData = filteredStructures.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const popupVariants = {
        hidden: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.15 }
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.2, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.1 }
        }
    } as const;

    // Status badge component
    const StatusBadge = ({ status }: { status: string }) => {
        const statusConfig = {
            Published: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
            Draft: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: FileText },
            Unpublished: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Draft;
        const IconComponent = config.icon;

        return (
            <Badge variant="outline" className={`${config.color} border px-2 py-0.5 rounded-full text-xs font-medium`}>
                <IconComponent className="h-3 w-3 mr-1" />
                {status}
            </Badge>
        );
    };

 
    const hasAnyCoursePermission = userPermissions.some(p => p.permissionKey === 'coursestructure' && p.isActive);

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="min-h-screen"
            >
                {/* Debug info - remove in production */}
                <div className="hidden">
                    <p>User Permissions: {JSON.stringify(userPermissions)}</p>
                    <p>User Data: {JSON.stringify(userData)}</p>
                    <p>Can Add Course: {canAddCourse.toString()}</p>
                    <p>Can Add Course Structure: {canAddCourseStructure.toString()}</p>
                    <p>Has Any Course Permission: {hasAnyCoursePermission.toString()}</p>
                </div>

                {/* Full width container */}
                <div className="w-full px-0">
                    {/* Compact Header Section */}
                    <div className="bg-white border-b border-gray-200 w-full px-6 py-4">
                        <div className="flex flex-col gap-4 w-full">
                            {/* Top Row - Title and Actions */}
                            <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col gap-1">
                                    <Breadcrumb className="flex-shrink-0">
                                        <BreadcrumbList>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink 
                                                    href="/lms/pages/admindashboard" 
                                                    className="text-xs text-blue-500 hover:text-indigo-600 transition-colors font-medium"
                                                >
                                                    Dashboard
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator className="text-gray-400" />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage className="text-xs font-semibold text-gray-900">
                                                    Course Management
                                                </BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </BreadcrumbList>
                                    </Breadcrumb>
                                    
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-xl font-bold text-gray-900 font-sans tracking-tight">
                                            Course Structures
                                        </h1>
                                        <div className="h-4 w-px bg-gray-300"></div>
                                        <span className="text-sm text-gray-600 font-medium">
                                            {filteredStructures.length} course{filteredStructures.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {canAddCourse && (
                                    <Button
                                        onClick={() => setIsPopupOpen(true)}
                                        className="h-9 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 px-4 shadow-sm"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add Course
                                    </Button>
                                )}
                            </div>

                            {/* Bottom Row - Search and Stats */}
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 w-full">
                                {/* Search Bar - Full width */}
                                <div className="flex-1 max-w-4xl">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Search courses, codes, clients, or categories..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-8 h-10 text-sm border-gray-300 focus:border-indigo-500 font-sans w-full bg-gray-50/50"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Statistics and Filter Toggle */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {/* Statistics */}
                                    <div className="flex items-center gap-2">
                                        {[
                                            { 
                                                title: "Total", 
                                                value: statistics.total, 
                                                color: "bg-blue-50 text-blue-700 border-blue-200",
                                                loading: isLoading
                                            },
                                            { 
                                                title: "Recent", 
                                                value: statistics.recent, 
                                                color: "bg-purple-50 text-purple-700 border-purple-200",
                                                loading: isLoading
                                            },
                                            { 
                                                title: "Active", 
                                                value: statistics.active, 
                                                color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                loading: isLoading
                                            }
                                        ].map((stat, index) => (
                                            <motion.div
                                                key={stat.title}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${stat.color} text-xs font-medium font-sans shadow-sm`}
                                            >
                                                {stat.loading ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <span className="font-bold text-sm">{stat.value}</span>
                                                )}
                                                <span className="text-xs">{stat.title}</span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Filter Toggle */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex items-center gap-2 h-9 text-xs font-medium border-gray-300 ${
                                            showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''
                                        }`}
                                    >
                                        <Filter className="h-4 w-4" />
                                        Filters
                                        {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Expandable Filters Section */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 mt-4 border-t border-gray-200">
                                        {/* Status Filter */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2 font-sans">
                                                Status
                                            </label>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full h-9 text-sm border border-gray-300 rounded-lg px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans bg-white"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="Published">Published</option>
                                                <option value="Draft">Draft</option>
                                                <option value="Unpublished">Unpublished</option>
                                            </select>
                                        </div>

                                        {/* Category Filter */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2 font-sans">
                                                Category
                                            </label>
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="w-full h-9 text-sm border border-gray-300 rounded-lg px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans bg-white"
                                            >
                                                <option value="all">All Categories</option>
                                                {categories.map((category: string) => (
                                                    <option key={category} value={category}>
                                                        {category}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Level Filter */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2 font-sans">
                                                Level
                                            </label>
                                            <select
                                                value={levelFilter}
                                                onChange={(e) => setLevelFilter(e.target.value)}
                                                className="w-full h-9 text-sm border border-gray-300 rounded-lg px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans bg-white"
                                            >
                                                <option value="all">All Levels</option>
                                                {levels.map((level: string) => (
                                                    <option key={level} value={level}>
                                                        {level}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Sort Options */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2 font-sans">
                                                Sort By
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={sortField || 'date'}
                                                    onChange={(e) => setSortField(e.target.value as 'date' | 'courseName' | 'clientName' | null)}
                                                    className="flex-1 h-9 text-sm border border-gray-300 rounded-lg px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans bg-white"
                                                >
                                                    <option value="date">Date</option>
                                                    <option value="courseName">Course Name</option>
                                                    <option value="clientName">Client</option>
                                                </select>
                                                <button
                                                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                                    className="h-9 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Clear Filters */}
                                        <div className="flex items-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearFilters}
                                                className="h-9 text-xs font-medium font-sans border-gray-300 hover:bg-gray-50"
                                            >
                                                Clear All
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Main Content Area */}
                    <div className="w-full px-6 pt-6">
                        <div className="w-full">
                            {/* Table Section */}
                            <div className="bg-white  overflow-hidden w-full ">
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

                {/* Add Course Structure Popup */}
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

                {/* Full Course Details Modal */}
                <AnimatePresence>
                    {showFullDetails && courseForDetails && (
                        <Dialog open={showFullDetails} onOpenChange={setShowFullDetails}>
                            <DialogContent className="max-w-6xl bg-white rounded-xl max-h-[90vh] overflow-y-auto">
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={popupVariants}
                                    className="w-full"
                                >
                                    <DialogHeader className="pb-4 border-b border-gray-200">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                                                    <BookOpenText className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <DialogTitle className="text-lg font-bold text-gray-900 font-sans truncate">
                                                        {courseForDetails.courseName}
                                                    </DialogTitle>
                                                    <DialogDescription className="text-sm text-gray-600 font-sans mt-0.5 flex items-center gap-2">
                                                        <span className="truncate">{courseForDetails.courseCode}</span>
                                                        <span>•</span>
                                                        <span>Complete Course Details</span>
                                                    </DialogDescription>
                                                </div>
                                            </div>
                                            <StatusBadge status={courseForDetails.status} />
                                        </div>
                                    </DialogHeader>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 w-full">
                                        {/* Left Column - Course Information */}
                                        <div className="lg:col-span-2 space-y-4">
                                            {/* Basic Information Card */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                                                    Basic Information
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                                                Course Code
                                                            </label>
                                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                                                <ListChecks className="w-4 h-4 text-indigo-600" />
                                                                <span className="text-sm font-semibold text-gray-900">
                                                                    {courseForDetails.courseCode}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                                                Category
                                                            </label>
                                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                                                <Shapes className="w-4 h-4 text-indigo-600" />
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {courseForDetails.category}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                                                Service Type
                                                            </label>
                                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                                                <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {courseForDetails.serviceType}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                                                Duration
                                                            </label>
                                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                                                <Clock className="w-4 h-4 text-indigo-600" />
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {courseForDetails.courseDuration} minutes
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                                                Level
                                                            </label>
                                                            <div className="p-2">
                                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                                    courseForDetails.courseLevel?.toLowerCase() === 'beginner'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : courseForDetails.courseLevel?.toLowerCase() === 'intermediate'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-purple-100 text-purple-800'
                                                                }`}>
                                                                    {courseForDetails.courseLevel}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                                                                Last Updated
                                                            </label>
                                                            <div className="p-2">
                                                                <span className="text-sm text-gray-700">
                                                                    {formatDate(courseForDetails.updatedAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Course Description */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-indigo-600" />
                                                    Course Description
                                                </h3>
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-3 rounded border">
                                                    {courseForDetails.courseDescription || "No description provided."}
                                                </p>
                                            </div>

                                            {/* Pedagogy Details */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-indigo-600" />
                                                    Pedagogy Structure
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <User className="w-4 h-4 text-indigo-600" />
                                                            <h4 className="text-sm font-semibold text-indigo-700">I Do</h4>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {Array.isArray(courseForDetails.I_Do) && courseForDetails.I_Do.length > 0 ? (
                                                                courseForDetails.I_Do.map((item, index) => (
                                                                    <div key={index} className="text-xs text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-200">
                                                                        {item}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">No instructor-led activities</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Users className="w-4 h-4 text-teal-600" />
                                                            <h4 className="text-sm font-semibold text-teal-700">We Do</h4>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {Array.isArray(courseForDetails.We_Do) && courseForDetails.We_Do.length > 0 ? (
                                                                courseForDetails.We_Do.map((item, index) => (
                                                                    <div key={index} className="text-xs text-teal-700 bg-white px-2 py-1 rounded border border-teal-200">
                                                                        {item}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">No collaborative activities</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <UserCheck className="w-4 h-4 text-amber-600" />
                                                            <h4 className="text-sm font-semibold text-amber-700">You Do</h4>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {Array.isArray(courseForDetails.You_Do) && courseForDetails.You_Do.length > 0 ? (
                                                                courseForDetails.You_Do.map((item, index) => (
                                                                    <div key={index} className="text-xs text-amber-700 bg-white px-2 py-1 rounded border border-amber-200">
                                                                        {item}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">No independent activities</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column - Additional Information */}
                                        <div className="space-y-4">
                                            {/* Course Image */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                                                    Course Thumbnail
                                                </h3>
                                                {courseForDetails.courseImage ? (
                                                    <div className="aspect-video rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                                                        <img
                                                            src={courseForDetails.courseImage}
                                                            alt="Course thumbnail"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                                                        <div className="text-center">
                                                            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                            <p className="text-xs text-gray-500">No thumbnail available</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Resource Types */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <FolderIcon className="w-4 h-4 text-indigo-600" />
                                                    Resource Types
                                                </h3>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(courseForDetails.resourcesType) && courseForDetails.resourcesType.length > 0 ? (
                                                        courseForDetails.resourcesType.map((type, index) => (
                                                            <span
                                                                key={index}
                                                                className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
                                                            >
                                                                <FolderIcon className="w-3 h-3" />
                                                                {type}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-gray-500 italic">No resource types specified</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Course Hierarchy */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <LayersIcon className="w-4 h-4 text-indigo-600" />
                                                    Course Levels
                                                </h3>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(courseForDetails.courseHierarchy) && courseForDetails.courseHierarchy.length > 0 ? (
                                                        courseForDetails.courseHierarchy.map((level, index) => (
                                                            <span
                                                                key={index}
                                                                className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1"
                                                            >
                                                                <LayersIcon className="w-3 h-3" />
                                                                {level}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-gray-500 italic">No course levels specified</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Client Information */}
                                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-indigo-600" />
                                                    Client Information
                                                </h3>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-500">Company</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {courseForDetails.clientData?.clientCompany || courseForDetails.clientName}
                                                        </p>
                                                    </div>
                                                    {courseForDetails.clientData?.clientAddress && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">Address</p>
                                                            <p className="text-sm text-gray-700">{courseForDetails.clientData.clientAddress}</p>
                                                        </div>
                                                    )}
                                                    {courseForDetails.clientData?.contactPersons && courseForDetails.clientData.contactPersons.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">Primary Contact</p>
                                                            <p className="text-sm text-gray-700">
                                                                {courseForDetails.clientData.contactPersons.find(p => p.isPrimary)?.name || 
                                                                 courseForDetails.clientData.contactPersons[0]?.name}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-4 border-t border-gray-200">
                                        <div className="flex gap-2 w-full justify-end">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowFullDetails(false)}
                                                className="text-sm h-9 font-medium"
                                            >
                                                Close
                                            </Button>
                                            {hasPermission(userPermissions, 'coursestructure', ' Edit Course') && (
                                                <Button
                                                    onClick={() => {
                                                        setShowFullDetails(false);
                                                        setCourseToEdit(courseForDetails._id);
                                                        setIsPopupOpen(true);
                                                    }}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-sm h-9 font-medium"
                                                >
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Edit Course
                                                </Button>
                                            )}
                                        </div>
                                    </DialogFooter>
                                </motion.div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>

                {/* Course Details Modal */}
                <AnimatePresence>
                    {selectedCourse && (
                        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
                            <DialogContent className="max-w-4xl bg-white rounded-xl w-[95vw] max-h-[85vh] overflow-y-auto">
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={popupVariants}
                                    className="w-full"
                                >
                                    <DialogHeader className="pb-3 border-b border-gray-200">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="p-1.5 bg-indigo-100 rounded-lg flex-shrink-0">
                                                    <BookOpenText className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <DialogTitle className="text-base font-semibold text-gray-900 font-sans truncate">
                                                        {selectedCourse.courseName}
                                                    </DialogTitle>
                                                    <DialogDescription className="text-xs text-gray-600 font-sans mt-0.5 truncate">
                                                        Complete information about {selectedCourse.courseName}
                                                    </DialogDescription>
                                                </div>
                                            </div>
                                            <StatusBadge status={selectedCourse.status} />
                                        </div>
                                    </DialogHeader>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 py-3 w-full">
                                        {/* Left Column - Basic Info */}
                                        <div className="lg:col-span-2 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                                <div className="space-y-2">
                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide font-sans">
                                                            Course Code
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-white rounded border border-gray-200 flex-shrink-0">
                                                                <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                                                            </div>
                                                            <span className="text-sm font-semibold text-gray-900 font-sans truncate">
                                                                {selectedCourse.courseCode}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide font-sans">
                                                            Category
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-white rounded border border-gray-200 flex-shrink-0">
                                                                <Shapes className="w-3.5 h-3.5 text-indigo-600" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900 font-sans truncate">
                                                                {selectedCourse.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide font-sans">
                                                            Service Type
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-white rounded border border-gray-200 flex-shrink-0">
                                                                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900 font-sans truncate">
                                                                {selectedCourse.serviceType}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide font-sans">
                                                            Duration & Level
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-white rounded border border-gray-200 flex-shrink-0">
                                                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-sm font-medium text-gray-900 font-sans block truncate">
                                                                    {selectedCourse.courseDuration} minutes
                                                                </span>
                                                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                                                                    selectedCourse.courseLevel?.toLowerCase() === 'beginner'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : selectedCourse.courseLevel?.toLowerCase() === 'intermediate'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-purple-100 text-purple-800'
                                                                }`}>
                                                                    {selectedCourse.courseLevel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Course Description */}
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full">
                                                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide font-sans">
                                                    Course Description
                                                </label>
                                                <p className="text-sm text-gray-700 leading-relaxed font-sans whitespace-pre-line max-h-24 overflow-y-auto">
                                                    {selectedCourse.courseDescription}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Column - Image */}
                                        <div className="space-y-3">
                                            {selectedCourse.courseImage ? (
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full">
                                                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide font-sans">
                                                        Course Thumbnail
                                                    </label>
                                                    <div className="aspect-video rounded border border-gray-200 overflow-hidden bg-white w-full">
                                                        <img
                                                            src={selectedCourse.courseImage}
                                                            alt="Course thumbnail"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 w-full h-full flex items-center justify-center min-h-[120px]">
                                                    <div className="text-center">
                                                        <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                                        <p className="text-xs text-gray-500 font-sans">No thumbnail available</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>

                {/* Client Details Modal */}
                <AnimatePresence>
                    {selectedClient && (
                        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
                            <DialogContent className="max-w-2xl bg-white rounded-xl w-[95vw] max-h-[80vh] overflow-y-auto">
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={popupVariants}
                                >
                                    <DialogHeader className="pb-3 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-blue-600" />
                                            <DialogTitle className="text-sm font-semibold text-gray-800">Client Details</DialogTitle>
                                        </div>
                                    </DialogHeader>

                                    {selectedClient && (
                                        <div className="space-y-3 py-2">
                                            {/* Client Overview Card */}
                                            <div className="bg-gray-50 p-3 rounded border">
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <Briefcase className="h-3 w-3 mr-1 text-blue-500" />
                                                            Company Name
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-800 pl-4 break-words">
                                                            {selectedClient.clientCompany}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <MapPin className="h-3 w-3 mr-1 text-blue-500" />
                                                            Address
                                                        </div>
                                                        <p className="text-sm text-gray-700 pl-4 break-words">{selectedClient.clientAddress}</p>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <Activity className="h-3 w-3 mr-1 text-blue-500" />
                                                            Status
                                                        </div>
                                                        <div className="pl-4">
                                                            <Badge
                                                                variant={selectedClient.status === 'active' ? 'default' : 'outline'}
                                                                className={`text-xs ${selectedClient.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-green-50' : 'bg-gray-50 text-gray-600 hover:bg-gray-50'}`}
                                                            >
                                                                {selectedClient.status === 'active' ? (
                                                                    <CheckCircle className="h-3 w-3 mr-0.5" />
                                                                ) : (
                                                                    <Clock className="h-3 w-3 mr-0.5" />
                                                                )}
                                                                {selectedClient.status.charAt(0).toUpperCase() + selectedClient.status.slice(1)}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <FileText className="h-3 w-3 mr-1 text-blue-500" />
                                                            Description
                                                        </div>
                                                        <p className="text-sm text-gray-700 pl-4 break-words">
                                                            {selectedClient.description || "-"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Persons Section */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="flex items-center text-sm font-medium text-gray-800">
                                                        <Users className="h-4 w-4 mr-1 text-blue-600" />
                                                        Contact Persons
                                                    </h3>
                                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                        {selectedClient.contactPersons.length}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {selectedClient.contactPersons.map((person: any, index: number) => (
                                                        <div key={index} className="bg-white border rounded p-3 shadow-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center">
                                                                    <User className="h-4 w-4 mr-1 text-gray-500" />
                                                                    <span className="font-medium text-sm text-gray-800">{person.name}</span>
                                                                </div>
                                                                {person.isPrimary && (
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                )}
                                                            </div>

                                                            <div className="space-y-1">
                                                                <a
                                                                    href={`mailto:${person.email}`}
                                                                    className="flex items-center text-sm text-gray-600 hover:text-blue-600 hover:underline"
                                                                >
                                                                    <Mail className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                                                                    <span className="break-all">{person.email}</span>
                                                                </a>

                                                                <a
                                                                    href={`tel:${person.phoneNumber}`}
                                                                    className="flex items-center text-sm text-gray-600 hover:text-blue-600 hover:underline"
                                                                >
                                                                    <Phone className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                                                                    <span>{person.phoneNumber}</span>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>

                {/* Hierarchy Details Modal */}
                <AnimatePresence>
                    {selectedHierarchy && (
                        <Dialog open={!!selectedHierarchy} onOpenChange={() => setSelectedHierarchy(null)}>
                            <DialogContent className="max-w-md bg-white rounded-xl">
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={popupVariants}
                                >
                                    <DialogHeader className="pb-3 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-indigo-100 text-indigo-600">
                                                <LayoutGridIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <DialogTitle className="text-sm font-semibold text-gray-900">
                                                    Course Structure Details
                                                </DialogTitle>
                                            </div>
                                        </div>
                                    </DialogHeader>

                                    {selectedHierarchy && (
                                        <div className="space-y-4 py-3">
                                            {/* Resource Types Section */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-amber-100 text-amber-600">
                                                        <FolderIcon className="w-4 h-4" />
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-gray-700">
                                                        Resource Types
                                                    </h4>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(selectedHierarchy.resourcesType) ? (
                                                        selectedHierarchy.resourcesType.map((type: string, index: number) => (
                                                            <span
                                                                key={index}
                                                                className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
                                                            >
                                                                <FolderIcon className="w-3 h-3" />
                                                                {type}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                                            <FolderIcon className="w-3 h-3" />
                                                            {selectedHierarchy.resourcesType}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Course Hierarchy Section */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-indigo-100 text-indigo-600">
                                                        <LayersIcon className="w-4 h-4" />
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-gray-700">
                                                        Course Levels
                                                    </h4>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(selectedHierarchy.courseHierarchy) ? (
                                                        selectedHierarchy.courseHierarchy.map((hierarchy: string, index: number) => (
                                                            <span
                                                                key={index}
                                                                className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1"
                                                            >
                                                                <LayersIcon className="w-3 h-3" />
                                                                {hierarchy}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                                            <LayersIcon className="w-3 h-3" />
                                                            {selectedHierarchy.courseHierarchy}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>

                {/* Pedagogy Details Modal */}
                <AnimatePresence>
                    {selectedPedagogy && (
                        <Dialog open={!!selectedPedagogy} onOpenChange={() => setSelectedPedagogy(null)}>
                            <DialogContent className="max-w-md bg-white rounded-xl max-h-[80vh] overflow-y-auto">
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={popupVariants}
                                >
                                    <DialogHeader className="pb-3 border-b border-gray-200">
                                        <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                            <BookOpen className="w-4 h-4 text-indigo-600" />
                                            Pedagogy Details
                                        </DialogTitle>
                                    </DialogHeader>

                                    {selectedPedagogy && (
                                        <div className="grid gap-3 py-2">
                                            {/* I Do Section */}
                                            <div className="p-3 bg-indigo-50 rounded border border-indigo-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <User className="w-4 h-4 text-indigo-600" />
                                                    <h4 className="text-sm font-semibold text-indigo-700">I Do (Instructor Led)</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(selectedPedagogy.I_Do) ? (
                                                        selectedPedagogy.I_Do.length > 0 ? (
                                                            selectedPedagogy.I_Do.map((item: string, index: number) => (
                                                                <Badge
                                                                    key={index}
                                                                    variant="outline"
                                                                    className="text-xs bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 px-2 py-0.5"
                                                                >
                                                                    {item}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">No instructor-led activities</p>
                                                        )
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 px-2 py-0.5"
                                                        >
                                                            {selectedPedagogy.I_Do}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* We Do Section */}
                                            <div className="p-3 bg-teal-50 rounded border border-teal-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="w-4 h-4 text-teal-600" />
                                                    <h4 className="text-sm font-semibold text-teal-700">We Do (Collaborative)</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(selectedPedagogy.We_Do) ? (
                                                        selectedPedagogy.We_Do.length > 0 ? (
                                                            selectedPedagogy.We_Do.map((item: string, index: number) => (
                                                                <Badge
                                                                    key={index}
                                                                    variant="outline"
                                                                    className="text-xs bg-white text-teal-700 border-teal-200 hover:bg-teal-50 px-2 py-0.5"
                                                                >
                                                                    {item}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">No collaborative activities</p>
                                                        )
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-white text-teal-700 border-teal-200 hover:bg-teal-50 px-2 py-0.5"
                                                        >
                                                            {selectedPedagogy.We_Do}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* You Do Section */}
                                            <div className="p-3 bg-amber-50 rounded border border-amber-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <UserCheck className="w-4 h-4 text-amber-600" />
                                                    <h4 className="text-sm font-semibold text-amber-700">You Do (Independent)</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(selectedPedagogy.You_Do) ? (
                                                        selectedPedagogy.You_Do.length > 0 ? (
                                                            selectedPedagogy.You_Do.map((item: string, index: number) => (
                                                                <Badge
                                                                    key={index}
                                                                    variant="outline"
                                                                    className="text-xs bg-white text-amber-700 border-amber-200 hover:bg-amber-50 px-2 py-0.5"
                                                                >
                                                                    {item}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">No independent activities</p>
                                                        )
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-white text-amber-700 border-amber-200 hover:bg-amber-50 px-2 py-0.5"
                                                        >
                                                            {selectedPedagogy.You_Do}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                            <DialogContent className="max-w-md bg-white rounded-xl">
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={popupVariants}
                                >
                                    <DialogHeader className="text-center">
                                        <div className="mx-auto w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-3">
                                            <Trash2 className="h-5 w-5 text-red-600" />
                                        </div>
                                        <DialogTitle className="text-base font-semibold text-gray-900 font-sans">
                                            Delete Course Structure
                                        </DialogTitle>
                                        <DialogDescription className="text-sm text-gray-600 font-sans mt-1">
                                            This action cannot be undone. The course structure will be permanently removed.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-sm font-semibold text-red-800 font-sans truncate">
                                            {courseToDelete?.courseName}
                                        </p>
                                        <p className="text-xs text-red-600 font-sans mt-0.5">
                                            Code: {courseToDelete?.courseCode}
                                        </p>
                                    </div>

                                    <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDeleteModal(false)}
                                            className="flex-1 text-sm h-9 font-medium font-sans w-full sm:w-auto"
                                            disabled={isDeleting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={confirmDelete}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-sm h-9 font-medium font-sans w-full sm:w-auto"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                "Delete Course"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </motion.div>
                            </DialogContent>
                        </Dialog>
                    )}
                </AnimatePresence>
            </motion.div>
        </DashboardLayout>
    );
}