import { ReactNode } from 'react';
import { CourseStructure, Permission } from './types';
import { formatDate } from './types/util';
import { CustomDropdown } from './CustomDropdown';
import { 
    LayersIcon, 
    Users, 
    ListChecks,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

interface CourseTableColumnsProps {
    sortField: 'date' | 'courseName' | 'clientName' | null;
    sortDirection: 'asc' | 'desc';
    handleSort: (field: 'date' | 'courseName' | 'clientName') => void;
    getSortIcon: (field: 'date' | 'courseName' | 'clientName') => ReactNode;
    setSelectedCourse: (course: CourseStructure | null) => void;
    setSelectedHierarchy: (hierarchy: any) => void;
    setSelectedPedagogy: (pedagogy: any) => void;
    canAddCourseStructure: boolean;
    userPermissions: Permission[];
    goToPedagogyPage: (courseId: string) => void;
    handleViewFullDetails: (course: CourseStructure) => void;
    handleEditCourse: (courseId: string) => void;
    handleDeleteCourse: (course: CourseStructure) => void;
}

export const CourseTableColumns = ({
    sortField,
    sortDirection,
    handleSort,
    getSortIcon,
    setSelectedCourse,
    setSelectedHierarchy,
    setSelectedPedagogy,
    canAddCourseStructure,
    userPermissions,
    goToPedagogyPage,
    handleViewFullDetails,
    handleEditCourse,
    handleDeleteCourse
}: CourseTableColumnsProps) => {
    
    const columns = [
        {
            key: 'courseDate',
            label: (
                <div className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors" onClick={() => handleSort('date')}>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Date</span>
                    {getSortIcon('date')}
                </div>
            ),
            width: '10%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 font-sans">
                    {formatDate(structure.updatedAt)}
                </div>
            )
        },
        {
            key: 'clientName',
            label: (
                <div className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors" onClick={() => handleSort('clientName')}>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Client</span>
                    {getSortIcon('clientName')}
                </div>
            ),
            width: '14%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 font-sans truncate">
                    {structure.clientData?.clientCompany || (typeof structure.clientName === 'string' ? structure.clientName : structure.clientName?.$oid || '')}
                </div>
            )
        },
        {
            key: 'courseName',
            label: (
                <div className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors" onClick={() => handleSort('courseName')}>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Course Name</span>
                    {getSortIcon('courseName')}
                </div>
            ),
            width: '18%',
            align: 'left' as const,
            renderCell: (structure: CourseStructure) => (
                <button
                    onClick={() => setSelectedCourse(structure)}
                    className="flex flex-col text-left w-full hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-1 transition-colors"
                >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white font-sans truncate">{structure.courseName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium font-sans">{structure.courseCode}</span>
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
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-sans">{structure.category}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-sans">{structure.courseDuration}m • {structure.courseLevel}</span>
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
            className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 border border-indigo-200 dark:border-indigo-800 transition-all duration-200 group w-full"
        >
            <LayersIcon className="h-3 w-3 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 group-hover:text-indigo-800 dark:group-hover:text-indigo-200">View</span>
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
                    className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/40 border border-purple-200 dark:border-purple-800 transition-all duration-200 group w-full"
                >
                    <Users className="h-3 w-3 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200">View</span>
                </button>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '18%',
            align: 'center' as const,
            renderCell: (structure: CourseStructure) => {
                const handleDuplicateCourse = (courseId: string) => {
                    // Add your duplicate logic here
                    console.log('Duplicate course:', courseId);
                };

                return (
                    <div className="flex gap-1 justify-center">
                        {canAddCourseStructure && (
                            <button
                                onClick={() => goToPedagogyPage(structure._id)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 border border-emerald-200 dark:border-emerald-800 transition-all duration-200 group"
                            >
                                <ListChecks className="h-3 w-3 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300" />
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">Add Course Structure</span>
                            </button>
                        )}
                        
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

    return columns;
};