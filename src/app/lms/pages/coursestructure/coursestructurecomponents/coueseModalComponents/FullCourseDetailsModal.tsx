// components/modals/FullCourseDetailsModal.tsx
import { AnimatePresence, motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    BookOpenText, 
    LayoutDashboard, 
    ListChecks, 
    Shapes, 
    Clock, 
    FileText, 
    Users, 
    User, 
    UserCheck,
    ImageIcon,
    FolderIcon,
    LayersIcon,
    Building2,
    Edit,
    Bot,
    Sparkles
} from 'lucide-react';
import { BaseModalProps, popupVariants } from './types';
import { StatusBadge } from '../StatusBadge';
import { ResourceTypesDisplay } from './ResourceTypesDisplay';
import { formatDate,hasPermission } from '../types/util';

export const FullCourseDetailsModal: React.FC<BaseModalProps> = ({
    showFullDetails,
    setShowFullDetails,
    courseForDetails,
    userPermissions,
    setCourseToEdit,
    setIsPopupOpen
}) => {
    if (!showFullDetails || !courseForDetails || !setShowFullDetails) return null;

    return (
        <AnimatePresence>
            {showFullDetails && courseForDetails && (
                <Dialog open={showFullDetails} onOpenChange={setShowFullDetails}>
                    <DialogContent className="max-w-6xl bg-white dark:bg-gray-900 rounded-xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={popupVariants}
                            className="w-full"
                        >
                            <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
                                            <BookOpenText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white font-sans truncate">
                                                {courseForDetails.courseName}
                                            </DialogTitle>
                                            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 font-sans mt-0.5 flex items-center gap-2">
                                                <span className="truncate">{courseForDetails.courseCode}</span>
                                                <span className="text-gray-400 dark:text-gray-600">•</span>
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
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            Basic Information
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <InfoField label="Course Code" icon={ListChecks}>
                                                    {courseForDetails.courseCode}
                                                </InfoField>
                                                <InfoField label="Category" icon={Shapes}>
                                                    {courseForDetails.category}
                                                </InfoField>
                                                <InfoField label="Service Type" icon={LayoutDashboard}>
                                                    {courseForDetails.serviceType}
                                                </InfoField>
                                            </div>
                                            <div className="space-y-3">
                                                <InfoField label="Duration" icon={Clock}>
                                                    {courseForDetails.courseDuration || 'N/A'} {courseForDetails.courseDuration ? 'minutes' : ''}
                                                </InfoField>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                                                        Level
                                                    </label>
                                                    <div className="p-2">
                                                        <LevelBadge level={courseForDetails.courseLevel} />
                                                    </div>
                                                </div>
                                                <InfoField label="Last Updated">
                                                    {formatDate(courseForDetails.updatedAt)}
                                                </InfoField>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Course Description */}
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            Course Description
                                        </h3>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                                            {courseForDetails.courseDescription || "No description provided."}
                                        </p>
                                    </div>

                                    {/* Pedagogy Details */}
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            Pedagogy Structure
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <PedagogySection 
                                                title="I Do" 
                                                icon={User} 
                                                items={courseForDetails.I_Do}
                                                color="indigo"
                                                emptyMessage="No instructor-led activities"
                                            />
                                            <PedagogySection 
                                                title="We Do" 
                                                icon={Users} 
                                                items={courseForDetails.We_Do}
                                                color="teal"
                                                emptyMessage="No collaborative activities"
                                            />
                                            <PedagogySection 
                                                title="You Do" 
                                                icon={UserCheck} 
                                                items={courseForDetails.You_Do}
                                                color="amber"
                                                emptyMessage="No independent activities"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Additional Information */}
                                <div className="space-y-4">
                                    {/* Course Image */}
                                    <CourseImageDisplay courseImage={courseForDetails.courseImage} />

                                    {/* Resource Types */}
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <FolderIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            Resource Types
                                        </h3>
                                        <ResourceTypesDisplay resourcesType={courseForDetails.resourcesType} />
                                    </div>

                                    {/* Course Hierarchy */}
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <LayersIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            Course Levels
                                        </h3>
                                        <HierarchyList items={courseForDetails.courseHierarchy} />
                                    </div>

                                    {/* Client Information */}
                                    <ClientInfoCard course={courseForDetails} />
                                </div>
                            </div>

                            <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                <div className="flex gap-2 w-full justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowFullDetails(false)}
                                        className="text-sm h-9 font-medium border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        Close
                                    </Button>
                                    {hasPermission(userPermissions, 'coursestructure', ' Edit Course') && (
                                        <Button
                                            onClick={() => {
                                                setShowFullDetails(false);
                                                setCourseToEdit?.(courseForDetails._id);
                                                setIsPopupOpen?.(true);
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-sm h-9 font-medium"
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
    );
};

// Helper sub-components
const InfoField: React.FC<{ label: string; icon?: any; children: React.ReactNode }> = ({ label, icon: Icon, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            {label}
        </label>
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            {Icon && <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
                {children}
            </span>
        </div>
    </div>
);

const LevelBadge: React.FC<{ level: string }> = ({ level }) => (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
        level?.toLowerCase() === 'beginner'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
            : level?.toLowerCase() === 'intermediate'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    }`}>
        {level}
    </span>
);

const PedagogySection: React.FC<{ 
    title: string; 
    icon: any; 
    items: string[]; 
    color: string;
    emptyMessage: string;
}> = ({ title, icon: Icon, items, color, emptyMessage }) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800',
        teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
    };
    
    const textColorClasses = {
        indigo: 'text-indigo-700 dark:text-indigo-300',
        teal: 'text-teal-700 dark:text-teal-300',
        amber: 'text-amber-700 dark:text-amber-300'
    };

    return (
        <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-3 border`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${textColorClasses[color as keyof typeof textColorClasses]}`} />
                <h4 className={`text-sm font-semibold ${textColorClasses[color as keyof typeof textColorClasses]}`}>
                    {title}
                </h4>
            </div>
            <div className="space-y-1">
                {Array.isArray(items) && items.length > 0 ? (
                    items.map((item, index) => (
                        <div key={index} className={`text-xs ${textColorClasses[color as keyof typeof textColorClasses]} bg-white dark:bg-gray-800 px-2 py-1 rounded border`}>
                            {item}
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{emptyMessage}</p>
                )}
            </div>
        </div>
    );
};

const CourseImageDisplay: React.FC<{ courseImage?: string }> = ({ courseImage }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Course Thumbnail
        </h3>
        {courseImage ? (
            <div className="aspect-video rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img src={courseImage} alt="Course thumbnail" className="w-full h-full object-cover" />
            </div>
        ) : (
            <div className="aspect-video rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">No thumbnail available</p>
                </div>
            </div>
        )}
    </div>
);

const HierarchyList: React.FC<{ items: string[] }> = ({ items }) => (
    <div className="flex flex-wrap gap-1">
        {Array.isArray(items) && items.length > 0 ? (
            items.map((level, index) => (
                <span
                    key={index}
                    className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                >
                    <LayersIcon className="w-3 h-3" />
                    {level}
                </span>
            ))
        ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">No course levels specified</p>
        )}
    </div>
);

const ClientInfoCard: React.FC<{ course: any }> = ({ course }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Client Information
        </h3>
        <div className="space-y-2">
            <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Company</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {course.clientData?.clientCompany || 
                     (typeof course.clientName === 'string' ? course.clientName : 'N/A')}
                </p>
            </div>
            {course.clientData?.clientAddress && (
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{course.clientData.clientAddress}</p>
                </div>
            )}
            {course.clientData?.contactPersons && course.clientData.contactPersons.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Primary Contact</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        {course.clientData.contactPersons.find((p: any) => p.isPrimary)?.name || 
                         course.clientData.contactPersons[0]?.name}
                    </p>
                </div>
            )}
        </div>
    </div>
);