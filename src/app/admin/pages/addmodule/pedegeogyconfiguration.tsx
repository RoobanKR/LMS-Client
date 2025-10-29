'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import DraggableModal from '@/app/admin/component/moduleModal';

// Define the CourseStructure interface here (or import it if defined elsewhere)
interface CourseStructure {
  _id: string;
  institution: string;
  clientName: string;
  serviceType: string;
  serviceModal: string;
  category: string;
  courseCode: string;
  courseName: string;
  courseDescription: string;
  courseDuration: string;
  courseLevel: string;
  courseImage: string;
  resourcesType: string[];
  courseHierarchy: string[];
  I_Do: string[];
  We_Do: string[];
  You_Do: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  __v: number;
}

interface ModuleCreationProps {
  courseId: string;
  courseName: string;
  courseData: CourseStructure;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ModuleCreation({
  courseId,
  courseName,
  courseData,
  onCancel,
  onSuccess
}: ModuleCreationProps) {
  console.log('Full course data:', courseData);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModuleSubmit = async (moduleData: {
    moduleName: string;
    description: string;
    level: string;
  }) => {
    try {
      // Add your API call to create the module here
      // await createModuleAPI(courseId, moduleData);
      console.log('Creating module:', moduleData);
      onSuccess();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Module Button - Made smaller */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1 text-xs h-7 px-2"
          size="sm"
        >
          <Plus className="h-3 w-3" />
          <span>Add Module</span>
        </Button>
      </div>

      {/* Draggable Modal */}
      <DraggableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseName={courseName}
        courseId={courseId} // <-- Add this line
        onSubmit={handleModuleSubmit}
      />
    </div>
  );
}