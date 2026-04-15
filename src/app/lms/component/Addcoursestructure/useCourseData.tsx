// AddCourseSettingsPopup/hooks/useCourseData.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Users } from 'lucide-react';
import { useServices } from '@/apiServices/dynamicFields/servicemodel';
import { fetchCategories } from '@/apiServices/dynamicFields/category';
import { courseStructureApi } from '@/apiServices/createCourseStucture';
import { pedagogyStructureApi } from '@/apiServices/dynamicFields/pedagogyStructureService';
import { FormData, Service, Category, Client, PedagogyActivity } from './types';
import { initializeResourcesType } from './utils/helpers';
import { transformTestConfigurationForFrontend } from './Step2CourseDetails';

interface UseCourseDataProps {
    isOpen: boolean;
    isEditMode: boolean;
    courseId?: string;
    formData?: FormData;
    setFormData?: React.Dispatch<React.SetStateAction<FormData>>;
    clientList: Client[];
    setIsCustomCourseName?: (value: boolean) => void;
    setCustomCourseName?: (value: string) => void;
}

export const useCourseData = ({
    isOpen,
    isEditMode,
    courseId,
    formData,
    setFormData,
    clientList,
    setIsCustomCourseName,
    setCustomCourseName
}: UseCourseDataProps) => {
    const [availableCourseNames, setAvailableCourseNames] = useState<string[]>([]);
    const [isEditDataReady, setIsEditDataReady] = useState(false);
    const [existingCourseIds, setExistingCourseIds] = useState<Set<string>>(new Set());
    
    // Use ref to prevent infinite loops
    const hasPopulated = useRef(false);
    const prevCourseDataRef = useRef<any>(null);
    const isMounted = useRef(true);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('smartcliff_token') : null;
    const institutionId = typeof window !== 'undefined' ? localStorage.getItem('smartcliff_institution') || '' : '';

    // Fetch services
    const { data: services = [], isLoading: isLoadingServices } = useServices(institutionId, token || '');

    // Fetch categories
    const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
        queryKey: ["categories", isOpen],
        queryFn: async () => {
            const { categories } = await fetchCategories();
            const filteredCategories = categories.filter((category: Category) => true);
            const sortedCategories = [...filteredCategories].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
            return { categories: sortedCategories, allCategories: categories };
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: isOpen,
    });

    // Fetch structures
    const { data: structures } = useQuery(pedagogyStructureApi.getAll());

    // Fetch course data for edit mode
    const { data: courseData } = useQuery({
        queryKey: ["courseStructure", courseId, isOpen],
        queryFn: () => courseId ? courseStructureApi.getById(courseId).queryFn() : null,
        enabled: !!courseId && !!token && isOpen,
        staleTime: 0,
        gcTime: 0,
    });

    // Fetch all courses and extract existing course IDs
    const { data: allCourses } = useQuery({
        queryKey: ["allCourseStructures"],
        queryFn: async () => {
            try {
                const response = await courseStructureApi.getAll().queryFn();
                // Check if response has data property
                const coursesData = response?.data || response;
                if (coursesData && Array.isArray(coursesData) && isMounted.current) {
                    const ids = new Set(
                        coursesData
                            .map((course: any) => course.courseCode)
                            .filter((code: string) => code) // Filter out falsy values
                    );
                    setExistingCourseIds(ids);
                }
                return response;
            } catch (error) {
                console.error('Error fetching courses:', error);
                return { data: [] };
            }
        },
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });
    
    const filteredServices = services;
    const selectedService = formData ? filteredServices.find((s: Service) => s.id === formData.modal) : undefined;
    const filteredServiceModels = selectedService?.serviceModals || [];

    // Update available course names when category changes
    useEffect(() => {
        if (formData?.categoryName && categoriesData?.allCategories) {
            const selectedCategory = categoriesData.allCategories.find((cat: Category) => cat._id === formData.categoryName);
            if (selectedCategory) {
                setAvailableCourseNames(selectedCategory.courseNames || []);
            }
        } else {
            setAvailableCourseNames([]);
        }
    }, [formData?.categoryName, categoriesData?.allCategories]);

    const transformStructureToActivities = useCallback((dbStructures: any[]): PedagogyActivity[] => {
        if (!dbStructures || dbStructures.length === 0) return [];
        const structure = dbStructures[0];
        return [
            { 
                id: "i_do", 
                name: "I_Do", 
                title: "I Do (Teacher Demonstration)", 
                icon: <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />, 
                elements: structure.I_Do?.map((item: string, index: number) => ({ id: `i_do_${index}`, name: item })) || [] 
            },
            { 
                id: "we_do", 
                name: "We_Do", 
                title: "We Do (Guided Practice)", 
                icon: <Users className="h-4 w-4 text-green-600 dark:text-green-400" />, 
                elements: structure.We_Do?.map((item: string, index: number) => ({ id: `we_do_${index}`, name: item })) || [] 
            },
            { 
                id: "you_do", 
                name: "You_Do", 
                title: "You Do (Independent Practice)", 
                icon: <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />, 
                elements: structure.You_Do?.map((item: string, index: number) => ({ id: `you_do_${index}`, name: item })) || [] 
            },
        ];
    }, []);

    const populateEditForm = useCallback(() => {
        if (!courseData?.data || !setFormData) return;
        if (!setIsCustomCourseName || !setCustomCourseName) return;
        
        // Check if we've already populated with this data
        if (prevCourseDataRef.current === courseData.data._id && hasPopulated.current) {
            return;
        }
        
        const data = courseData.data;
        prevCourseDataRef.current = data._id;

        const matchedClient = clientList.find(client => client.clientCompany === data.clientName);
        const matchedService = services.find((s: Service) => s.name === data.serviceType);
        const matchedModel = matchedService?.serviceModals.find((m: any) => m.name === data.serviceModal);
        const matchedCategory = categoriesData?.allCategories?.find((cat: Category) => cat.categoryName === data.category);

        // Transform testConfiguration from backend to frontend format
        const frontendTestConfig = transformTestConfigurationForFrontend(data.testConfiguration);

        setFormData({
            client: matchedClient?._id || '',
            clientName: data.clientName || '',
            categoryName: matchedCategory?._id || '',
            categoryDisplayName: data.category || '',
            level: data.courseLevel || '',
            duration: matchedModel?.id || '',
            serviceModelName: data.serviceModal || '',
            selectedCourseName: data.courseName || '',
            title: data.courseName || '',
            courseid: data.courseCode || '',
            modal: matchedService?.id || '',
            serviceTypeName: data.serviceType || '',
            courseDescription: data.courseDescription || '',
            instructor: data.instructor || '',
            iDo: data.I_Do || [],
            weDo: data.We_Do || [],
            youDo: data.You_Do || [],
            image: data.courseImage || null,
            aiChatGlobal: data.aiChatGlobal || false,
            checkboxOptions: {
                module: data.courseHierarchy?.includes('Module') || false,
                submodule: data.courseHierarchy?.includes('Sub Module') || false,
                topic: data.courseHierarchy?.includes('Topic') || false,
                subtopic: data.courseHierarchy?.includes('Sub Topic') || false
            },
            resourcesType: initializeResourcesType(data.resourcesType || {}),
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
            }],
            testConfiguration: frontendTestConfig
        });

        if (matchedCategory) {
            const isCustom = !matchedCategory.courseNames?.includes(data.courseName);
            setIsCustomCourseName(isCustom);
            if (isCustom) setCustomCourseName(data.courseName);
        }
        
        hasPopulated.current = true;
    }, [courseData, setFormData, clientList, services, categoriesData, setIsCustomCourseName, setCustomCourseName]);

    // Reset population flag when modal closes
    useEffect(() => {
        if (!isOpen) {
            hasPopulated.current = false;
            prevCourseDataRef.current = null;
        }
    }, [isOpen]);

    // Main edit effect
    useEffect(() => {
        if (!isOpen) { 
            setIsEditDataReady(false); 
            return; 
        }
        if (!isEditMode) { 
            setIsEditDataReady(true); 
            return; 
        }

        const isClientsLoaded = clientList.length > 0;
        const isServicesLoaded = services.length > 0;
        const isCategoriesLoaded = categoriesData?.allCategories?.length > 0;
        const isCourseDataLoaded = courseData?.data;
        const hasNotPopulated = !hasPopulated.current;

        if (isClientsLoaded && isServicesLoaded && isCategoriesLoaded && isCourseDataLoaded && hasNotPopulated) {
            populateEditForm();
            setIsEditDataReady(true);
        } else if (isClientsLoaded && isServicesLoaded && isCategoriesLoaded && isCourseDataLoaded) {
            setIsEditDataReady(true);
        } else {
            setIsEditDataReady(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEditMode, clientList.length, services.length, categoriesData?.allCategories?.length, courseData?.data]);

    // Cleanup on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    return {
        services,
        isLoadingServices,
        categoriesData,
        isLoadingCategories,
        structures,
        allCourses,
        courseData,
        isEditDataReady,
        availableCourseNames,
        filteredServices,
        selectedService,
        filteredServiceModels,
        existingCourseIds, // IMPORTANT: This must be included
        transformStructureToActivities,
        populateEditForm
    };
};