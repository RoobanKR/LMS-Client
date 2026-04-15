// AddCourseSettingsPopup/components/Step1BasicConfig.tsx
import React, { useEffect, useCallback } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, Layers, Box, ListTree, BookOpen, Hash, Clock, Calendar, Info, ChevronLeft } from 'lucide-react';
import InfoTooltip from '@/components/ui/reusabletooltip';
import { ValidationMessage } from './ValidationMessage';
import { FormData, ValidationErrors, Client, Service, Category, ServiceModal } from './types';
import { generateUniqueCourseId } from './utils/helpers';

interface Step1BasicConfigProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    validationErrors: ValidationErrors;
    setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
    clientList: Client[];
    isClientsLoading: boolean;
    services: Service[];
    isLoadingServices: boolean;
    filteredServices: Service[];
    selectedService: Service | undefined;
    filteredServiceModels: any[];
    categoriesData: { categories: Category[]; allCategories: Category[] } | undefined;
    isLoadingCategories: boolean;
    availableCourseNames: string[];
    isCustomCourseName: boolean;
    setIsCustomCourseName: (value: boolean) => void;
    customCourseName: string;
    setCustomCourseName: (value: string) => void;
    currentTime: Date;
    totalCourses?: number;
    isEditMode?: boolean;
}

