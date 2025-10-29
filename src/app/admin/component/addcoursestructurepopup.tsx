import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, Info, X, CircleHelp, Eye, Building2, Building, Layers, Box, Hash, FileInput, FileText, Film, Folder, FolderOpen, Link, Archive, File, FileStack, User, UserCheck, Users, ListTree, BookOpen, BarChart2, Clock, Image, Pencil, GraduationCap, Calendar } from "lucide-react";
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InfoTooltip from '@/components/ui/reusabletooltip';
import { cleanup, fetchClients } from '@/apiServices/dynamicFields/client';
import { useServices } from '@/apiServices/dynamicFields/servicemodel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCategories } from '@/apiServices/dynamicFields/category';
import { courseStructureApi } from '@/apiServices/createCourseStucture';
import { toast } from 'react-toastify';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pedagogyStructureApi } from '@/apiServices/dynamicFields/pedagogyStructureService';
import MDEditor from '@uiw/react-md-editor';

interface AddCourseSettingsPopupProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string;
    onSuccess?: () => void;
    totalCourses?: number;
}

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

interface Category {
    _id: string;
    categoryName: string;
    categoryDescription: string;
    categoryCode: string;
    courseNames: string[];
    createdAt?: string;
    updatedAt?: string;
}

interface CheckboxOptions {
    module: boolean;
    submodule: boolean;
    topic: boolean;
    subtopic: boolean;
}

interface ContentOptions {
    ppt: boolean;
    pdf: boolean;
    video: boolean;
}

interface ServiceModal {
    id: string;
    name: string;
    description: string;
}

interface Service {
    id: string;
    name: string;
    status: 'Active' | 'Inactive';
    description: string;
    serviceModals: ServiceModal[];
}

type ContactPerson = {
    name: string
    email: string
    phoneNumber: string
    isPrimary: boolean
}
type Client = {
    _id: string
    contactPersons: ContactPerson[]
    clientCompany: string
    description: string
    clientAddress: string
    status: string
    isActive: boolean
}

interface FormData {
    client: string;
    categoryName: string;
    level: string;
    duration: string;
    selectedCourseName: string;
    title: string;
    courseid: string;
    courseDescription: string;
    instructor: string;
    modal: string;
    image: File | null;
    iDo: string[];
    weDo: string[];
    youDo: string[];
    checkboxOptions: CheckboxOptions;
    contentOptions: ContentOptions;
    modules: Array<{
        name: string;
        contentOptions: ContentOptions;
        submodules: Array<{
            name: string;
            contentOptions: ContentOptions;
            topics: Array<{
                name: string;
                contentOptions: ContentOptions;
                subtopics: string[];
            }>;
        }>;
    }>;
}

interface PreviewData {
    modules: Array<{
        name: string;
        topics: Array<{
            name: string;
            learningLevel: string;
            lectureHours: number;
            handsOnTraining: number;
            selfStudy: number;
        }>;
    }>;
    pedagogy: {
        iDo: string[];
        weDo: string[];
        youDo: string[];
    };
}

interface ValidationErrors {
    client?: string;
    modal?: string;
    duration?: string;
    categoryName?: string;
    selectedCourseName?: string;
    level?: string;
    courseDescription?: string;
    checkboxOptions?: string;
    resourceType?: string;
}

