// AddCourseSettingsPopup/utils/constants.ts
import { FormData as CourseFormDataType, PedagogyResources } from "../components/types";

export const steps = [
    { number: 1, title: 'Course Basic Configuration', description: 'Basic configuration' },
    { number: 2, title: 'Course Hierarchy and Layout', description: 'Structure your course' },
];

export const popupVariants = {
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
} as const;

export const toastConfig = {
    position: "top-right" as const,
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    className: '!p-0 !m-0 !bg-transparent !shadow-none !border-0',
    progressClassName: '!bg-white/30 !h-1',
};

// Default "Max size" (MB) for each upload type — what a new course starts with,
// and what a saved size of 0 (never set; mapping defaults store 0) falls back
// to. Course Setup still caps each one at the Super Admin's limit for the type.
export const DEFAULT_MAX_SIZE_MB = { video: 50, ppt: 20, pdf: 20, image: 20, zip: 40 } as const;

export type FileResourceKey = keyof typeof DEFAULT_MAX_SIZE_MB;

export const defaultFileResources = () => ({
    video: { enabled: false, maxSize: DEFAULT_MAX_SIZE_MB.video, allowedFormats: [] },
    ppt: { enabled: false, maxSize: DEFAULT_MAX_SIZE_MB.ppt, allowedFormats: [] },
    pdf: { enabled: false, maxSize: DEFAULT_MAX_SIZE_MB.pdf, allowedFormats: [] },
    image: { enabled: false, maxSize: DEFAULT_MAX_SIZE_MB.image, allowedFormats: [] },
    zip: { enabled: false, maxSize: DEFAULT_MAX_SIZE_MB.zip, allowedFormats: [] },
});

export const defaultResourcesType: PedagogyResources = {
    iDo: {
        ...defaultFileResources(),
        url: { enabled: false },
        aiChat: { enabled: false },
        aiSummary: { enabled: false },
        notes: { enabled: false },
        ai: { enabled: false }
    },
    weDo: {
        ...defaultFileResources(),
        url: { enabled: false },
        aiChat: { enabled: false },
        aiSummary: { enabled: false },
        notes: { enabled: false },
        ai: { enabled: false },
        autoQuestionGenerate: { enabled: false }
    },
    youDo: {
        ...defaultFileResources(),
        url: { enabled: false },
        aiChat: { enabled: false },
        aiSummary: { enabled: false },
        notes: { enabled: false },
        ai: { enabled: false },
        autoQuestionGenerate: { enabled: false }
    }
};

// Renamed to avoid conflict with global FormData
export const initialCourseFormData: CourseFormDataType = {
    client: '',
    clientName: '',
    modal: '',
    serviceTypeName: '',
    duration: '',
    serviceModelName: '',
    categoryName: '',
    categoryDisplayName: '',
    studentType: '',
    batch: '',
    skillingBatches: [],
    degree: '',
    department: '',
    semester: '',
    sections: [],
    selectedCourseName: '',
    title: '',
    courseid: '',
    courseDescription: '',
    level: '',
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
    resourcesType: defaultResourcesType,
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
    }],
    aiChatGlobal: false,
    testConfiguration: {
        coreProgram: [],
        frontend: [],
        database: []
    }
};