export const Step1BasicConfig: React.FC<Step1BasicConfigProps> = ({
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    clientList,
    isClientsLoading,
    services,
    filteredServices,
    selectedService,
    filteredServiceModels,
    categoriesData,
    isLoadingCategories,
    availableCourseNames,
    isCustomCourseName,
    setIsCustomCourseName,
    customCourseName,
    setCustomCourseName,
    currentTime,
    totalCourses = 0,
    isEditMode = false
}) => {
    // Helper function to get client name by ID
    const getClientName = useCallback((clientId: string) => {
        const client = clientList.find(c => c._id === clientId);
        return client?.clientCompany || '';
    }, [clientList]);

    // Helper function to get service name by ID
    const getServiceName = useCallback((serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        return service?.name || '';
    }, [services]);

    // Helper function to get service model name by ID - FIXED
    const getServiceModelName = useCallback((modelId: string) => {
        // First try to find in filteredServiceModels
        const model = filteredServiceModels.find(m => String(m.id) === String(modelId));
        if (model?.name) {
            return model.name;
        }
        
        // If not found, try to find through selectedService
        if (selectedService?.serviceModals) {
            const foundModel = selectedService.serviceModals.find(m => String(m.id) === String(modelId));
            if (foundModel?.name) {
                return foundModel.name;
            }
        }
        
        // If still not found, try through all services
        for (const service of services) {
            const foundModel = service.serviceModals?.find(m => String(m.id) === String(modelId));
            if (foundModel?.name) {
                return foundModel.name;
            }
        }
        
        return '';
    }, [filteredServiceModels, selectedService, services]);

    // Helper function to get category name by ID
    const getCategoryName = useCallback((categoryId: string) => {
        const category = categoriesData?.allCategories?.find(c => c._id === categoryId);
        return category?.categoryName || '';
    }, [categoriesData]);

   const generateCourseId = () => {
    if (!formData.client || !formData.modal || !formData.duration) return '';

    const client = clientList.find(c => c._id === formData.client);
    const clientName = client?.clientCompany || 'Client';

    const service = services.find((s: Service) => s.id === formData.modal);
    const serviceType = service?.name || 'Service';

    // ✅ FIX: Use String() comparison to avoid number vs string mismatch
    const serviceModel = service?.serviceModals?.find(
        (m: ServiceModal) => String(m.id) === String(formData.duration)
    )?.name || '';

    if (!serviceModel) return ''; // ✅ Return empty instead of 'Model' to avoid bad ID

    const clientAbbr = clientName
        .split(' ')
        .map(word => word[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 3);

    const serviceTypeAbbr = serviceType
        .split(' ')
        .map((word: string) => word[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 3);

    const serviceModelAbbr = serviceModel
        .split(' ')
        .map((word: string) => word[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 3);

    const nextNumber = totalCourses + 1;
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${clientAbbr}-${serviceTypeAbbr}-${serviceModelAbbr}-${formattedNumber}`;
};

    return (
        <div className="w-full space-y-5 font-sans">
            {/* First Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SelectField
                    label="Course Client"
                    icon={Building}
                    value={formData.client}
                    onValueChange={(value) => {
                        setFormData({ 
                            ...formData, 
                            client: value,
                            clientName: getClientName(value)
                        });
                        setValidationErrors(prev => ({ ...prev, client: undefined }));
                    }}
                    placeholder={isClientsLoading ? "Loading clients..." : "Select client"}
                    error={validationErrors.client}
                    disabled={isClientsLoading}
                    options={clientList.map(c => ({ value: c._id, label: c.clientCompany }))}
                    tooltip="Select the client for this course"
                />

                <SelectField
                    label="Service Type"
                    icon={Layers}
                    value={formData.modal}
                    onValueChange={(value) => {
                        setFormData({ 
                            ...formData, 
                            modal: value, 
                            duration: '',
                            serviceTypeName: getServiceName(value)
                        });
                        setValidationErrors(prev => ({ ...prev, modal: undefined }));
                    }}
                    placeholder="Select service type"
                    error={validationErrors.modal}
                    options={filteredServices.map(s => ({ value: s.id, label: s.name }))}
                    tooltip="Select the type of service"
                />

                <SelectField
                    label="Service Model"
                    icon={Box}
                    value={formData.duration}
                    onValueChange={(value) => {
                        const modelName = getServiceModelName(value);
                        setFormData({ 
                            ...formData, 
                            duration: value,
                            serviceModelName: modelName
                        });
                        setValidationErrors(prev => ({ ...prev, duration: undefined }));
                    }}
                    placeholder="Select service model"
                    error={validationErrors.duration}
                    options={filteredServiceModels.filter(m => m?.id).map(m => ({ value: String(m.id), label: m.name }))}
                    tooltip="Select service delivery model"
                />
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SelectField
                    label="Course Category"
                    icon={ListTree}
                    value={formData.categoryName}
                    onValueChange={(value) => {
                        setFormData({ 
                            ...formData, 
                            categoryName: value, 
                            selectedCourseName: '', 
                            title: '',
                            categoryDisplayName: getCategoryName(value)
                        });
                        setIsCustomCourseName(false);
                        setCustomCourseName('');
                        setValidationErrors(prev => ({ ...prev, categoryName: undefined }));
                    }}
                    placeholder="Select category"
                    error={validationErrors.categoryName}
                    isLoading={isLoadingCategories}
                    options={categoriesData?.allCategories?.map(c => ({ value: c._id, label: c.categoryName })) || []}
                    tooltip="Select the category"
                />

                <div className="space-y-1.5">
                    <LabelWithTooltip label="Course Name" icon={BookOpen} required tooltip="Select from available courses or choose 'Others' to enter custom name" />
                    {!isCustomCourseName ? (
                        <Select
                            value={formData.selectedCourseName}
                            onValueChange={(value) => {
                                if (value === "others") {
                                    setIsCustomCourseName(true);
                                    setFormData({ ...formData, selectedCourseName: '', title: '' });
                                } else {
                                    setFormData({ ...formData, selectedCourseName: value, title: value });
                                }
                                setValidationErrors(prev => ({ ...prev, selectedCourseName: undefined }));
                            }}
                            disabled={!formData.categoryName}
                        >
                            <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-200 rounded-lg ${validationErrors.selectedCourseName ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-gray-700'}`}>
                                <SelectValue placeholder={!formData.categoryName ? "Select category first" : availableCourseNames.length === 0 ? "No courses available" : "Select course name"} />
                            </SelectTrigger>
                            <SelectContent className="font-sans bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-700 rounded-lg">
                                {!formData.categoryName ? (
                                    <div className="px-3 py-2 text-sm text-slate-500 dark:text-gray-400 font-medium">Please select a category first</div>
                                ) : availableCourseNames.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-slate-500 dark:text-gray-400 font-medium">No courses available for this category</div>
                                ) : (
                                    <>
                                        {availableCourseNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                                        <div className="border-t border-slate-200 dark:border-gray-700 my-1"></div>
                                        <SelectItem value="others" className="font-medium text-blue-600 dark:text-blue-400">Others (Custom Name)</SelectItem>
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
                                    setFormData({ ...formData, selectedCourseName: e.target.value, title: e.target.value });
                                    setValidationErrors(prev => ({ ...prev, selectedCourseName: undefined }));
                                }}
                                className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white dark:bg-gray-800 rounded-lg ${validationErrors.selectedCourseName ? 'border-red-500' : 'border-slate-300'}`}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => { setIsCustomCourseName(false); setCustomCourseName(''); setFormData({ ...formData, selectedCourseName: '', title: '' }); }} className="h-7 px-3 text-xs gap-1">
                                <ChevronLeft className="h-3 w-3" /> Back to course list
                            </Button>
                        </div>
                    )}
                    {validationErrors.selectedCourseName && <ValidationMessage message={validationErrors.selectedCourseName} />}
                </div>

                <div className="space-y-1.5">
                    <LabelWithTooltip label="Course ID" icon={Hash} required tooltip="Auto-generated ID" />
                    <Input 
                        type="text" 
                        value={formData.courseid} 
                        readOnly 
                        className="w-full h-9 px-3 text-sm font-medium bg-slate-100 dark:bg-gray-700 cursor-not-allowed rounded-lg font-mono" 
                    />
                    {formData.client && formData.modal && formData.duration && !formData.courseid && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Generating course ID...
                        </p>
                    )}
                </div>
            </div>

            {/* DateTime Section */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1">
                            <Clock className="h-4 w-4 text-green-500 dark:text-green-400" /> Current Date & Time
                        </Label>
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg px-3 py-2">
                            <Calendar className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                            <input type="text" readOnly value={currentTime.toLocaleString()} className="flex-1 text-sm font-medium text-slate-800 dark:text-gray-200 bg-transparent outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-3 rounded-r-lg flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Course Setup</h4>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mt-0.5">
                        Fill all required fields marked with <span className="text-red-500 dark:text-red-400 font-semibold">*</span> to continue
                    </p>
                </div>
            </div>
        </div>
    );
};

// Helper sub-components
const LabelWithTooltip: React.FC<{ label: string; icon: any; required?: boolean; tooltip: string }> = ({ label, icon: Icon, required, tooltip }) => (
    <div className="flex items-center gap-1.5">
        <Label className="text-sm font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1 font-sans">
            <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </Label>
        <InfoTooltip content={tooltip} />
    </div>
);

const SelectField: React.FC<{
    label: string;
    icon: any;
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    error?: string;
    disabled?: boolean;
    isLoading?: boolean;
    options: Array<{ value: string; label: string }>;
    tooltip: string;
}> = ({ label, icon, value, onValueChange, placeholder, error, disabled, isLoading, options, tooltip }) => (
    <div className="space-y-1.5">
        <LabelWithTooltip label={label} icon={icon} required tooltip={tooltip} />
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={`w-full h-9 px-3 text-sm font-medium font-sans bg-white dark:bg-gray-800 rounded-lg ${error ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-gray-700'}`}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="font-sans bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-700 rounded-lg">
                {isLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-500 dark:text-gray-400">Loading...</div>
                ) : options.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500 dark:text-gray-400">No options available</div>
                ) : (
                    options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)
                )}
            </SelectContent>
        </Select>
        {error && <ValidationMessage message={error} />}
    </div>
);