// AddCourseSettingsPopup/types.ts
export interface AddCourseSettingsPopupProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string;
    onSuccess?: () => void;
    totalCourses?: number;
}

export interface PedagogyElement {
    id: string;
    name: string;
    _id?: string;
}

export interface PedagogyActivity {
    id: string;
    name: string;
    title: string;
    icon: React.ReactNode;
    elements: PedagogyElement[];
}

export interface Category {
    _id: string;
    categoryName: string;
    categoryDescription: string;
    categoryCode: string;
    courseNames: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CheckboxOptions {
    module: boolean;
    submodule: boolean;
    topic: boolean;
    subtopic: boolean;
}

export interface ServiceModal {
    id: string;
    name: string;
    description: string;
}

export interface Service {
    id: string;
    name: string;
    status: 'Active' | 'Inactive';
    description: string;
    serviceModals: ServiceModal[];
}

export type ContactPerson = {
    name: string;
    email: string;
    phoneNumber: string;
    isPrimary: boolean;
};

export type Client = {
    _id: string;
    contactPersons: ContactPerson[];
    clientCompany: string;
    description: string;
    clientAddress: string;
    status: string;
    isActive: boolean;
};

export interface FileResource {
    enabled: boolean;
    maxSize: number;
    allowedFormats: string[];
    aiChat?: boolean;
    aiSummary?: boolean;
}

export interface SimpleResource {
    enabled: boolean;
}

export interface ResourceConfigType {
    video?: FileResource;
    ppt?: FileResource;
    pdf?: FileResource;
    url?: SimpleResource;
    aiChat?: SimpleResource;
    aiSummary?: SimpleResource;
    notes?: SimpleResource;
}

export interface PedagogyResources {
    iDo: ResourceConfigType;
    weDo: ResourceConfigType;
    youDo: ResourceConfigType;
}

export interface TestConfiguration {
  coreProgram: string[];
  frontend: string[];
  database: string[];
}

export interface FormData {
    client: string;           // This should store the client ObjectId
    clientName?: string;      // Optional: store client name for display
    modal: string;            // Service Type ID
    serviceTypeName?: string; // Service Type Name (for display and API)
    duration: string;         // Service Model ID
    serviceModelName?: string; // Service Model Name (for display and API)
    categoryName: string;     // Category ID
    categoryDisplayName?: string; // Category Name (for display and API)
    selectedCourseName: string;
    title: string;
    courseid: string;
    courseDescription: string;
    level: string;
    instructor: string;
    iDo: string[];
    weDo: string[];
    youDo: string[];
    image: File | null;
    checkboxOptions: CheckboxOptions;
    resourcesType: PedagogyResources;
    modules: Array<any>;
    aiChatGlobal: boolean;
    testConfiguration: TestConfiguration;
}

export interface ValidationErrors {
    client?: string;
    modal?: string;
    duration?: string;
    categoryName?: string;
    selectedCourseName?: string;
    level?: string;
    courseDescription?: string;
    checkboxOptions?: string;
    resourceType?: string;
    programmingConfiguration?: string;

}

export interface PreviewData {
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