// AddCourseSettingsPopup/utils/helpers.ts
import { Client, PedagogyResources, Service, ServiceModal } from "../types";

export const safeGet = (obj: any, path: string, defaultValue: any = null) => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }
    return result !== undefined ? result : defaultValue;
};

export const generateCourseId = (
    client: string,
    modal: string,
    duration: string,
    clientList: Client[],
    services: Service[],
    totalCourses: number
): string => {
    if (!client || !modal || !duration) return '';
    if (!clientList.length || !services.length) return ''; // Add check

    const selectedClient = clientList.find(c => c._id === client);
    const clientName = selectedClient?.clientCompany || 'Client';

    const service = services.find((s: Service) => s.id === modal);
    const serviceType = service?.name || 'Service';

    const serviceModel = service?.serviceModals?.find((m: ServiceModal) => m.id === duration)?.name || 'Model';

    const clientAbbr = clientName.split(' ').map(word => word[0]?.toUpperCase() || '').join('').slice(0, 3);
    const serviceTypeAbbr = serviceType.split(' ').map((word: string) => word[0]?.toUpperCase() || '').join('').slice(0, 3);
    const serviceModelAbbr = serviceModel.split(' ').map((word: string) => word[0]?.toUpperCase() || '').join('').slice(0, 3);

    const nextNumber = totalCourses + 1;
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${clientAbbr}-${serviceTypeAbbr}-${serviceModelAbbr}-${formattedNumber}`;
};

export const initializeResourcesType = (existingResources: any): PedagogyResources => {
    const defaultFileConfig = {
        enabled: false,
        maxSize: 50,
        allowedFormats: []
    };

    return {
        iDo: {
            video: { ...defaultFileConfig, ...safeGet(existingResources, 'iDo.video', {}), maxSize: safeGet(existingResources, 'iDo.video.maxSize', 50) },
            ppt: { ...defaultFileConfig, ...safeGet(existingResources, 'iDo.ppt', {}), maxSize: safeGet(existingResources, 'iDo.ppt.maxSize', 20) },
            pdf: { ...defaultFileConfig, ...safeGet(existingResources, 'iDo.pdf', {}), maxSize: safeGet(existingResources, 'iDo.pdf.maxSize', 10) },
            url: { enabled: safeGet(existingResources, 'iDo.url.enabled', false) },
            aiChat: { enabled: safeGet(existingResources, 'iDo.aiChat.enabled', false) },
            aiSummary: { enabled: safeGet(existingResources, 'iDo.aiSummary.enabled', false) },
            notes: { enabled: safeGet(existingResources, 'iDo.notes.enabled', false) }
        },
        weDo: {
            video: { enabled: false, maxSize: 50, allowedFormats: [] },
            ppt: { enabled: false, maxSize: 20, allowedFormats: [] },
            pdf: { enabled: false, maxSize: 10, allowedFormats: [] },
            url: { enabled: false },
            aiChat: { enabled: safeGet(existingResources, 'weDo.aiChat.enabled', false) },
            aiSummary: { enabled: safeGet(existingResources, 'weDo.aiSummary.enabled', false) },
            notes: { enabled: safeGet(existingResources, 'weDo.notes.enabled', false) }
        },
        youDo: {
            video: { enabled: false, maxSize: 50, allowedFormats: [] },
            ppt: { enabled: false, maxSize: 20, allowedFormats: [] },
            pdf: { enabled: false, maxSize: 10, allowedFormats: [] },
            url: { enabled: false },
            aiChat: { enabled: safeGet(existingResources, 'youDo.aiChat.enabled', false) },
            aiSummary: { enabled: safeGet(existingResources, 'youDo.aiSummary.enabled', false) },
            notes: { enabled: safeGet(existingResources, 'youDo.notes.enabled', false) }
        }
    };
};

export const generateUniqueCourseId = (
    clientId: string,
    serviceId: string,
    modelId: string,
    clientList: Client[],
    services: Service[],
    serviceModels: ServiceModal[],
    existingCourseIds: Set<string>
): string => {
    // Early return if required data is not available
    if (!clientId || !serviceId || !modelId) return '';
    if (!clientList.length || !services.length || !serviceModels.length) return '';
    if (!existingCourseIds.size) return '';

    const client = clientList.find(c => c._id === clientId);
    const service = services.find(s => s.id === serviceId);
    const model = serviceModels.find(m => String(m.id) === String(modelId));

    if (!client || !service || !model) return '';

    // Get abbreviations (max 3 characters each)
    const clientAbbr = (client.clientCompany || '')
        .split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3);
    const serviceAbbr = (service.name || '')
        .split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3);
    const modelAbbr = (model.name || '')
        .split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3);

    // If any abbreviation is empty, use default
    const finalClientAbbr = clientAbbr || 'CLI';
    const finalServiceAbbr = serviceAbbr || 'SRV';
    const finalModelAbbr = modelAbbr || 'MDL';

    const prefix = `${finalClientAbbr}-${finalServiceAbbr}-${finalModelAbbr}`;

    let counter = 1;
    let courseId = `${prefix}-${String(counter).padStart(3, '0')}`;

    // Keep incrementing until we find a unique ID (limit to 1000 attempts)
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (existingCourseIds.has(courseId) && attempts < maxAttempts) {
        counter++;
        courseId = `${prefix}-${String(counter).padStart(3, '0')}`;
        attempts++;
    }

    return courseId;
};