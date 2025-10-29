import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X, Plus, BookOpen, Clock, Tag, FileText, Layers, Target } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createSubModule } from '../../../../apiServices/addmoduleandall/addSubmodule';
import { toast } from 'sonner';

interface ModuleData {
  _id: string | { $oid: string };
  moduleName: string;
  description: string;
  level: string;
  createdAt: string | { $date: string };
  updatedAt: string | { $date: string };
}

interface AddSubModuleFormProps {
  module: ModuleData;
  courseId: string;
  moduleId: string;
  hierarchyType: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubModuleForm({
  module,
  courseId,
  moduleId,
  hierarchyType,
  onClose,
  onSuccess
}: AddSubModuleFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: module.level,
    duration: '',
    resources: [] as string[],
    learningObjectives: [] as string[],
  });

  const { mutateAsync: createSubModuleMutation, isPending } = useMutation({
    mutationFn: async (data: typeof formData) => {
      const authToken = localStorage.getItem('smartcliff_institution');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      const submissionData = {
        ...data,
        courseId,
        moduleId,
        hierarchyType,
        parentModuleName: module.moduleName
      };

      return await createSubModule(submissionData, authToken);
    },
    onSuccess: () => {
      toast.success(`${getHierarchyDisplayName()} created successfully`);
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create submodule');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await createSubModuleMutation(formData);
    } catch (error) {
      console.error('Error creating submodule:', error);
    }
  };

  const getHierarchyDisplayName = () => {
    switch (hierarchyType.toLowerCase()) {
      case 'sub module':
        return 'Sub-Module';
      case 'topic':
        return 'Topic';
      case 'sub topic':
        return 'Sub-Topic';
      default:
        return hierarchyType;
    }
  };

  const getIcon = () => {
    switch (hierarchyType.toLowerCase()) {
      case 'sub module':
        return <Layers className="h-5 w-5" />;
      case 'topic':
        return <BookOpen className="h-5 w-5" />;
      case 'sub topic':
        return <Target className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          {getIcon()}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Add New {getHierarchyDisplayName()}
          </h2>
          <p className="text-sm text-gray-500">
            Parent Module: {module.moduleName}
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={`Enter ${hierarchyType.toLowerCase()} name`}
              required
              className="h-10 pl-10"
            />
          </div>
        </div>

        {/* Level and Duration - Two Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="level" className="text-sm font-medium text-gray-700">
              Level
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                placeholder="e.g., Beginner"
                className="h-10 pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
              Duration
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g., 2 hours"
                className="h-10 pl-10"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </Label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the content and objectives..."
              rows={4}
              className="resize-none pl-10"
            />
          </div>
        </div>

        {/* Context Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Context Information</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-full">
              Course: {courseId.substring(0, 8)}...
            </span>
            <span className="bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-full">
              Module: {moduleId.substring(0, 8)}...
            </span>
            <span className="bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1 rounded-full capitalize">
              {hierarchyType.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={onClose} 
            disabled={isPending}
            className="px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isPending || !formData.name.trim()}
            className="px-6"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create {getHierarchyDisplayName()}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}           