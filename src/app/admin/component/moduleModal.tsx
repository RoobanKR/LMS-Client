'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X, GripHorizontal } from 'lucide-react';
import { createModule, CreateModuleData, isAuthenticated } from '../../../apiServices/addmoduleandall/addModule';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  courseId: string;
  onSubmit: (moduleData: {
    moduleName: string;
    description: string;
    level: string;
  }) => void;
}

export default function DraggableModal({ isOpen, onClose, courseName, courseId, onSubmit }: DraggableModalProps) {
  console.log(courseId, courseName);
  
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 450, height: 350 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get auth token from localStorage
  const getAuthToken = (): string | null => {
    try {
      return localStorage.getItem('smartcliff_token');
    } catch (error) {
      console.error('Error getting auth token from localStorage:', error);
      return null;
    }
  };

  // Get institution ID from localStorage - ENHANCED VERSION
  const getInstitutionId = (): string | null => {
    try {
      const smartcliffInstitution = localStorage.getItem('smartcliff_institution');
      console.log('Raw localStorage data:', smartcliffInstitution);
      
      if (smartcliffInstitution) {
        // First, try to parse as JSON
        let institutionData;
        try {
          institutionData = JSON.parse(smartcliffInstitution);
          console.log('Parsed institution data:', institutionData);
        } catch (parseError) {
          // If parsing fails, treat as string
          console.log('Data is not JSON, treating as string:', smartcliffInstitution);
          return smartcliffInstitution;
        }
        
        // If it's already a string (institution ID), return it
        if (typeof institutionData === 'string') {
          console.log('Institution ID (string):', institutionData);
          return institutionData;
        }
        
        // If it's an object, try to find the ID in various possible properties
        if (typeof institutionData === 'object' && institutionData !== null) {
          const possibleIds = [
            institutionData.id,
            institutionData._id,
            institutionData.institutionId,
            institutionData.institution_id,
            institutionData.value,
            institutionData.data?.id,
            institutionData.data?._id,
            institutionData.data?.institutionId
          ];
          
          // Find the first non-null, non-undefined value
          for (const id of possibleIds) {
            if (id !== null && id !== undefined && id !== '') {
              console.log('Found institution ID:', id);
              return String(id); // Convert to string to ensure consistency
            }
          }
          
          // If no ID found in expected properties, log the entire object structure
          console.log('No ID found in expected properties. Full object:', institutionData);
          console.log('Object keys:', Object.keys(institutionData));
          
          // As a fallback, return the first property value that looks like an ID
          const firstValue = Object.values(institutionData)[0];
          if (firstValue && typeof firstValue === 'string') {
            console.log('Using first value as ID:', firstValue);
            return firstValue;
          }
        }
      }
      
      console.log('No institution data found in localStorage');
      return null;
    } catch (error) {
      console.error('Error getting institution ID from localStorage:', error);
      return null;
    }
  };

  // React Query mutation for creating module
  const createModuleMutation = useMutation({
    mutationFn: ({ moduleData, authToken }: { moduleData: CreateModuleData; authToken: string }) => 
      createModule(moduleData, authToken),
    onSuccess: (data) => {
      console.log('Module created successfully:', data);
      
      // Invalidate and refetch course structures
      queryClient.invalidateQueries({ queryKey: ['courseStructures'] });
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      
      // Call the original onSubmit prop for any additional frontend handling
      onSubmit({
        moduleName: moduleName.trim(),
        description: description.trim(),
        level: level || 'beginner'
      });
      
      // Reset form and close modal
      resetForm();
      onClose();
      
      // Optional: Show success toast/notification
      // toast.success('Module created successfully!');
    },
    onError: (error: Error) => {
      console.error('Error creating module:', error);
      setError(error.message || 'Failed to create module');
      
      // Handle authentication errors
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        // Clear invalid token
        localStorage.removeItem('smartcliff_token');
        setError('Session expired. Please log in again.');
      }
    }
  });

  // Center modal on first open
  useEffect(() => {
    if (isOpen) {
      const centerX = (window.innerWidth - size.width) / 2;
      const centerY = (window.innerHeight - size.height) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [isOpen, size.width, size.height]);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      
      if (isResizing) {
        const newWidth = Math.max(350, e.clientX - position.x);
        const newHeight = Math.max(280, e.clientY - position.y);
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'grabbing' : 'se-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, isResizing, dragOffset, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const resetForm = () => {
    setModuleName('');
    setDescription('');
    setLevel('');
    setError(null);
  };

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setError(null);
    
    try {
      // Get auth token and institution ID from localStorage
      const authToken = getAuthToken();
      const institutionId = getInstitutionId();
      
      // Check authentication
      if (!isAuthenticated(authToken)) {
        throw new Error('Please log in to continue');
      }

      console.log('Institution ID for API call:', institutionId);
      
      if (!institutionId) {
        throw new Error('Institution ID not found. Please log in again.');
      }

      // Validate required fields
      if (!moduleName.trim()) {
        throw new Error('Module name is required');
      }

      if (!courseId) {
        throw new Error('Course ID is required');
      }

      // Prepare data for API call
      const moduleData: CreateModuleData = {
        courseId,
        institutionId,
        moduleName: moduleName.trim(),
        description: description.trim(),
        level: level || 'beginner'
      };

      console.log('Sending module data to API:', moduleData);

      // Execute mutation with both moduleData and authToken
      createModuleMutation.mutate({ moduleData, authToken: authToken! });

    } catch (err) {
      console.error('Error creating module:', err);
      setError(err instanceof Error ? err.message : 'Failed to create module');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Validate form
  const authToken = getAuthToken();
  const isFormValid = moduleName.trim() && courseId && getInstitutionId() && isAuthenticated(authToken);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-transparent backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="absolute bg-white rounded-lg shadow-xl border overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          minWidth: 350,
          minHeight: 280
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between p-3 border-b bg-gray-50 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center space-x-2">
            <GripHorizontal className="h-3 w-3 text-gray-400" />
            <h2 className="text-sm font-semibold">Create New Module for {courseName}</h2>
          </div>
          <button 
            onClick={handleClose} 
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ height: size.height - 100 }}>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="moduleName" className="text-xs font-medium">Module Name *</Label>
              <Input
                id="moduleName"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="Enter module name"
                required
                className="h-8 text-xs"
                disabled={createModuleMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs font-medium">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter module description"
                className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-16"
                rows={2}
                disabled={createModuleMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="level" className="text-xs font-medium">Level</Label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-8"
                disabled={createModuleMutation.isPending}
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Auth status indicator */}
            {!isAuthenticated(authToken) && (
              <div className="text-orange-600 text-xs bg-orange-50 p-2 rounded border border-orange-200">
                Authentication required. Please log in to continue.
              </div>
            )}

           
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-3 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createModuleMutation.isPending}
            size="sm"
            className="text-xs h-7"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createModuleMutation.isPending || !isFormValid}
            size="sm"
            className="text-xs h-7"
          >
            {createModuleMutation.isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Creating...
              </>
            ) : 'Create Module'}
          </Button>
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-gray-300 hover:bg-gray-400"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-gray-500 transform rotate-45" />
        </div>
      </div>
    </div>
  );
}