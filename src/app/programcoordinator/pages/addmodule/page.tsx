'use client'

import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Plus,
  Trash2,
  FolderOpen,
  BookOpen,
  File,
  List,
  Edit3,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Home,
  GraduationCap,
  Settings,
  X,
  Eye
} from 'lucide-react';
import DashboardLayout from '@/app/admin/component/layout';
import Link from 'next/link';

interface CourseItem {
  id: string;
  name: string;
  type: 'module' | 'submodule' | 'topic' | 'subtopic';
  children?: CourseItem[];
  parentId?: string;
  description?: string;
  isCompleted?: boolean;
}

interface CourseStructure {
  id: string;
  name: string;
  description: string;
  allowedLevels: string[];
  items: CourseItem[];
  totalItems: number;
  lastModified: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  progress?: number;
}

export default function CourseBuilderPage() {
  // Sample courses
  const [courses] = useState<Course[]>([
    {
      id: '1',
      name: 'Web Development Fundamentals',
      description: 'Complete guide to modern web development',
      category: 'Programming',
      status: 'draft',
      progress: 65
    },
    {
      id: '2',
      name: 'React Advanced Patterns',
      description: 'Advanced React concepts and patterns',
      category: 'Programming',
      status: 'published',
      progress: 100
    },
    {
      id: '3',
      name: 'JavaScript ES6+',
      description: 'Modern JavaScript features and best practices',
      category: 'Programming',
      status: 'draft',
      progress: 30
    }
  ]);

  // Sample course structures
  const [courseStructures, setCourseStructures] = useState<Record<string, CourseStructure>>({
    '1': {
      id: '1',
      name: 'Web Development Fundamentals',
      description: 'Complete guide to modern web development',
      allowedLevels: ['module', 'submodule', 'topic', 'subtopic'],
      totalItems: 15,
      lastModified: '2025-06-18',
      items: [
        {
          id: '1',
          name: 'HTML Fundamentals',
          type: 'module',
          description: 'Learn the basics of HTML structure and semantics',
          isCompleted: true,
          children: [
            {
              id: '2',
              name: 'HTML Elements',
              type: 'submodule',
              parentId: '1',
              description: 'Understanding HTML elements and their usage',
              isCompleted: true,
              children: [
                {
                  id: '3',
                  name: 'Basic Tags',
                  type: 'topic',
                  parentId: '2',
                  isCompleted: true,
                  children: [
                    {
                      id: '4',
                      name: 'Heading Tags (h1-h6)',
                      type: 'subtopic',
                      parentId: '3',
                      isCompleted: true
                    },
                    {
                      id: '5',
                      name: 'Paragraph Tags',
                      type: 'subtopic',
                      parentId: '3',
                      isCompleted: false
                    }
                  ]
                },
                {
                  id: '6',
                  name: 'Form Elements',
                  type: 'topic',
                  parentId: '2',
                  isCompleted: false,
                  children: [
                    {
                      id: '7',
                      name: 'Input Types',
                      type: 'subtopic',
                      parentId: '6',
                      isCompleted: false
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: '10',
          name: 'CSS Fundamentals',
          type: 'module',
          description: 'Styling web pages with CSS',
          isCompleted: false,
          children: [
            {
              id: '11',
              name: 'CSS Selectors',
              type: 'submodule',
              parentId: '10',
              isCompleted: false,
              children: [
                {
                  id: '12',
                  name: 'Class and ID Selectors',
                  type: 'topic',
                  parentId: '11',
                  isCompleted: false,
                  children: [
                    {
                      id: '12a',
                      name: 'Class Selectors',
                      type: 'subtopic',
                      parentId: '12',
                      isCompleted: false
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  });

  const [selectedCourse, setSelectedCourse] = useState<string>('1');
  const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(courseStructures['1']);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1', '10']));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHierarchyDialog, setShowHierarchyDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    type: 'module' as 'module' | 'submodule' | 'topic' | 'subtopic',
    parentId: ''
  });
  const [currentItem, setCurrentItem] = useState<CourseItem | null>(null);

  useEffect(() => {
    if (selectedCourse) {
      const structure = courseStructures[selectedCourse];
      if (structure) {
        setCourseStructure(structure);
      }
    } else {
      setCourseStructure(null);
    }
  }, [selectedCourse, courseStructures]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setShowAddDialog(false);
    setShowEditDialog(false);
    setShowDeleteDialog(false);
  };

  const getIcon = (type: string, size: string = "w-3.5 h-3.5") => {
    const iconClass = `${size}`;
    switch (type) {
      case 'module': return <FolderOpen className={`${iconClass} text-blue-600`} />;
      case 'submodule': return <BookOpen className={`${iconClass} text-green-600`} />;
      case 'topic': return <File className={`${iconClass} text-orange-600`} />;
      case 'subtopic': return <List className={`${iconClass} text-purple-600`} />;
      default: return <File className={iconClass} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'module': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'submodule': return 'bg-green-50 text-green-700 border-green-200';
      case 'topic': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'subtopic': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getHierarchyColors = (type: string) => {
    switch (type) {
      case 'module': return {
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        textWhite: 'text-white'
      };
      case 'submodule': return {
        bg: 'bg-green-500',
        bgLight: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        textWhite: 'text-white'
      };
      case 'topic': return {
        bg: 'bg-orange-500',
        bgLight: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        textWhite: 'text-white'
      };
      case 'subtopic': return {
        bg: 'bg-purple-500',
        bgLight: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        textWhite: 'text-white'
      };
      default: return {
        bg: 'bg-gray-500',
        bgLight: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        textWhite: 'text-white'
      };
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const openAddDialog = (type: 'module' | 'submodule' | 'topic' | 'subtopic', parentId: string = '') => {
    setNewItem({
      name: '',
      description: '',
      type,
      parentId
    });
    setShowAddDialog(true);
  };

  const openEditDialog = (item: CourseItem) => {
    setCurrentItem(item);
    setNewItem({
      name: item.name,
      description: item.description || '',
      type: item.type,
      parentId: item.parentId || ''
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (item: CourseItem) => {
    setCurrentItem(item);
    setShowDeleteDialog(true);
  };

  const getNextLevelType = (currentType: string): 'submodule' | 'topic' | 'subtopic' | null => {
    switch (currentType) {
      case 'module': return 'submodule';
      case 'submodule': return 'topic';
      case 'topic': return 'subtopic';
      default: return null;
    }
  };

  // CRUD Operations
  const addItem = () => {
    if (!newItem.name.trim() || !selectedCourse) return;

    const newId = Date.now().toString();
    const newItemToAdd: CourseItem = {
      id: newId,
      name: newItem.name,
      description: newItem.description,
      type: newItem.type,
      parentId: newItem.parentId || undefined,
      isCompleted: false
    };

    setCourseStructures(prev => {
      const currentStructure = prev[selectedCourse];
      if (!currentStructure) return prev;

      const updatedStructure = { ...currentStructure };

      if (!newItem.parentId) {
        // Add as top-level module
        updatedStructure.items = [...updatedStructure.items, newItemToAdd];
      } else {
        // Find parent and add as child
        const addToParent = (items: CourseItem[]): CourseItem[] => {
          return items.map(item => {
            if (item.id === newItem.parentId) {
              return {
                ...item,
                children: [...(item.children || []), newItemToAdd]
              };
            }
            if (item.children) {
              return {
                ...item,
                children: addToParent(item.children)
              };
            }
            return item;
          });
        };

        updatedStructure.items = addToParent(updatedStructure.items);
      }

      updatedStructure.totalItems += 1;
      updatedStructure.lastModified = new Date().toISOString().split('T')[0];

      return {
        ...prev,
        [selectedCourse]: updatedStructure
      };
    });

    setShowAddDialog(false);
    setNewItem({ name: '', description: '', type: 'module', parentId: '' });
  };

  const updateItem = () => {
    if (!currentItem || !newItem.name.trim() || !selectedCourse) return;

    setCourseStructures(prev => {
      const currentStructure = prev[selectedCourse];
      if (!currentStructure) return prev;

      const updatedStructure = { ...currentStructure };

      const updateInStructure = (items: CourseItem[]): CourseItem[] => {
        return items.map(item => {
          if (item.id === currentItem.id) {
            return {
              ...item,
              name: newItem.name,
              description: newItem.description
            };
          }
          if (item.children) {
            return {
              ...item,
              children: updateInStructure(item.children)
            };
          }
          return item;
        });
      };

      updatedStructure.items = updateInStructure(updatedStructure.items);
      updatedStructure.lastModified = new Date().toISOString().split('T')[0];

      return {
        ...prev,
        [selectedCourse]: updatedStructure
      };
    });

    setShowEditDialog(false);
    setCurrentItem(null);
    setNewItem({ name: '', description: '', type: 'module', parentId: '' });
  };

  const deleteItem = () => {
    if (!currentItem || !selectedCourse) return;

    setCourseStructures(prev => {
      const currentStructure = prev[selectedCourse];
      if (!currentStructure) return prev;

      const updatedStructure = { ...currentStructure };

      const removeFromStructure = (items: CourseItem[]): CourseItem[] => {
        return items.filter(item => {
          if (item.id === currentItem.id) return false;
          if (item.children) {
            item.children = removeFromStructure(item.children);
          }
          return true;
        });
      };

      updatedStructure.items = removeFromStructure(updatedStructure.items);
      updatedStructure.totalItems -= 1;
      updatedStructure.lastModified = new Date().toISOString().split('T')[0];

      return {
        ...prev,
        [selectedCourse]: updatedStructure
      };
    });

    setShowDeleteDialog(false);
    setCurrentItem(null);
  };

  const toggleCompletion = (item: CourseItem) => {
    if (!selectedCourse) return;

    setCourseStructures(prev => {
      const currentStructure = prev[selectedCourse];
      if (!currentStructure) return prev;

      const updatedStructure = { ...currentStructure };

      const toggleInStructure = (items: CourseItem[]): CourseItem[] => {
        return items.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              isCompleted: !i.isCompleted
            };
          }
          if (i.children) {
            return {
              ...i,
              children: toggleInStructure(i.children)
            };
          }
          return i;
        });
      };

      updatedStructure.items = toggleInStructure(updatedStructure.items);
      updatedStructure.lastModified = new Date().toISOString().split('T')[0];

      return {
        ...prev,
        [selectedCourse]: updatedStructure
      };
    });
  };

  const renderHierarchyNode = (item: CourseItem, level = 0) => {
    const colors = getHierarchyColors(item.type);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedNodes.has(item.id);

    const getHierarchyLabel = (type: string, level: number) => {
      const levelLabels: Record<number, string> = {
        0: 'Module',
        1: 'Submodule',
        2: 'Topic',
        3: 'Subtopic'
      };
      return levelLabels[level] || type;
    };

    return (
      <div key={item.id} className="flex">
        {/* Current Node */}
        <div className="flex flex-col">
          <div
            className={`
              relative p-2 rounded-md border min-w-32
              ${colors.bgLight} ${colors.border} transition-all duration-200 
              hover:shadow-sm cursor-pointer group
              ${level === 0 ? 'border-2 border-blue-300' : ''}
            `}
            onClick={() => hasChildren && toggleNode(item.id)}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-sm ${colors.bg} flex-shrink-0`}>
                {getIcon(item.type, "w-3 h-3 text-white")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  {getHierarchyLabel(item.type, level)}
                </div>
                <h4 className={`font-medium text-xs ${colors.text} truncate`}>
                  {item.name}
                </h4>
              </div>
              {hasChildren && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">
                    ({item.children!.length})
                  </span>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''
                        }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children Column - only shown if expanded */}
        {hasChildren && isExpanded && (
          <div className="flex ml-12 relative">
            <div className="absolute -left-6 top-4 w-6 h-px bg-gray-300"></div>
            <div className="absolute -left-6 top-4 bottom-0 w-px bg-gray-300"></div>

            <div className="flex flex-col gap-2">
              {item.children!.map((child, index) => (
                <div key={child.id} className="relative flex">
                  <div className="absolute -left-6 top-4 w-6 h-px bg-gray-300"></div>
                  {index === item.children!.length - 1 && (
                    <div className="absolute -left-6 top-4 bottom-0 w-px bg-white"></div>
                  )}
                  {renderHierarchyNode(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTreeItem = (item: CourseItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const nextLevelType = getNextLevelType(item.type);
    const indent = level * 16;

    return (
      <div key={item.id} className="relative">
        <div
          className="group relative flex items-center gap-2.5 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 bg-white"
          style={{ marginLeft: `${indent}px` }}
        >
          {level > 0 && (
            <div className="absolute left-0 top-0 w-px h-full bg-gray-200" style={{ left: `${indent - 8}px` }} />
          )}

          <div className="flex items-center gap-2.5 flex-1">
            <div className="flex-shrink-0">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 rounded-md flex items-center justify-center"
                >
                  <ChevronRight
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </h4>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getTypeColor(item.type)}`}>
                    {item.type}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleCompletion(item)}
              className="h-6 w-6 p-0 hover:bg-green-50 rounded flex items-center justify-center"
              title={item.isCompleted ? "Mark as incomplete" : "Mark as complete"}
            >
              {item.isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>

            {nextLevelType && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddDialog(nextLevelType, item.id);
                }}
                className="h-6 w-6 p-0 hover:bg-blue-50 rounded flex items-center justify-center"
                title={`Add ${nextLevelType}`}
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditDialog(item);
              }}
              className="h-6 w-6 p-0 hover:bg-gray-100 rounded flex items-center justify-center"
              title="Edit"
            >
              <Edit3 className="w-3.5 h-3.5 text-gray-600" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(item);
              }}
              className="h-6 w-6 p-0 hover:bg-red-50 rounded flex items-center justify-center"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {item.children!.map(child => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  return (

    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 space-y-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center text-xs text-gray-500 space-x-1">
            <Home className="w-3 h-3" />
            <ChevronRight className="w-3 h-3" />
            <span>Courses</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">Course Builder</span>
          </nav>

          {/* Page Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Course Builder</h1>
                  <p className="text-sm text-gray-600">Create and manage your course structure with ease</p>
                </div>
              </div>

              {selectedCourseData && (
                <div className="flex items-center gap-4 text-xs text-blue-700">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Current: {selectedCourseData.name}</span>
                  </div>
                  <span>•</span>
                  <span>Progress: {selectedCourseData.progress}%</span>
                  <span>•</span>
                  <span>Status: {selectedCourseData.status}</span>
                </div>
              )}
            </div>
          </div>

          {/* Course Selection and Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Select Course:</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-64 h-8 text-xs border border-gray-300 rounded px-3"
                  >
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {selectedCourse && (
                    <>
                      <button
                        onClick={() => openAddDialog('module')}
                        className="bg-blue-600 hover:bg-blue-700 h-8 text-xs px-3 text-white rounded flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Module
                      </button>
                      <Link href="/programcoordinator/pages/pedagogy2" passHref>
                        <button

                          className="bg-purple-600 hover:bg-blue-700 h-8 text-xs px-3 text-white rounded flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add pedegogy
                        </button>
                      </Link>
                      <button
                        onClick={() => setShowHierarchyDialog(true)}
                        className="h-8 text-xs px-3 border border-green-200 text-green-700 hover:bg-green-50 rounded flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Hierarchy View
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 w-48 h-8 text-xs border border-gray-300 rounded px-3"
                  />
                </div>
                <button className="h-8 text-xs px-2 border border-gray-300 rounded flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Filter
                </button>
              </div>
            </div>
          </div>

          {/* Course Structure Display */}
          {courseStructure ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                      {courseStructure.name}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{courseStructure.totalItems} items</span>
                      <span>•</span>
                      <span>Modified: {courseStructure.lastModified}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="h-7 text-xs px-2 border border-gray-300 rounded flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      Settings
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {courseStructure.items.length > 0 ? (
                  <div className="space-y-2">
                    {courseStructure.items.map(item => renderTreeItem(item))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No content yet</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Start building your course by adding modules, topics, and subtopics.
                    </p>
                    <button
                      onClick={() => openAddDialog('module')}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-4 py-2 text-white rounded flex items-center gap-1 mx-auto"
                    >
                      <Plus className="w-3 h-3" />
                      Add Your First Module
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-center">
                <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Course</h3>
                <p className="text-sm text-gray-500">
                  Choose a course from the dropdown above to start building its structure.
                </p>
              </div>
            </div>
          )}

          {/* Add Item Dialog */}
          {showAddDialog && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50" onClick={() => setShowAddDialog(false)}></div>
              <div className="bg-white rounded-lg p-6 w-full max-w-md relative z-10">
                <div className="mb-4">
                  <h3 className="text-base font-semibold mb-1">
                    Add New {newItem.type.charAt(0).toUpperCase() + newItem.type.slice(1)}
                  </h3>
                  <p className="text-xs text-gray-600">
                    Create a new {newItem.type} for your course structure.
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <label htmlFor="name" className="text-xs font-medium block mb-1">Name</label>
                    <input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={`Enter ${newItem.type} name`}
                      className="h-8 text-xs w-full border border-gray-300 rounded px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="text-xs font-medium block mb-1">Description (Optional)</label>
                    <textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={`Brief description of this ${newItem.type}`}
                      className="text-xs w-full h-16 border border-gray-300 rounded px-3 py-2 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAddDialog(false)}
                    className="h-8 text-xs px-3 border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addItem}
                    disabled={!newItem.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 h-8 text-xs px-3 text-white rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    Add {newItem.type}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Item Dialog */}
          {showEditDialog && currentItem && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50" onClick={() => setShowEditDialog(false)}></div>
              <div className="bg-white rounded-lg p-6 w-full max-w-md relative z-10">
                <div className="mb-4">
                  <h3 className="text-base font-semibold mb-1">
                    Edit {currentItem.type.charAt(0).toUpperCase() + currentItem.type.slice(1)}
                  </h3>
                  <p className="text-xs text-gray-600">
                    Update this {currentItem.type} in your course structure.
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <label htmlFor="edit-name" className="text-xs font-medium block mb-1">Name</label>
                    <input
                      id="edit-name"
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={`Enter ${currentItem.type} name`}
                      className="h-8 text-xs w-full border border-gray-300 rounded px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-description" className="text-xs font-medium block mb-1">Description (Optional)</label>
                    <textarea
                      id="edit-description"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={`Brief description of this ${currentItem.type}`}
                      className="text-xs w-full h-16 border border-gray-300 rounded px-3 py-2 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowEditDialog(false)}
                    className="h-8 text-xs px-3 border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateItem}
                    disabled={!newItem.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 h-8 text-xs px-3 text-white rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    <Edit3 className="w-3 h-3" />
                    Update {currentItem.type}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteDialog && currentItem && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50" onClick={() => setShowDeleteDialog(false)}></div>
              <div className="bg-white rounded-lg p-6 w-full max-w-md relative z-10">
                <div className="mb-4">
                  <h3 className="text-base font-semibold mb-1">
                    Delete {currentItem.type.charAt(0).toUpperCase() + currentItem.type.slice(1)}
                  </h3>
                  <p className="text-xs text-gray-600">
                    Are you sure you want to delete this {currentItem.type}? This action cannot be undone.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded p-3 mb-6">
                  <h4 className="text-sm font-medium text-red-700 mb-1">{currentItem.name}</h4>
                  {currentItem.description && (
                    <p className="text-xs text-red-600">{currentItem.description}</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowDeleteDialog(false)}
                    className="h-8 text-xs px-3 border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteItem}
                    className="bg-red-600 hover:bg-red-700 h-8 text-xs px-3 text-white rounded flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete {currentItem.type}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hierarchy View Dialog */}
          {showHierarchyDialog && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50" onClick={() => setShowHierarchyDialog(false)}></div>
              <div className="bg-white rounded-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col relative z-10">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Course Hierarchy</h3>
                  <button
                    onClick={() => setShowHierarchyDialog(false)}
                    className="h-6 w-6 p-0 hover:bg-gray-100 rounded flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {courseStructure && courseStructure.items.length > 0 ? (
                    <div className="space-y-4">
                      {courseStructure.items.map(item => (
                        <div key={item.id}>
                          {renderHierarchyNode(item)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">No content yet</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Start building your course by adding modules, topics, and subtopics.
                      </p>
                      <button
                        onClick={() => {
                          setShowHierarchyDialog(false);
                          openAddDialog('module');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-xs px-4 py-2 text-white rounded flex items-center gap-1 mx-auto"
                      >
                        <Plus className="w-3 h-3" />
                        Add Your First Module
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div></DashboardLayout>
  );
}