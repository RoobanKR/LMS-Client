import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MoreVertical, 
    Eye, 
    UserPlus, 
    UploadIcon, 
    Edit, 
    Copy, 
    Trash2 
} from 'lucide-react';
import { CourseStructure, Permission } from './types/index';
import { hasPermission, getPermission } from './types/util';

interface CustomDropdownProps {
    course: CourseStructure;
    onViewDetails: (course: CourseStructure) => void;
    onEdit: (courseId: string) => void;
    onDuplicate: (courseId: string) => void;
    onDelete: (course: CourseStructure) => void;
    userPermissions: Permission[];
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
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
    
    const goToUploadResources = (courseId: string) => {
        const query = new URLSearchParams({
            courseId: courseId ?? '',
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
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-200 group opacity-50 cursor-not-allowed"
                disabled
            >
                <MoreVertical className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200 group"
                disabled={!hasAnyPermission}
            >
                <MoreVertical className="h-3 w-3 text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 z-50 py-1"
                    >
                        {/* View Full Details */}
                        {canViewDetails && (
                            <button
                                onClick={() => handleAction('view')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors"
                            >
                                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                View Full Details
                            </button>
                        )}
                        
                        {/* Add Participants */}
                        {canAddParticipants && (
                            <button
                                onClick={() => handleAction('participants')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors"
                            >
                                <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                                Add Participants
                            </button>
                        )}
                        
                        {/* Upload Resources */}
                        {canUploadResources && (
                            <button
                                onClick={() => goToUploadResources(course._id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors"
                            >
                                <UploadIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                Upload Resources
                            </button>
                        )}
                        
                        {/* Edit Course */}
                        {canEditCourse && (
                            <button
                                onClick={() => handleAction('edit')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors"
                            >
                                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                Edit Course
                            </button>
                        )}
                        
                        {/* Duplicate Course */}
                        {canDuplicateCourse && (
                            <button
                                onClick={() => handleAction('duplicate')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors"
                            >
                                <Copy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                Duplicate
                            </button>
                        )}
                        
                        {/* Show divider only if there are items above and delete below */}
                        {(canViewDetails || canAddParticipants || canUploadResources || canEditCourse || canDuplicateCourse) && canDeleteCourse && (
                            <div className="border-t border-gray-200 dark:border-gray-800 my-1"></div>
                        )}
                        
                        {/* Delete Course */}
                        {canDeleteCourse && (
                            <button
                                onClick={() => handleAction('delete')}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Course
                            </button>
                        )}
                        
                        {/* If no permissions show message */}
                        {!canViewDetails && !canAddParticipants && !canUploadResources && !canEditCourse && !canDuplicateCourse && !canDeleteCourse && (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center italic">
                                No actions available
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};