// Professional Toast Component
const ProfessionalToast = ({ message, type, closeToast }: { message: string; type: 'success' | 'error' | 'info' | 'warning'; closeToast?: () => void }) => {
    const getToastConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <Check className="h-5 w-5 text-white" />,
                    bgColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
                    borderColor: 'border-l-4 border-emerald-400',
                    iconBg: 'bg-emerald-500'
                };
            case 'error':
                return {
                    icon: <X className="h-5 w-5 text-white" />,
                    bgColor: 'bg-gradient-to-r from-red-500 to-rose-600',
                    borderColor: 'border-l-4 border-rose-400',
                    iconBg: 'bg-rose-500'
                };
            case 'warning':
                return {
                    icon: <Info className="h-5 w-5 text-white" />,
                    bgColor: 'bg-gradient-to-r from-amber-500 to-orange-600',
                    borderColor: 'border-l-4 border-amber-400',
                    iconBg: 'bg-amber-500'
                };
            case 'info':
                return {
                    icon: <Info className="h-5 w-5 text-white" />,
                    bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    borderColor: 'border-l-4 border-indigo-400',
                    iconBg: 'bg-indigo-500'
                };
            default:
                return {
                    icon: <Info className="h-5 w-5 text-white" />,
                    bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                    borderColor: 'border-l-4 border-indigo-400',
                    iconBg: 'bg-indigo-500'
                };
        }
    };

    const config = getToastConfig();

    return (
        <div className={`flex items-center w-full max-w-md p-4 rounded-lg shadow-xl ${config.bgColor} ${config.borderColor} text-white font-sans transform transition-all duration-300 hover:scale-105`}>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center mr-3 shadow-md`}>
                {config.icon}
            </div>
            <div className="flex-1">
                <div className="text-sm font-semibold leading-tight">
                    {message}
                </div>
            </div>
            <button
                onClick={closeToast}
                className="flex-shrink-0 ml-4 text-white hover:text-gray-200 transition-colors duration-200"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

// Toast manager with professional configurations
const showToast = {
    success: (message: string) => {
        toast(({ closeToast }) => (
            <ProfessionalToast message={message} type="success" closeToast={closeToast} />
        ), {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            className: '!p-0 !m-0 !bg-transparent !shadow-none !border-0',
            bodyClassName: '!p-0 !m-0',
            progressClassName: '!hidden',
        });
    },
    error: (message: string) => {
        toast(({ closeToast }) => (
            <ProfessionalToast message={message} type="error" closeToast={closeToast} />
        ), {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            className: '!p-0 !m-0 !bg-transparent !shadow-none !border-0',
            bodyClassName: '!p-0 !m-0',
            progressClassName: '!hidden',
        });
    },
    info: (message: string) => {
        toast(({ closeToast }) => (
            <ProfessionalToast message={message} type="info" closeToast={closeToast} />
        ), {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            className: '!p-0 !m-0 !bg-transparent !shadow-none !border-0',
            bodyClassName: '!p-0 !m-0',
            progressClassName: '!hidden',
        });
    },
    warning: (message: string) => {
        toast(({ closeToast }) => (
            <ProfessionalToast message={message} type="warning" closeToast={closeToast} />
        ), {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            className: '!p-0 !m-0 !bg-transparent !shadow-none !border-0',
            bodyClassName: '!p-0 !m-0',
            progressClassName: '!hidden',
        });
    }
};

const CourseCreationHelpDialog = ({
    isOpen,
    onOpenChange,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] max-h-[95vh] overflow-y-auto bg-white font-sans rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900 font-sans">
                        Course Creation Guide
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 font-sans">
                        Follow these steps to create your course successfully
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2 text-gray-700 font-sans">
                    <div className='grid grid-cols-2 gap-5'>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="font-bold text-base mb-3 text-gray-800 flex items-center gap-2 font-sans">
                                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-sans">1</span>
                                Course Basic Configuration
                            </h4>
                            <ul className="list-disc pl-6 space-y-2 text-sm font-sans">
                                <li className="text-gray-700">Select the appropriate client for your course from the dropdown</li>
                                <li className="text-gray-700">Choose the course modal that matches your delivery method</li>
                                <li className="text-gray-700">Pick the domain that best fits your course content</li>
                                <li className="text-gray-700 font-semibold">All fields in this step are required to proceed</li>
                            </ul>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="font-bold text-base mb-3 text-gray-800 flex items-center gap-2 font-sans">
                                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-sans">2</span>
                                Course Details
                            </h4>
                            <ul className="list-disc pl-6 space-y-2 text-sm font-sans">
                                <li className="text-gray-700">Provide a unique course ID for reference</li>
                                <li className="text-gray-700">Enter a clear and descriptive course name</li>
                                <li className="text-gray-700">Select the appropriate difficulty level for your course</li>
                                <li className="text-gray-700">Specify the estimated duration of the course</li>
                                <li className="text-gray-700">Upload an attractive image that represents your course</li>
                                <li className="text-gray-700">Write a detailed description covering what students will learn (Optional)</li>
                                <li className="text-gray-700 font-semibold">Course description is optional but recommended</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-base text-blue-700 font-sans">
                        <div className="font-semibold mb-2 font-sans">ℹ️ Important Notes:</div>
                        <ul className="space-y-1 font-sans">
                            <li>• You can navigate between steps using the Previous and Next buttons</li>
                            <li>• All changes will be saved only when you click "Create Course"</li>
                            <li>• Use the rich text editor to format your course description with headings, lists, and links</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ConfirmationDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onLater: () => void;
}> = ({ isOpen, onClose, onConfirm, onLater }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose} >
            <DialogContent className="sm:max-w-md bg-white font-sans rounded-xl" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 font-sans">
                        Add Course Structure?
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-600 font-sans">
                        Would you like to add detailed Course Structure information now, or would you prefer to do it later?
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 font-sans">
                            Adding Course Structure details now will help you structure your teaching methods and learning activities more effectively.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={onLater}
                        className="h-9 px-4 text-sm border-slate-300 text-slate-700 hover:bg-slate-100 font-sans rounded-lg"
                    >
                        Later
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white font-sans rounded-lg"
                    >
                        Yes, Add Now
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const PreviewDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    formData: FormData;
}> = ({ isOpen, onClose, onSubmit, formData }) => {

    const tleColspan = Math.max(3,
        (formData.iDo?.length > 0 ? formData.iDo.length : 1) +
        (formData.weDo?.length > 0 ? formData.weDo.length : 1) +
        (formData.youDo?.length > 0 ? formData.youDo.length : 1)
    );

    const previewVariants = {
        hidden: {
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.2 }
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.2 }
        }
    } as const;

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="w-full max-w-[95vw] rounded-xl bg-white p-4 sm:p-6 font-sans" showCloseButton={false}>
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={previewVariants}
                    className="space-y-4 font-sans"
                >
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 font-sans">
                            <Eye className="h-5 w-5 text-blue-600" />
                            Course Layout Preview
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 font-sans">
                        <div>
                            <div className="relative">
                                <div className="overflow-auto max-h-[60vh] w-[90vw] border border-gray-400 rounded-lg">
                                    <table className="w-full border-collapse font-sans">
                                        <thead className="bg-white sticky top-0 border-b-2 border-gray-400">
                                            <tr>
                                                {formData.checkboxOptions?.module && (
                                                    <th rowSpan={3} className="border border-gray-400 p-2 text-center text-sm font-semibold text-slate-900 font-sans">
                                                        Module
                                                    </th>
                                                )}
                                                {formData.checkboxOptions?.submodule && (
                                                    <th rowSpan={3} className="border border-gray-400 p-2 text-center text-sm font-semibold text-slate-900 font-sans">
                                                        Submodule
                                                    </th>
                                                )}
                                                {formData.checkboxOptions?.topic && (
                                                    <th rowSpan={3} className="border border-gray-400 p-2 text-center text-sm font-semibold text-slate-900 font-sans">
                                                        Topic
                                                    </th>
                                                )}
                                                {formData.checkboxOptions?.subtopic && (
                                                    <th rowSpan={3} className="border border-gray-400 p-2 text-center text-sm font-semibold text-slate-900 font-sans">
                                                        Subtopic
                                                    </th>
                                                )}
                                                <th rowSpan={3} className="border border-gray-400 p-2 text-center text-sm font-semibold text-slate-900 font-sans">
                                                    Learning Level
                                                </th>
                                                <th className="border border-gray-400 p-2 text-center text-sm font-semibold text-slate-900 font-sans"
                                                    colSpan={tleColspan}>
                                                    Teaching Learning Elements
                                                </th>
                                            </tr>

                                            <tr>
                                                {formData?.iDo?.length > 0 ? (
                                                    <th className="border border-gray-400 p-2 text-sm font-semibold text-slate-900 text-center font-sans"
                                                        colSpan={formData?.iDo.length}>
                                                        I Do
                                                    </th>
                                                ) : (<th className="border border-gray-400 p-2 text-sm font-semibold text-slate-900 text-center font-sans">
                                                    I Do
                                                </th>)}
                                                {formData?.weDo?.length > 0 ? (
                                                    <th className="border border-gray-400 p-2 text-sm font-semibold text-slate-900 text-center font-sans"
                                                        colSpan={formData?.weDo.length}>
                                                        We Do
                                                    </th>
                                                ) : (<th className="border border-gray-400 p-2 text-sm font-semibold text-slate-900 text-center font-sans">
                                                    We Do
                                                    </th>)}
                                                {formData?.youDo?.length > 0 ? (
                                                    <th className="border border-gray-400 p-2 text-sm font-semibold text-slate-900 text-center font-sans"
                                                        colSpan={formData.youDo.length}>
                                                        You Do
                                                    </th>
                                                ) : (<th className="border border-gray-400 p-2 text-sm font-semibold text-slate-900 text-center font-sans">
                                                    You Do
                                                </th>)}
                                            </tr>

                                            <tr>
                                                {formData?.iDo?.length > 0 ? (
                                                    formData.iDo.map((method, index) => (
                                                        <th key={index} className="border border-gray-400 p-2 text-xs font-semibold text-slate-600 font-sans">
                                                            {method}
                                                        </th>
                                                    ))
                                                ) : (<th className="border border-gray-400 p-2 text-xs font-semibold text-slate-600 font-sans"></th>)}
                                                {formData?.weDo?.length > 0 ? (
                                                    formData.weDo.map((method, index) => (
                                                        <th key={index} className="border border-gray-400 p-2 text-xs font-semibold text-slate-600 font-sans">
                                                            {method}
                                                        </th>
                                                    ))
                                                ) : (<th className="border border-gray-400 p-2 text-xs font-semibold text-slate-600 font-sans"></th>)}
                                                {formData?.youDo?.length > 0 ? (
                                                    formData.youDo.map((method, index) => (
                                                        <th key={index} className="border border-gray-400 p-2 text-xs font-semibold text-slate-600 font-sans">
                                                            {method}
                                                        </th>
                                                    ))
                                                ) : (<th className="border border-gray-400 p-2 text-xs font-semibold text-slate-600 font-sans"></th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="font-sans">
                                            {/* Empty table body as requested */}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200">
                            <Button
                                onClick={onClose}
                                className="h-8 px-4 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white transition-all duration-200 hover:scale-105 font-sans rounded-lg"
                            >
                                <X className="h-3 w-3" />
                                Close Preview
                            </Button>
                            <Button
                                onClick={onSubmit}
                                className="h-8 px-4 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:scale-105 font-sans rounded-lg"
                            >
                                <Check className="h-3 w-3" />
                                Save Course Layout
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

const ValidationMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center gap-1 mt-1 text-red-600 text-xs font-medium font-sans">
        <Info className="h-3 w-3" />
        <span>{message}</span>
    </div>
);

const AddCourseSettingsPopup: React.FC<AddCourseSettingsPopupProps> = ({ 
    isOpen, 
    courseId, 
    onSuccess, 
    onClose,
    totalCourses = 0
}) => {

    const router = useRouter();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

    const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData>({
        modules: [],
        pedagogy: {
            iDo: [],
            weDo: [],
            youDo: []
        }
    });
    const { data: structures } = useQuery(pedagogyStructureApi.getAll());

    // New state for course names and custom course name
    const [availableCourseNames, setAvailableCourseNames] = useState<string[]>([]);
    const [isCustomCourseName, setIsCustomCourseName] = useState(false);
    const [customCourseName, setCustomCourseName] = useState('');

    const transformStructureToActivities = (dbStructures: any[]): PedagogyActivity[] => {
        if (!dbStructures || dbStructures.length === 0) return [];

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

    const isEditMode = !!courseId;
    const [token, setToken] = useState<string | null>(null);
    const institutionId = typeof window !== 'undefined' ? localStorage.getItem('smartcliff_institution') || '' : '';

    const createMutation = useMutation({
        mutationFn: (courseData: any) => courseStructureApi.create().mutationFn(courseData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courseStructures'] });
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create course');
        }
    });

    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const updateMutation = useMutation({
        mutationFn: ({ courseId, courseData }: { courseId: string, courseData: any }) =>
            courseStructureApi.update(courseId).mutationFn(courseData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courseStructures'] });
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update course');
        }
    });

    const {
        data: services = [],
        isLoading: isLoadingServices,
        isFetching: isFetchingServices,
    } = useServices(institutionId, token || '');

    const { data: courseData } = useQuery({
        queryKey: ["courseStructure", courseId],
        queryFn: () => courseId ? courseStructureApi.getById(courseId).queryFn() : null,
        enabled: !!courseId && !!token,
        staleTime: 5 * 60 * 1000,
    });

    // Add state for existing courses
    const [existingCourses, setExistingCourses] = useState<any[]>([]);

    // Fetch existing courses to determine the next number
    const { data: allCourses } = useQuery({
        queryKey: ["allCourseStructures"],
        queryFn: () => courseStructureApi.getAll().queryFn(),
        enabled: isOpen && !isEditMode, // Only fetch when popup is open and not in edit mode
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (allCourses?.data) {
            setExistingCourses(allCourses.data);
        }
    }, [allCourses]);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('smartcliff_token')
        setToken(storedToken)
    }, [])

    const [clientList, setClientList] = useState<Client[]>([])
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        client: '',
        categoryName: '',
        level: '',
        duration: '',
        selectedCourseName: '',
        title: '',
        courseid: '',
        modal: '',
        courseDescription: '',
        instructor: '',
        iDo: [],
        weDo: [],
        youDo: [],
        image: null,
        checkboxOptions: {
            module: false,
            submodule: false,
            topic: false,
            subtopic: false
        },
        contentOptions: {
            ppt: false,
            pdf: false,
            video: false
        },
        modules: [{
            name: '',
            contentOptions: { ppt: false, pdf: false, video: false },
            submodules: [{
                name: '',
                contentOptions: { ppt: false, pdf: false, video: false },
                topics: [{
                    name: '',
                    contentOptions: { ppt: false, pdf: false, video: false },
                    subtopics: ['']
                }]
            }]
        }]
    });

    const steps = [
        { number: 1, title: 'Course Basic Configuration', description: 'Basic configuration' },
        { number: 2, title: 'Course Hierarchy and Layout', description: 'Structure your course' },
    ];

    useEffect(() => {
        if (courseData?.data && courseId && clientList.length > 0 && services.length > 0 && categoriesData?.allCategories) {
            const data = courseData.data;

            const matchedClient = clientList.find(client =>
                client.clientCompany === data.clientName
            );
            const matchedService = services.find((s: Service) =>
                s.name === data.serviceType
            );
            const matchedModel = matchedService?.serviceModals.find((m: ServiceModal) =>
                m.name === data.serviceModal
            );
            const matchedCategory = categoriesData.allCategories.find((cat: Category) =>
                cat.categoryName === data.category
            );

            setFormData({
                client: matchedClient?._id || '',
                categoryName: matchedCategory?._id || '',
                level: data.courseLevel,
                duration: matchedModel?.id || '',
                selectedCourseName: data.courseName,
                title: data.courseName,
                courseid: data.courseCode,
                modal: matchedService?.id || '',
                courseDescription: data.courseDescription,
                instructor: data.instructor,
                iDo: data.I_Do || [],
                weDo: data.We_Do || [],
                youDo: data.You_Do || [],
                image: data.courseImage || null,
                checkboxOptions: {
                    module: data.courseHierarchy.includes('Module'),
                    submodule: data.courseHierarchy.includes('Sub Module'),
                    topic: data.courseHierarchy.includes('Topic'),
                    subtopic: data.courseHierarchy.includes('Sub Topic')
                },
                contentOptions: {
                    ppt: data.resourcesType.includes('PPT'),
                    pdf: data.resourcesType.includes('PDF'),
                    video: data.resourcesType.includes('Video')
                },
                modules: data.modules || [{
                    name: '',
                    contentOptions: { ppt: false, pdf: false, video: false },
                    submodules: [{
                        name: '',
                        contentOptions: { ppt: false, pdf: false, video: false },
                        topics: [{
                            name: '',
                            contentOptions: { ppt: false, pdf: false, video: false },
                            subtopics: ['']
                        }]
                    }]
                }]
            });

            setSelectedContentTypes({
                ppt: data.resourcesType.includes('PPT'),
                pdf: data.resourcesType.includes('PDF'),
                video: data.resourcesType.includes('Video'),
                folder: data.resourcesType.includes('Folder'),
                url: data.resourcesType.includes('Url'),
                zip: data.resourcesType.includes('Zip'),
            });
        }
    }, [courseData, courseId, clientList, services]);

    const filteredServices = services

    const handleFileSelect = (file: File) => {
        if (!file) return;

        // Updated to allow 3MB images (3 * 1024 * 1024 = 3145728 bytes)
        if (file.size > 3 * 1024 * 1024) {
            showToast.error('Image size should be less than 3MB');
            return;
        }
        
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast.error('Only JPEG, JPG, PNG, and WebP formats are allowed');
            return;
        }

        setFormData({ ...formData, image: file });
    };

    const validateStep1 = (): boolean => {
        const errors: ValidationErrors = {};

        if (!formData.client) {
            errors.client = 'Please select a client';
        }
        if (!formData.modal) {
            errors.modal = 'Please select a service type';
        }
        if (!formData.duration) {
            errors.duration = 'Please select a service model';
        }
        if (!formData.categoryName) {
            errors.categoryName = 'Please select a course category';
        }
        if (!formData.selectedCourseName?.trim()) {
            errors.selectedCourseName = 'Please enter a course name';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errors: ValidationErrors = {};

        if (!formData.level) {
            errors.level = 'Please select a course level';
        }

        // Course description is now optional, so remove validation for it

        // Validate course hierarchy
        const hasHierarchy = Object.values(formData.checkboxOptions).some(value => value);
        if (!hasHierarchy) {
            errors.checkboxOptions = 'Please select at least one course hierarchy option';
        }

        // Validate resource type
        const hasResourceType = Object.values(selectedContentTypes).some(value => value);
        if (!hasResourceType) {
            errors.resourceType = 'Please select at least one resource type';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!validateStep1()) {
               
                return;
            }
        } else if (currentStep === 2) {
            if (!validateStep2()) {
           
                return;
            }
        }

        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
            setValidationErrors({});
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setValidationErrors({});
        }
    };

    const handlePreview = () => {
        if (!validateStep2()) {
            return;
        }

        const previewModules = formData.modules.map(module => ({
            name: module.name || "Unnamed Module",
            topics: module.submodules?.[0]?.topics?.map(topic => ({
                name: topic.name || "Unnamed Topic",
                learningLevel: formData.level || "Basic",
                lectureHours: 3,
                handsOnTraining: 3,
                selfStudy: 0
            })) || []
        }));

        setPreviewData({
            modules: previewModules,
            pedagogy: {
                iDo: formData.iDo,
                weDo: formData.weDo,
                youDo: formData.youDo
            }
        });
        setIsPreviewOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const requiredFields = [
                { field: formData.client, message: "Client is required" },
                { field: formData.categoryName, message: "Category is required" },
                { field: formData.level, message: "Level is required" },
                { field: formData.duration, message: "Duration is required" },
                { field: formData.title, message: "Course title is required" },
                { field: formData.courseid, message: "Course ID is required" },
            ];

            const missingFields = requiredFields.filter(item => !item.field);
            if (missingFields.length > 0) {
                throw new Error(missingFields.map(f => f.message).join("\n"));
            }

            const resourcesType = [];
            if (selectedContentTypes.ppt) resourcesType.push("PPT");
            if (selectedContentTypes.pdf) resourcesType.push("PDF");
            if (selectedContentTypes.video) resourcesType.push("Video");
            if (selectedContentTypes.folder) resourcesType.push("Folder");
            if (selectedContentTypes.url) resourcesType.push("Url");
            if (selectedContentTypes.zip) resourcesType.push("Zip");

            if (resourcesType.length === 0) {
                throw new Error("At least one content type must be selected");
            }

            const courseHierarchy = [];
            if (formData.checkboxOptions.module) courseHierarchy.push("Module");
            if (formData.checkboxOptions.submodule) courseHierarchy.push("Sub Module");
            if (formData.checkboxOptions.topic) courseHierarchy.push("Topic");
            if (formData.checkboxOptions.subtopic) courseHierarchy.push("Sub Topic");

            if (courseHierarchy.length === 0) {
                throw new Error("At least one course hierarchy option must be selected");
            }

            const selectedClient = clientList.find(client => client._id === formData.client);
            if (!selectedClient) {
                throw new Error("Selected client not found in our system");
            }

            const selectedCategory = categoriesData?.allCategories?.find((cat: Category) => cat._id === formData.categoryName);
            if (!selectedCategory) {
                throw new Error("Selected category is invalid or not found");
            }

            const selectedService = services.find((s: Service) => s.id === formData.modal);
            if (!selectedService) {
                throw new Error("Selected service is invalid or not found");
            }

            const selectedServiceModal = selectedService.serviceModals.find((m: ServiceModal) => m.id === formData.duration);
            if (!selectedServiceModal) {
                throw new Error("Selected service duration option is invalid");
            }

            const courseData = {
                clientName: formData.client,
                serviceType: selectedService.name,
                serviceModal: selectedServiceModal.name,
                category: selectedCategory.categoryName,
                courseCode: formData.courseid,
                courseName: formData.title,
                courseDescription: formData.courseDescription, // This can be empty now since it's optional
                courseLevel: formData.level,
                resourcesType: resourcesType,
                courseHierarchy: courseHierarchy,
                I_Do: formData.iDo,
                We_Do: formData.weDo,
                You_Do: formData.youDo,
                courseImage: formData.image,
                institution: localStorage.getItem('smartcliff_institution') || '',
                createdBy: localStorage.getItem('smartcliff_user_email') || ''
            };

            const token = localStorage.getItem('smartcliff_token') || '';
            if (!token) {
                throw new Error("Authentication token is missing. Please login again.");
            }

            let response;
            let courseIdToPass;
            if (isEditMode && courseId) {
                response = await updateMutation.mutateAsync({ courseId, courseData });
                courseIdToPass = courseId;
            } else {
                response = await createMutation.mutateAsync(courseData);
                courseIdToPass = response.data?._id || response.data?.id || response.courseId;
            }

            if (courseIdToPass) {
                setCreatedCourseId(courseIdToPass);
            }

            if (response.message?.[0]?.key === 'success') {
                if (isEditMode) {
                    setFormData({
                        client: '',
                        categoryName: '',
                        level: '',
                        duration: '',
                        selectedCourseName: '',
                        title: '',
                        courseid: '',
                        modal: '',
                        courseDescription: '',
                        instructor: '',
                        iDo: [],
                        weDo: [],
                        youDo: [],
                        image: null,
                        checkboxOptions: {
                            module: false,
                            submodule: false,
                            topic: false,
                            subtopic: false
                        },
                        contentOptions: {
                            ppt: false,
                            pdf: false,
                            video: false
                        },
                        modules: [{
                            name: '',
                            contentOptions: { ppt: false, pdf: false, video: false },
                            submodules: [{
                                name: '',
                                contentOptions: { ppt: false, pdf: false, video: false },
                                topics: [{
                                    name: '',
                                    contentOptions: { ppt: false, pdf: false, video: false },
                                    subtopics: ['']
                                }]
                            }]
                        }]
                    });
                    setSelectedContentTypes({
                        ppt: false,
                        pdf: false,
                        video: false,
                        folder: false,
                        url: false,
                        zip: false
                    });
                }

                setCurrentStep(1);
                setSelectedContentTypes({
                    ppt: false,
                    pdf: false,
                    video: false,
                    folder: false,
                    url: false,
                    zip: false
                });
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
                setCurrentStep(1);

                showToast.success(isEditMode ? 'Course updated successfully!' : 'Course created successfully!');
                setIsPreviewOpen(false);
                setIsConfirmationOpen(true);

            } else {
                let errorMessages = [];

                if (Array.isArray(response.message)) {
                    errorMessages = response.message.map((msg: { value: any; }) => msg.value);
                } else if (response.message?.value) {
                    errorMessages = [response.message.value];
                } else if (typeof response.error === 'string') {
                    errorMessages = [response.error];
                } else {
                    errorMessages = ['Failed to process course due to server error'];
                }

                errorMessages.forEach((msg: string) => {
                    if (msg) {
                        showToast.error(msg);
                    }
                });
            }
        } catch (error: unknown) {
            console.error('Error submitting form:', error);
            let errorMessages = ['Failed to process course'];

            if (axios.isAxiosError(error)) {
                if (error.response?.data) {
                    if (Array.isArray(error.response.data.message)) {
                        errorMessages = error.response.data.message.map((msg: { value: any; }) => msg.value);
                    } else if (error.response.data.message?.value) {
                        errorMessages = [error.response.data.message.value];
                    } else if (error.response.data.error) {
                        errorMessages = [error.response.data.error];
                    }
                } else {
                    errorMessages = [`Server responded with status ${error?.response?.status}`];
                }
            } else if (error instanceof Error) {
                errorMessages = [error.message];
            } else if (typeof error === 'string') {
                errorMessages = [error];
            }

            errorMessages.forEach(msg => {
                showToast.error(msg);
            });
        }
    };

    useEffect(() => {
        if (token) {
            loadClients()
        }

        return () => {
            cleanup()
        }
    }, [token])

    const loadClients = async () => {
        if (!token) {
            console.error("Authentication token is missing");
            return;
        }
        try {
            const response = await fetchClients(token)
            if (response && response.clients) {
                let filteredClients = response.clients.map((client: any) => ({
                    ...client
                }))
                setClientList(filteredClients)
            }
        } catch (error) {
            console.error("Failed to load clients:", error)
        }
    }

    const selectedService = filteredServices.find(
        (service: Service) => service.id === formData.modal
    );
    const filteredServiceModels =
        selectedService && Array.isArray(selectedService.serviceModals)
            ? selectedService.serviceModals
            : [];

  const generateCourseId = () => {
    if (!formData.client || !formData.modal || !formData.duration) return '';

    const client = clientList.find(c => c._id === formData.client);
    const clientName = client?.clientCompany || 'Client';

    const service = services.find((s: Service) => s.id === formData.modal);
    const serviceType = service?.name || 'Service';

    const serviceModel = service?.serviceModals?.find((m: ServiceModal) => m.id === formData.duration)?.name || 'Model';

    const clientAbbr = clientName
        .split(' ')
        .map(word => word[0]?.toUpperCase() || '')
        .join('');

    const serviceTypeAbbr = serviceType
        .split(' ')
        .map((word: string) => word[0]?.toUpperCase() || '')
        .join('');

    const serviceModelAbbr = serviceModel
        .split(' ')
        .map((word: string) => word[0]?.toUpperCase() || '')
        .join('');

    // Use totalCourses prop to generate the next number
    const nextNumber = totalCourses + 1;
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    const courseId = `${clientAbbr}-${serviceTypeAbbr}-${serviceModelAbbr}-${formattedNumber}`;
    
    console.log('=== COURSE ID GENERATION ===');
    console.log('Total courses from prop:', totalCourses);
    console.log('Client:', clientName, 'Abbr:', clientAbbr);
    console.log('Service:', serviceType, 'Abbr:', serviceTypeAbbr);
    console.log('Model:', serviceModel, 'Abbr:', serviceModelAbbr);
    console.log('Next number:', nextNumber);
    console.log('Generated ID:', courseId);
    console.log('============================');
    
    return courseId;
};

    useEffect(() => {
        if (formData.client && formData.modal && formData.duration) {
            const newCourseId = generateCourseId();
            setFormData(prev => ({ ...prev, courseid: newCourseId }));
        }
    }, [formData.client, formData.modal, formData.duration, clientList, services, totalCourses]);

    const {
        data: categoriesData,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: [
            "categories",
        ],
        queryFn: async () => {
            const { categories } = await fetchCategories();

            const filteredCategories = categories.filter((category: Category) => {
                // Your filtering logic here
                return true;
            });

            const sortedCategories = [...filteredCategories].sort((a, b) =>
                a.categoryName.localeCompare(b.categoryName)
            );

            return {
                categories: sortedCategories,
                allCategories: categories,
            };
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    // Update course names when category changes
    useEffect(() => {
        if (formData.categoryName && categoriesData?.allCategories) {
            const selectedCategory = categoriesData.allCategories.find(
                (cat: Category) => cat._id === formData.categoryName
            );
            
            if (selectedCategory) {
                setAvailableCourseNames(selectedCategory.courseNames || []);
                // Reset course name when category changes
                setFormData(prev => ({ 
                    ...prev, 
                    selectedCourseName: '',
                    title: ''
                }));
                setIsCustomCourseName(false);
                setCustomCourseName('');
            }
        } else {
            setAvailableCourseNames([]);
        }
    }, [formData.categoryName, categoriesData?.allCategories]);

    const [selectedContentTypes, setSelectedContentTypes] = useState({
        ppt: false,
        pdf: false,
        video: false,
        folder: false,
        url: false,
        zip: false
    });

    const popupVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            transition: { duration: 0.1 }
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: { duration: 0.1 }
        }
    } as const

    useEffect(() => {
        const token = localStorage.getItem('smartcliff_token') || '';

        if (isOpen) {
            if (!isEditMode) {
                setFormData({
                    client: '',
                    categoryName: '',
                    level: '',
                    duration: '',
                    selectedCourseName: '',
                    title: '',
                    courseid: '',
                    modal: '',
                    courseDescription: '',
                    instructor: '',
                    iDo: [],
                    weDo: [],
                    youDo: [],
                    image: null,
                    checkboxOptions: {
                        module: false,
                        submodule: false,
                        topic: false,
                        subtopic: false
                    },
                    contentOptions: {
                        ppt: false,
                        pdf: false,
                        video: false
                    },
                    modules: [{
                        name: '',
                        contentOptions: { ppt: false, pdf: false, video: false },
                        submodules: [{
                            name: '',
                            contentOptions: { ppt: false, pdf: false, video: false },
                            topics: [{
                                name: '',
                                contentOptions: { ppt: false, pdf: false, video: false },
                                subtopics: ['']
                            }]
                        }]
                    }]
                });
                setSelectedContentTypes({
                    ppt: false,
                    pdf: false,
                    video: false,
                    folder: false,
                    url: false,
                    zip: false
                });
                setCurrentStep(1);
            } else if (courseId) {
                const fetchCourseData = async () => {
                    try {
                        const response = await courseStructureApi.getById(courseId).queryFn()
                        const data = response.data;

                        const matchedClient = clientList.find(client =>
                            client.clientCompany === data.clientName
                        );

                        const matchedService = services.find((s: Service) =>
                            s.name === data.serviceType
                        );
                        const matchedModel = matchedService?.serviceModals.find((m: ServiceModal) =>
                            m.name === data.serviceModal
                        );

                        const matchedCategory = categoriesData?.allCategories.find((cat: Category) =>
                            cat.categoryName === data.category
                        );

                        setFormData({
                            client: matchedClient?._id || '',
                            categoryName: matchedCategory?._id || '',
                            level: data.courseLevel,
                            duration: matchedModel?.id || '',
                            selectedCourseName: data.courseName,
                            title: data.courseName,
                            courseid: data.courseCode,
                            modal: matchedService?.id || '',
                            courseDescription: data.courseDescription,
                            instructor: data.instructor,
                            iDo: data.I_Do || [],
                            weDo: data.We_Do || [],
                            youDo: data.You_Do || [],
                            image: data.courseImage || null,
                            checkboxOptions: {
                                module: data.courseHierarchy.includes('Module'),
                                submodule: data.courseHierarchy.includes('Sub Module'),
                                topic: data.courseHierarchy.includes('Topic'),
                                subtopic: data.courseHierarchy.includes('Sub Topic')
                            },
                            contentOptions: {
                                ppt: data.resourcesType.includes('PPT'),
                                pdf: data.resourcesType.includes('PDF'),
                                video: data.resourcesType.includes('Video')
                            },
                            modules: data.modules || [{
                                name: '',
                                contentOptions: { ppt: false, pdf: false, video: false },
                                submodules: [{
                                    name: '',
                                    contentOptions: { ppt: false, pdf: false, video: false },
                                    topics: [{
                                        name: '',
                                        contentOptions: { ppt: false, pdf: false, video: false },
                                        subtopics: ['']
                                    }]
                                }]
                            }]
                        });

                        setSelectedContentTypes({
                            ppt: data.resourcesType.includes('PPT'),
                            pdf: data.resourcesType.includes('PDF'),
                            video: data.resourcesType.includes('Video'),
                            folder: data.resourcesType.includes('Folder'),
                            url: data.resourcesType.includes('Url'),
                            zip: data.resourcesType.includes('Zip'),
                        });
                    } catch (error) {
                        console.error('Error fetching course data:', error);
                        showToast.error('Failed to load course data');
                    }
                };

                fetchCourseData();
            }
        }
    }, [isOpen, isEditMode, courseId, clientList, services, categoriesData?.allCategories]);

    return (
        <AnimatePresence>
            <Dialog open={isOpen} onOpenChange={(open) => {
                // Only allow closing via the close button, not by clicking outside
                if (!open) {
                    // Check if this is coming from the close button click
                    const isCloseButtonClick = (event as any)?.type === 'click';
                    if (!isCloseButtonClick) {
                        return; // Prevent closing when clicking outside
                    }
                }
                onClose();
            }}>
                <DialogContent className="w-[98%] max-w-7xl h-[95vh] rounded-xl bg-white p-0 overflow-hidden flex flex-col font-sans" showCloseButton={false}>
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={popupVariants}
                        className="flex flex-col h-full font-sans"
                    >
                        {/* Header Section - Fixed */}
                        <DialogHeader className="flex-shrink-0 border-b border-slate-200 bg-white">
                            <div className="p-4 space-y-3 font-sans">
                                {/* Title and Help Button Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {isEditMode ? (
                                            <Pencil className="h-5 w-5 text-blue-600" />
                                        ) : (
                                            <BookOpen className="h-5 w-5 text-green-600" />
                                        )}
                                        <DialogTitle className="text-xl font-bold text-slate-900 font-sans">
                                            {isEditMode ? 'Edit Course Structure' : 'Create New Course Setup'}
                                        </DialogTitle>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-3 text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold font-sans rounded-lg"
                                            onClick={() => setIsHelpOpen(true)}
                                        >
                                            <CircleHelp className="h-4 w-4 text-blue-600" />
                                            Help Center
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onClose}
                                            className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full font-sans"
                                        >
                                            <X className="h-4 w-4 text-slate-600" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Stepper - Updated with increased height and removed scrollbar */}
                                <div className="overflow-x-auto">
                                    <div className="flex items-center min-w-max gap-2 py-1 font-sans">
                                        {steps.map((step, index) => (
                                            <React.Fragment key={step.number}>
                                                <div className="flex items-center gap-2 px-2">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all font-sans ${
                                                            currentStep === step.number
                                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-110'
                                                                : currentStep > step.number
                                                                ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md'
                                                                : 'bg-white text-slate-600 border-2 border-slate-300'
                                                        }`}
                                                    >
                                                        {currentStep > step.number ? (
                                                            <Check className="h-5 w-5" />
                                                        ) : (
                                                            <span>{step.number}</span>
                                                        )}
                                                    </div>

                                                    <div className="hidden md:block">
                                                        <div
                                                            className={`text-sm font-bold whitespace-nowrap font-sans ${
                                                                currentStep >= step.number ? 'text-slate-900' : 'text-slate-500'
                                                            }`}
                                                        >
                                                            {step.title}
                                                        </div>
                                                    </div>
                                                </div>

                                                {index < steps.length - 1 && (
                                                    <div className="relative w-12 lg:w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                                                                currentStep > step.number
                                                                    ? 'w-full bg-gradient-to-r from-emerald-500 to-green-500'
                                                                    : 'w-0 bg-slate-300'
                                                            }`}
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Content Section - Scrollable - FIXED STRUCTURE */}
                        <div className="flex-1 min-h-0 overflow-hidden bg-white">
                            <div className="h-full overflow-y-auto p-6 font-sans">
                                {currentStep === 1 && (
                                    <div className="w-full space-y-5 font-sans">
                                        {/* First Row */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            {/* Course Client */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <Building className="h-4 w-4 text-blue-500" />
                                                        Course Client <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Select the client for this course" />
                                                </div>
                                                <Select
                                                    value={formData.client}
                                                    onValueChange={(value) => {
                                                        setFormData({ ...formData, client: value });
                                                        if (validationErrors.client) {
                                                            setValidationErrors(prev => ({ ...prev, client: undefined }));
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.client ? 'border-red-500' : 'border-slate-300'}`}>
                                                        <SelectValue placeholder="Select client" className="text-slate-800 font-medium" />
                                                    </SelectTrigger>
                                                    <SelectContent className="font-sans bg-white border-slate-300 rounded-lg">
                                                        {clientList.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-slate-500 font-medium font-sans">No clients available</div>
                                                        ) : (
                                                            clientList.map((client) => (
                                                                <SelectItem 
                                                                    key={client._id} 
                                                                    value={client._id} 
                                                                    className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md"
                                                                >
                                                                    {client.clientCompany}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {validationErrors.client && <ValidationMessage message={validationErrors.client} />}
                                            </div>

                                            {/* Service Type */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <Layers className="h-4 w-4 text-indigo-500" />
                                                        Service Type <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Select the type of service" />
                                                </div>
                                                <Select value={formData.modal} onValueChange={(value) => {
                                                    setFormData({ ...formData, modal: value });
                                                    if (validationErrors.modal) {
                                                        setValidationErrors(prev => ({ ...prev, modal: undefined }));
                                                    }
                                                }}>
                                                    <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.modal ? 'border-red-500' : 'border-slate-300'}`}>
                                                        <SelectValue placeholder="Select service type" className="text-slate-800 font-medium" />
                                                    </SelectTrigger>
                                                    <SelectContent className="font-sans bg-white border-slate-300 rounded-lg">
                                                        {filteredServices.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-slate-500 font-medium font-sans">No services available</div>
                                                        ) : (
                                                            filteredServices.map((service) => (
                                                                <SelectItem 
                                                                    key={service.id} 
                                                                    value={service.id} 
                                                                    className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md"
                                                                >
                                                                    {service.name}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {validationErrors.modal && <ValidationMessage message={validationErrors.modal} />}
                                            </div>

                                            {/* Service Model */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <Box className="h-4 w-4 text-violet-500" />
                                                        Service Model <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Select service delivery model" />
                                                </div>
                                                <Select value={formData.duration} onValueChange={(value) => {
                                                    setFormData({ ...formData, duration: value });
                                                    if (validationErrors.duration) {
                                                        setValidationErrors(prev => ({ ...prev, duration: undefined }));
                                                    }
                                                }}>
                                                    <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.duration ? 'border-red-500' : 'border-slate-300'}`}>
                                                        <SelectValue placeholder="Select service model" className="text-slate-800 font-medium" />
                                                    </SelectTrigger>
                                                    <SelectContent className="font-sans bg-white border-slate-300 rounded-lg">
                                                        {filteredServiceModels.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-slate-500 font-medium font-sans">No service models available</div>
                                                        ) : (
                                                            filteredServiceModels.map((modal) => (
                                                                modal?.id != null && (
                                                                    <SelectItem 
                                                                        key={modal.id} 
                                                                        value={String(modal.id)} 
                                                                        className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md"
                                                                    >
                                                                        {modal.name}
                                                                    </SelectItem>
                                                                )
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {validationErrors.duration && <ValidationMessage message={validationErrors.duration} />}
                                            </div>
                                        </div>

                                        {/* Second Row */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            {/* Course Category */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <ListTree className="h-4 w-4 text-green-500" />
                                                        Course Category <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Select the category" />
                                                </div>
                                                <Select value={formData.categoryName} onValueChange={(value) => {
                                                    setFormData({ ...formData, categoryName: value });
                                                    if (validationErrors.categoryName) {
                                                        setValidationErrors(prev => ({ ...prev, categoryName: undefined }));
                                                    }
                                                }}>
                                                    <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.categoryName ? 'border-red-500' : 'border-slate-300'}`}>
                                                        <SelectValue placeholder="Select category" className="text-slate-800 font-medium" />
                                                    </SelectTrigger>
                                                    <SelectContent className="font-sans bg-white border-slate-300 rounded-lg">
                                                        {categoriesData?.allCategories?.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-slate-500 font-medium font-sans">No categories available</div>
                                                        ) : (
                                                            categoriesData?.allCategories?.map((cat) => (
                                                                <SelectItem 
                                                                    key={cat?._id} 
                                                                    value={cat?._id} 
                                                                    className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md"
                                                                >
                                                                    {cat.categoryName}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {validationErrors.categoryName && <ValidationMessage message={validationErrors.categoryName} />}
                                            </div>

                                            {/* Course Name - UPDATED WITH DROPDOWN AND CUSTOM OPTION */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <BookOpen className="h-4 w-4 text-blue-500" />
                                                        Course Name <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Select from available courses or choose 'Others' to enter custom name" />
                                                </div>
                                                
                                                {!isCustomCourseName ? (
                                                    <Select
                                                        value={formData.selectedCourseName}
                                                        onValueChange={(value) => {
                                                            if (value === "others") {
                                                                setIsCustomCourseName(true);
                                                                setFormData({
                                                                    ...formData,
                                                                    selectedCourseName: '',
                                                                    title: ''
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    selectedCourseName: value,
                                                                    title: value
                                                                });
                                                            }
                                                            if (validationErrors.selectedCourseName) {
                                                                setValidationErrors(prev => ({ ...prev, selectedCourseName: undefined }));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.selectedCourseName ? 'border-red-500' : 'border-slate-300'}`}>
                                                            <SelectValue 
                                                                placeholder={
                                                                    availableCourseNames.length === 0 
                                                                        ? "Select category first" 
                                                                        : "Select course name"
                                                                } 
                                                                className="text-slate-800 font-medium"
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent className="font-sans bg-white border-slate-300 rounded-lg">
                                                            {availableCourseNames.length === 0 ? (
                                                                <div className="px-3 py-2 text-sm text-slate-500 font-medium font-sans">
                                                                    Select a category to see available courses
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {availableCourseNames.map((courseName) => (
                                                                        <SelectItem 
                                                                            key={courseName} 
                                                                            value={courseName} 
                                                                            className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md"
                                                                        >
                                                                            {courseName}
                                                                        </SelectItem>
                                                                    ))}
                                                                    <div className="border-t border-slate-200 my-1"></div>
                                                                    <SelectItem 
                                                                        value="others" 
                                                                        className="font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 font-sans rounded-md"
                                                                    >
                                                                        Others (Custom Name)
                                                                    </SelectItem>
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <Input
                                                            type="text"
                                                            placeholder="Enter custom course name"
                                                            value={customCourseName}
                                                            onChange={(e) => {
                                                                setCustomCourseName(e.target.value);
                                                                setFormData({
                                                                    ...formData,
                                                                    selectedCourseName: e.target.value,
                                                                    title: e.target.value
                                                                });
                                                                if (validationErrors.selectedCourseName) {
                                                                    setValidationErrors(prev => ({ ...prev, selectedCourseName: undefined }));
                                                                }
                                                            }}
                                                            className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.selectedCourseName ? 'border-red-500' : 'border-slate-300'}`}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setIsCustomCourseName(false);
                                                                setCustomCourseName('');
                                                                setFormData({
                                                                    ...formData,
                                                                    selectedCourseName: '',
                                                                    title: ''
                                                                });
                                                            }}
                                                            className="h-7 px-3 text-xs gap-1 text-slate-600 border-slate-300 hover:bg-slate-50 font-sans rounded-lg"
                                                        >
                                                            <ChevronLeft className="h-3 w-3" />
                                                            Back to course list
                                                        </Button>
                                                    </div>
                                                )}
                                                {validationErrors.selectedCourseName && <ValidationMessage message={validationErrors.selectedCourseName} />}
                                            </div>

                                            {/* Course ID */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <Hash className="h-4 w-4 text-slate-500" />
                                                        Course ID <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Auto-generated ID" />
                                                </div>
                                                <Input
                                                    type="text"
                                                    placeholder="e.g., CL001"
                                                    value={formData.courseid}
                                                    readOnly
                                                    className="w-full h-9 px-3 text-sm font-medium bg-slate-100 text-slate-800 cursor-not-allowed font-sans border-slate-300 rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* Date Time Section */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <Clock className="h-4 w-4 text-green-500" />
                                                        Current Date & Time
                                                    </Label>
                                                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2">
                                                        <Calendar className="h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={currentTime.toLocaleString()}
                                                            className="flex-1 text-sm font-medium text-slate-800 bg-transparent outline-none font-sans"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info Alert */}
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg flex items-start gap-2">
                                            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div className="font-sans">
                                                <h4 className="text-sm font-bold text-blue-900 font-sans">Course Setup</h4>
                                                <p className="text-xs font-medium text-blue-700 mt-0.5 font-sans">
                                                    Fill all required fields marked with <span className="text-red-500 font-semibold">*</span> to continue
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="w-full space-y-5 pb-6 font-sans">
                                        {/* Level, Image, Preview Row */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                            <div className="lg:col-span-4 space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                        <BarChart2 className="h-4 w-4 text-orange-500" />
                                                        Course Level <span className="text-red-500">*</span>
                                                    </Label>
                                                    <InfoTooltip content="Select difficulty level" />
                                                </div>
                                                <Select value={formData.level} onValueChange={(value) => {
                                                    setFormData({ ...formData, level: value });
                                                    if (validationErrors.level) {
                                                        setValidationErrors(prev => ({ ...prev, level: undefined }));
                                                    }
                                                }}>
                                                    <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white text-slate-800 rounded-lg ${validationErrors.level ? 'border-red-500' : 'border-slate-300'}`}>
                                                        <SelectValue placeholder="Select Level" className="text-slate-800 font-medium" />
                                                    </SelectTrigger>
                                                    <SelectContent className="font-sans bg-white border-slate-300 rounded-lg">
                                                        <SelectItem value="Beginner" className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md">Beginner</SelectItem>
                                                        <SelectItem value="Intermediate" className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md">Intermediate</SelectItem>
                                                        <SelectItem value="Advanced" className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md">Advanced</SelectItem>
                                                        <SelectItem value="Expert" className="font-medium text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-800 rounded-md">Expert</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {validationErrors.level && <ValidationMessage message={validationErrors.level} />}
                                            </div>

                                            <div className="lg:col-span-5 space-y-1.5">
                                                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                    <Image className="h-4 w-4 text-pink-500" /> Course Image
                                                </Label>
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="h-9 w-full border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer bg-white hover:bg-white hover:border-slate-400 transition-all font-sans"
                                                >
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                const file = e.target.files[0];
                                                                handleFileSelect(file);
                                                            }
                                                        }}
                                                    />
                                                    <Upload className="w-4 h-4 text-slate-600 mr-2" />
                                                    <span className="text-sm font-medium text-slate-600 font-sans">Choose Image</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 font-sans">JPEG, JPG, PNG, WebP • Max 3MB</p>
                                            </div>

                                            <div className="lg:col-span-3 flex items-center justify-center">
                                                {formData.image ? (
                                                    <div className="relative">
                                                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-300 shadow-sm">
                                                            <img
                                                                src={typeof formData.image === 'string' ? formData.image : URL.createObjectURL(formData.image)}
                                                                alt="Preview"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, image: null })}
                                                            className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white">
                                                        <Image className="h-6 w-6 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1 font-sans">
                                                <FileText className="h-4 w-4 text-slate-500" /> Description
                                                <span className="text-slate-400 text-xs font-normal font-sans">(Optional)</span>
                                            </Label>
                                            <div className="border border-slate-300 rounded-lg overflow-hidden font-sans">
                                                <MDEditor
                                                    value={formData.courseDescription}
                                                    onChange={(value) => setFormData({ ...formData, courseDescription: value || '' })}
                                                    preview="edit"
                                                    height={150}
                                                    visibleDragbar={false}
                                                    placeholder="Type your course description..."
                                                />
                                            </div>
                                            <p className="text-xs font-medium text-slate-500 font-sans">Use markdown for formatting</p>
                                        </div>

                                        {/* Course Hierarchy - Updated with inline note */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
                                                    <Folder className="h-4 w-4 text-blue-500" />
                                                    Course Hierarchy <span className="text-red-500">*</span>
                                                </h3>
                                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                                    <Info className="h-3.5 w-3.5 text-blue-600" />
                                                    <p className="text-xs font-medium text-blue-700 font-sans">
                                                        <span className="font-semibold">Note:</span> Organize hierarchically - Modules → Submodules → Topics → Subtopics
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'module', label: 'Module', icon: Folder, disabled: false, description: 'Main course sections' },
                                                    { id: 'submodule', label: 'Submodule', icon: FolderOpen, disabled: !formData.checkboxOptions.module, description: 'Sections within modules' },
                                                    { id: 'topic', label: 'Topic', icon: File, disabled: !formData.checkboxOptions.module, description: 'Individual topics within submodules' },
                                                    { id: 'subtopic', label: 'Subtopic', icon: FileStack, disabled: !formData.checkboxOptions.topic, description: 'Detailed breakdown of topics' }
                                                ].map(({ id, label, icon: Icon, disabled, description }) => (
                                                    <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-sans ${disabled ? 'bg-white border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300'} transition-all duration-200 hover:shadow-sm`}>
                                                        <input
                                                            type="checkbox"
                                                            id={`${id}-checkbox`}
                                                            checked={formData.checkboxOptions[id]}
                                                            onChange={(e) => {
                                                                const newValue = e.target.checked;
                                                                setFormData({
                                                                    ...formData,
                                                                    checkboxOptions: {
                                                                        ...formData.checkboxOptions,
                                                                        [id]: newValue,
                                                                        ...(id === 'module' && !newValue ? { 
                                                                            submodule: false, 
                                                                            topic: false,
                                                                            subtopic: false 
                                                                        } : {}),
                                                                        ...(id === 'topic' && !newValue ? { subtopic: false } : {})
                                                                    }
                                                                });
                                                                if (validationErrors.checkboxOptions) {
                                                                    setValidationErrors(prev => ({ ...prev, checkboxOptions: undefined }));
                                                                }
                                                            }}
                                                            disabled={disabled}
                                                            className={`h-4 w-4 rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} transition-all`}
                                                        />
                                                        <label 
                                                            htmlFor={`${id}-checkbox`} 
                                                            className={`text-sm font-medium ${disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'} flex items-center gap-2 font-sans`}
                                                        >
                                                            {label}
                                                            <Icon className={`h-4 w-4 ${disabled ? 'text-slate-400' : 'text-yellow-500'}`} />
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            {validationErrors.checkboxOptions && <ValidationMessage message={validationErrors.checkboxOptions} />}
                                        </div>

                                        {/* Pedagogy - Compact with inline note */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
                                                    <GraduationCap className="h-5 w-5 text-blue-600" />
                                                    Pedagogy
                                                </h3>
                                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                                    <Info className="h-3.5 w-3.5 text-green-600" />
                                                    <p className="text-xs font-medium text-green-700 font-sans">
                                                        <span className="font-semibold">Note:</span> Use "I Do, We Do, You Do" framework for teaching methods
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                                {/* I Do */}
                                                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-4 w-4 text-blue-500" />
                                                        <Label className="text-sm font-semibold text-slate-700 font-sans">I Do</Label>
                                                        <InfoTooltip content="Instructor demonstrates concepts and skills" />
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500 font-sans">Teacher demonstrates concepts and skills</p>
                                                    <Select>
                                                        <SelectTrigger className="w-full h-8 px-2 text-xs font-medium bg-white text-slate-800 transition-all hover:bg-slate-100 font-sans border-slate-300 rounded-lg">
                                                            <SelectValue placeholder={formData.iDo.length > 0 ? `${formData.iDo.length} selected` : "Select"} className="text-slate-800 font-medium" />
                                                        </SelectTrigger>
                                                        <SelectContent className="text-sm max-h-60 font-sans bg-white border-slate-300 rounded-lg">
                                                            {isLoading ? (
                                                                <div className="px-2 py-1 text-xs font-medium font-sans text-slate-500">Loading...</div>
                                                            ) : error ? (
                                                                <div className="px-2 py-1 text-xs font-medium text-red-600 font-sans">Error</div>
                                                            ) : (
                                                                transformStructureToActivities(structures ?? [])[0]?.elements.map((element) => (
                                                                    <div key={element.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 transition-colors font-sans rounded-md">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={element.id}
                                                                            checked={formData.iDo.includes(element.name)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setFormData({ ...formData, iDo: [...formData.iDo, element.name] });
                                                                                } else {
                                                                                    setFormData({ ...formData, iDo: formData.iDo.filter(item => item !== element.name) });
                                                                                }
                                                                            }}
                                                                            className="h-3.5 w-3.5 rounded-lg transition-all"
                                                                        />
                                                                        <label htmlFor={element.id} className="text-xs font-medium cursor-pointer flex-1 font-sans text-slate-800">{element.name}</label>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {formData.iDo.length > 0 && (
                                                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                            {formData.iDo.map((item, index) => (
                                                                <div key={item} className="px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-center justify-between transition-all hover:bg-blue-100 font-sans">
                                                                    <span className="font-medium font-sans">{index + 1}. {item}</span>
                                                                    <button onClick={() => setFormData({ ...formData, iDo: formData.iDo.filter(i => i !== item) })} className="hover:bg-red-100 rounded-lg p-0.5 transition-colors">
                                                                        <X className="h-3 w-3 text-red-600" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* We Do */}
                                                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-4 w-4 text-green-500" />
                                                        <Label className="text-sm font-semibold text-slate-700 font-sans">We Do</Label>
                                                        <InfoTooltip content="Guided practice with instructor support" />
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500 font-sans">Guided practice with instructor support</p>
                                                    <Select>
                                                        <SelectTrigger className="w-full h-8 px-2 text-xs font-medium bg-white text-slate-800 transition-all hover:bg-slate-100 font-sans border-slate-300 rounded-lg">
                                                            <SelectValue placeholder={formData.weDo.length > 0 ? `${formData.weDo.length} selected` : "Select"} className="text-slate-800 font-medium" />
                                                        </SelectTrigger>
                                                        <SelectContent className="text-sm max-h-60 font-sans bg-white border-slate-300 rounded-lg">
                                                            {isLoading ? (
                                                                <div className="px-2 py-1 text-xs font-medium font-sans text-slate-500">Loading...</div>
                                                            ) : error ? (
                                                                <div className="px-2 py-1 text-xs font-medium text-red-600 font-sans">Error</div>
                                                            ) : (
                                                                transformStructureToActivities(structures ?? [])[1]?.elements.map((element) => (
                                                                    <div key={element.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 transition-colors font-sans rounded-md">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={element.id}
                                                                            checked={formData.weDo.includes(element.name)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setFormData({ ...formData, weDo: [...formData.weDo, element.name] });
                                                                                } else {
                                                                                    setFormData({ ...formData, weDo: formData.weDo.filter(item => item !== element.name) });
                                                                                }
                                                                            }}
                                                                            className="h-3.5 w-3.5 rounded-lg transition-all"
                                                                        />
                                                                        <label htmlFor={element.id} className="text-xs font-medium cursor-pointer flex-1 font-sans text-slate-800">{element.name}</label>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {formData.weDo.length > 0 && (
                                                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                            {formData.weDo.map((item, index) => (
                                                                <div key={item} className="px-2 py-1.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center justify-between transition-all hover:bg-green-100 font-sans">
                                                                    <span className="font-medium font-sans">{index + 1}. {item}</span>
                                                                    <button onClick={() => setFormData({ ...formData, weDo: formData.weDo.filter(i => i !== item) })} className="hover:bg-red-100 rounded-lg p-0.5 transition-colors">
                                                                        <X className="h-3 w-3 text-red-600" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* You Do */}
                                                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <UserCheck className="h-4 w-4 text-purple-500" />
                                                        <Label className="text-sm font-semibold text-slate-700 font-sans">You Do</Label>
                                                        <InfoTooltip content="Independent practice and application" />
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500 font-sans">Independent practice and application</p>
                                                    <Select>
                                                        <SelectTrigger className="w-full h-8 px-2 text-xs font-medium bg-white text-slate-800 transition-all hover:bg-slate-100 font-sans border-slate-300 rounded-lg">
                                                            <SelectValue placeholder={formData.youDo.length > 0 ? `${formData.youDo.length} selected` : "Select"} className="text-slate-800 font-medium" />
                                                        </SelectTrigger>
                                                        <SelectContent className="text-sm max-h-60 font-sans bg-white border-slate-300 rounded-lg">
                                                            {isLoading ? (
                                                                <div className="px-2 py-1 text-xs font-medium font-sans text-slate-500">Loading...</div>
                                                            ) : error ? (
                                                                <div className="px-2 py-1 text-xs font-medium text-red-600 font-sans">Error</div>
                                                            ) : (
                                                                transformStructureToActivities(structures ?? [])[2]?.elements.map((element) => (
                                                                    <div key={element.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 transition-colors font-sans rounded-md">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={element.id}
                                                                            checked={formData.youDo.includes(element.name)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setFormData({ ...formData, youDo: [...formData.youDo, element.name] });
                                                                                } else {
                                                                                    setFormData({ ...formData, youDo: formData.youDo.filter(item => item !== element.name) });
                                                                                }
                                                                            }}
                                                                            className="h-3.5 w-3.5 rounded-lg transition-all"
                                                                        />
                                                                        <label htmlFor={element.id} className="text-xs font-medium cursor-pointer flex-1 font-sans text-slate-800">{element.name}</label>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {formData.youDo.length > 0 && (
                                                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                            {formData.youDo.map((item, index) => (
                                                                <div key={item} className="px-2 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs rounded-lg flex items-center justify-between transition-all hover:bg-purple-100 font-sans">
                                                                    <span className="font-medium font-sans">{index + 1}. {item}</span>
                                                                    <button onClick={() => setFormData({ ...formData, youDo: formData.youDo.filter(i => i !== item) })} className="hover:bg-red-100 rounded-lg p-0.5 transition-colors">
                                                                        <X className="h-3 w-3 text-red-600" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resource Type with inline note */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
                                                    <FileText className="h-4 w-4 text-purple-500" />
                                                    Resource Type <span className="text-red-500">*</span>
                                                </h3>
                                                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                                                    <Info className="h-3.5 w-3.5 text-purple-600" />
                                                    <p className="text-xs font-medium text-purple-700 font-sans">
                                                        <span className="font-semibold">Note:</span> Select learning resources for course content
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'video', label: 'Video', icon: Film, color: 'purple', description: 'Video lectures and tutorials' },
                                                    { id: 'ppt', label: 'PPT', icon: FileInput, color: 'red', description: 'Presentation slides' },
                                                    { id: 'pdf', label: 'PDF', icon: FileText, color: 'blue', description: 'Documents and readings' },
                                                    { id: 'url', label: 'URL', icon: Link, color: 'teal', description: 'External links and resources' }
                                                ].map(({ id, label, icon: Icon, color, description }) => (
                                                    <div key={id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-sm group font-sans">
                                                        <input
                                                            type="checkbox"
                                                            id={`content-${id}`}
                                                            checked={selectedContentTypes[id]}
                                                            onChange={(e) => {
                                                                setSelectedContentTypes({ ...selectedContentTypes, [id]: e.target.checked });
                                                                if (validationErrors.resourceType) {
                                                                    setValidationErrors(prev => ({ ...prev, resourceType: undefined }));
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded-lg transition-all"
                                                        />
                                                        <label htmlFor={`content-${id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2 font-sans text-slate-800">
                                                            {label}
                                                            <Icon className={`h-4 w-4 text-${color}-500`} />
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            {validationErrors.resourceType && (
                                                <div className="mt-2">
                                                    <ValidationMessage message={validationErrors.resourceType} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Fixed Action Buttons */}
                        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-3">
                            <div className="flex justify-between items-center w-full font-sans">
                                <Button
                                    variant="outline"
                                    onClick={handlePrevious}
                                    disabled={currentStep === 1}
                                    className="h-9 px-4 text-sm font-semibold gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] transition-all duration-200 hover:scale-105 font-sans rounded-lg"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>

                                <div className="flex gap-2">
                                    {currentStep === steps.length ? (
                                        <Button
                                            onClick={handlePreview}
                                            className="h-9 px-6 text-sm font-semibold gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm min-w-[140px] transition-all duration-200 hover:scale-105 font-sans rounded-lg"
                                        >
                                            <Eye className="h-4 w-4" />
                                            {isEditMode ? 'Preview & Update' : 'Preview & Create Course Layout'}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleNext}
                                            className="h-9 px-6 text-sm font-semibold gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-sm min-w-[100px] transition-all duration-200 hover:scale-105 font-sans rounded-lg"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </DialogContent>

                <CourseCreationHelpDialog
                    isOpen={isHelpOpen}
                    onOpenChange={setIsHelpOpen}
                />
                <PreviewDialog
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    onSubmit={handleSubmit}
                    formData={formData}
                />
                <ConfirmationDialog
                    isOpen={isConfirmationOpen}
                    onClose={() => setIsConfirmationOpen(false)}
                    onConfirm={() => {
                        const courseIdToPass = createdCourseId || courseId;
                        const query = new URLSearchParams({
                            courseId: courseIdToPass ?? '',
                        }).toString();
                        router.push(`/programcoordinator/pages/pedagogy2?${query}`);
                    }}
                    onLater={() => {
                        setIsConfirmationOpen(false);
                    }}
                />
            </Dialog>
        </AnimatePresence>
    );
};

export default AddCourseSettingsPopup;