"use client"
import { useState, useEffect, Key } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Save, Loader2, ShieldCheck, Settings2, Users, BookOpen,Computer, FileText, Folder, BarChart, Settings, ChevronDown, ChevronRight, Palette, Image as ImageIcon, Edit, Bell, Home } from "lucide-react"
import { toast } from "react-toastify"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { iconMap, availableColors, colorClasses } from "../../../lib/iconMapping"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PermissionModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  userEmail: string
}

interface PermissionItem {
  id: string
  key: string
  name: string
  icon: string
  color: string
  description: string
  categories?: string[] // Changed to array for multiple categories
  functionalities: {
    id: string
    label: string
    description: string
  }[]
}

// Define permission categories with expandable structure
const permissionCategories = [
  {
    name: "Student",
    key: "student",
    icon: "Users",
    color: "green"
  },
  {
    name: "Staff",
    key: "staff", 
    icon: "Users",
    color: "blue"
  },
  {
    name: "Admin",
    key: "admin",
    icon: "ShieldCheck",
    color: "purple"
  }
]

// Define default permissions with multiple categories
const defaultPermissionData: PermissionItem[] = [
  {
    id: "dashboard",
    key: "admindashboard",
    name: "Admin Dashboard",
    icon: "Home",
    color: "green",
    categories: ["staff", "admin"], // Multiple categories
    description: "Admin Dashboard Management",
    functionalities: [
      { id: "view_users", label: "View Users", description: "View user list" },
      { id: "add_users", label: "Add Users", description: "Create new accounts" },
      { id: "edit_users", label: "Edit Users", description: "Modify user info" },
      { id: "delete_users", label: "Delete Users", description: "Remove accounts" },
    ]
  },
  {
    id: "s_dashboard",
    key: "studentdashboard",
    name: "Student Dashboard",
    icon: "Home",
    color: "green",
    categories: ["student"], // Single category
    description: "Student Dashboard Access",
    functionalities: [
      { id: "view_courses", label: "View Courses", description: "View enrolled courses" },
      { id: "view_grades", label: "View Grades", description: "View grades and progress" },
      { id: "submit_assignments", label: "Submit Assignments", description: "Submit course assignments" },
    ]
  },
  {
    id: "user-management",
    key: "usermanagement",
    name: "User Management",
    icon: "Users",
    color: "blue",
    categories: ["staff", "admin"], // Multiple categories
    description: "Manage users and access",
    functionalities: [
      { id: "Add User", label: "Add User", description: "Create new accounts" },
      { id: "View Full Details", label: "View Full Details", description: "View user full details" },
      { id: "Bulk Permission", label: "Bulk Permission", description: " Bulk user Permissions" },
      { id: "Edit", label: "Edit", description: "Modify user info" },
      { id: "Permissions", label: "Permissions", description: "single User Permissions" },
      { id: "Delete", label: "Delete", description: "Delete the user" },
      { id: "Toggle User Status", label: "Toggle User Status", description: "Toggle the user's active status" },
    ]
  },
  {
    id: "course-management",
    key: "coursestructure",
    name: "Course Management",
    icon: "BookOpen",
    color: "green",
    categories: ["staff", "admin"], // Multiple categories
    description: "Manage courses and materials",
    functionalities: [
      { id: "Add Course Structure", label: "Add Course Structure", description: "Add Course Structure new courses" },
      { id: "View Full Details", label: "View Full Details", description: "View course catalog" },
      { id: "Add Course", label: "Add Courses", description: "Create new courses" },
      { id: "Add Participants", label: "Add Participants", description: "Add Participants" },
      { id: "Upload Resourses", label: "Upload Resourses", description: "Add Course Structure" },
      { id: "Edit Course", label: "Edit Course", description: "Remove courses" },
      { id: "Delete Course", label: "Delete Course", description: "Delete new courses" },
      { id: "Dublicate", label: "Dublicate", description: "Delete new courses" },
    ]
  },
 
  {
    id: "course",
    key: "courses",
    name: "Courses",
    icon: "BookOpen",
    color: "red",
    categories: ["student"], // Single category
    description: "Student Course Access",
    functionalities: [
      { id: "enroll_courses", label: "Enroll Courses", description: "Enroll in new courses" },
      { id: "access_materials", label: "Access Materials", description: "Access course materials" },
      { id: "view_schedule", label: "View Schedule", description: "View course schedule" },
    ]
  },
  {
    id: "compiler-management",
    key: "compailertest",
    name: "Compiler Management",
    icon: "FileText",
    color: "purple",
    categories: ["admin"], // Admin only
    description: "Manage compiler tests",
    functionalities: [
      { id: "view_tests", label: "View Tests", description: "View test list" },
      { id: "create_tests", label: "Create Tests", description: "Create assessments" },
      { id: "edit_tests", label: "Edit Tests", description: "Modify questions" },
      { id: "delete_tests", label: "Delete Tests", description: "Remove tests" },
    ]
  },
  {
    id: "dynamicfieldsettings",
    key: "dynamicfieldsettings",
    name: "Dynamic Field Settings",
    icon: "Settings2",
    color: "gray",
    categories: ["staff", "admin"], // Multiple categories
    description: "Dynamic Field Configuration",
    functionalities: [
      { id: "Service Modal", label: "Service Modal", description: "Service config" },
      { id: "Course Category", label: "Course Category", description: "Course preferences" },
      { id: "Pedagogy", label: "Pedagogy", description: "Pedagogy preferences" },
    ]
  },
  {
    id: "notification",
    key: "notifications",
    name: "Notifications",
    icon: "Bell",
    color: "gray",
    categories: ["student", "staff", "admin"], // All categories
    description: "System notifications",
    functionalities: [
      { id: "view_notifications", label: "View Notifications", description: "View notifications" },
      { id: "edit_notifications", label: "Edit Notifications", description: "Modify notifications" },
    ]
  },
]

// Icon component mapping
const iconComponents: Record<string, React.ComponentType<any>> = {
  Users: Users,
  ShieldCheck: ShieldCheck,
  Home: Home,
  BookOpen: BookOpen,
  Computer:Computer,
  FileText: FileText,
  Settings2: Settings2,
  Bell: Bell,
  // Add more icons as needed
};

// Helper function to get icon component
const getIconComponent = (iconName: string): React.ComponentType<any> => {
  return iconComponents[iconName] || iconMap[iconName] || ShieldCheck;
};

export function PermissionModal({ isOpen, onClose, userId, userName, userEmail }: PermissionModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [selectedFunctionalities, setSelectedFunctionalities] = useState<Record<string, string[]>>({})
  const [activePermission, setActivePermission] = useState<string | null>(null)
  const [permissionData, setPermissionData] = useState<PermissionItem[]>(defaultPermissionData)
  const [editingPermission, setEditingPermission] = useState<PermissionItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const queryClient = useQueryClient()
  const token = localStorage.getItem('smartcliff_token')

  // Toggle category expansion
  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryKey)
        ? prev.filter(key => key !== categoryKey)
        : [...prev, categoryKey]
    )
  }

  // Get permissions by category - updated for multiple categories
  const getPermissionsByCategory = (categoryKey: string) => {
    return permissionData.filter(permission => 
      permission.categories?.includes(categoryKey)
    )
  }

  // Check if category has selected permissions
  const hasSelectedPermissionsInCategory = (categoryKey: string) => {
    const categoryPermissions = getPermissionsByCategory(categoryKey)
    return categoryPermissions.some(permission => selectedPermissions.includes(permission.key))
  }

  // Get selected count in category
  const getSelectedCountInCategory = (categoryKey: string) => {
    const categoryPermissions = getPermissionsByCategory(categoryKey)
    return categoryPermissions.filter(permission => selectedPermissions.includes(permission.key)).length
  }

  // Get total permissions count in category
  const getTotalCountInCategory = (categoryKey: string) => {
    return getPermissionsByCategory(categoryKey).length
  }

  const updateMutation = useMutation({
    mutationFn: async (permissions: any[]) => {
      const response = await fetch(`https://lms-server-ym1q.onrender.com/user-permission/update/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message?.[0]?.value || 'Failed to update permissions')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
      toast.success(data.message?.[0]?.value || "Permissions updated successfully")
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update permissions")
      console.error("Update error:", error)
    }
  })

  useEffect(() => {
    if (isOpen && userId) {
      setSelectedPermissions([])
      setSelectedFunctionalities({})
      setExpandedCategories([]) // Reset expanded categories
      
      // Expand first category by default
      if (permissionCategories.length > 0) {
        setExpandedCategories([permissionCategories[0].key])
      }

      fetch(`https://lms-server-ym1q.onrender.com/user/get-permission/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          if (data.data?.permissions) {
            const selectedPermKeys: string[] = []
            const funcs: Record<string, string[]> = {}
            
            const backendPermissions = data.data.permissions
            let permissionsList = defaultPermissionData
            
            if (backendPermissions && backendPermissions.length > 0) {
              const mergedPermissions = defaultPermissionData.map(defaultPerm => {
                const backendPerm = backendPermissions.find((bp: any) => bp.permissionKey === defaultPerm.key)
                if (backendPerm) {
                  return {
                    ...defaultPerm,
                    icon: backendPerm.icon || defaultPerm.icon,
                    color: backendPerm.color || defaultPerm.color,
                    description: backendPerm.description || defaultPerm.description
                  }
                }
                return defaultPerm
              })
              permissionsList = mergedPermissions
            }
            
            setPermissionData(permissionsList)
            
            data.data.permissions.forEach((perm: any) => {
              const permission = permissionsList.find(p => p.key === perm.permissionKey)
              if (permission) {
                selectedPermKeys.push(permission.key)
                if (perm.permissionFunctionality?.length > 0) {
                  funcs[permission.key] = perm.permissionFunctionality
                }
              }
            })
            
            setSelectedPermissions(selectedPermKeys)
            setSelectedFunctionalities(funcs)
            
            if (selectedPermKeys.length > 0) {
              setActivePermission(selectedPermKeys[0])
            } else if (permissionsList.length > 0) {
              setActivePermission(permissionsList[0].key)
            }
          } else {
            setPermissionData(defaultPermissionData)
            setActivePermission(defaultPermissionData[0]?.key || null)
          }
        })
        .catch(() => {
          toast.error("Failed to load permissions")
          setPermissionData(defaultPermissionData)
          if (defaultPermissionData.length > 0) {
            setActivePermission(defaultPermissionData[0].key)
          }
        })
    }
  }, [isOpen, userId, token])

  const handlePermissionToggle = (permissionKey: string) => {
    setSelectedPermissions(prev => {
      const isCurrentlySelected = prev.includes(permissionKey)
      
      if (isCurrentlySelected) {
        const newSelected = prev.filter(key => key !== permissionKey)
        const newFuncs = { ...selectedFunctionalities }
        delete newFuncs[permissionKey]
        setSelectedFunctionalities(newFuncs)
        
        if (activePermission === permissionKey) {
          if (newSelected.length > 0) {
            setActivePermission(newSelected[0])
          } else if (permissionData.length > 0) {
            setActivePermission(permissionData[0].key)
          }
        }
        
        return newSelected
      } else {
        const newSelected = [...prev, permissionKey]
        setActivePermission(permissionKey)
        
        // Auto-expand the first category that contains this permission
        const permission = permissionData.find(p => p.key === permissionKey)
        if (permission?.categories && permission.categories.length > 0) {
          const firstCategory = permission.categories[0]
          if (!expandedCategories.includes(firstCategory)) {
            setExpandedCategories(prev => [...prev, firstCategory])
          }
        }
        
        return newSelected
      }
    })
  }

  const handleFunctionalityToggle = (permissionKey: string, functionalityId: string) => {
    setSelectedFunctionalities(prev => {
      const newFuncs = { ...prev }
      
      if (!newFuncs[permissionKey]) {
        newFuncs[permissionKey] = []
      }
      
      const index = newFuncs[permissionKey].indexOf(functionalityId)
      if (index > -1) {
        newFuncs[permissionKey].splice(index, 1)
      } else {
        newFuncs[permissionKey].push(functionalityId)
      }
      
      if (newFuncs[permissionKey].length === 0) {
        delete newFuncs[permissionKey]
      }
      
      return newFuncs
    })
  }

  const handleSelectAllFunctionalities = () => {
    if (!activePermission) return
    
    const permission = permissionData.find(p => p.key === activePermission)
    if (!permission) return
    
    const allFuncs = permission.functionalities.map(f => f.id)
    setSelectedFunctionalities(prev => ({
      ...prev,
      [activePermission]: allFuncs
    }))
  }

  const handleClearAllFunctionalities = () => {
    if (!activePermission) return
    
    const newFuncs = { ...selectedFunctionalities }
    delete newFuncs[activePermission]
    setSelectedFunctionalities(newFuncs)
  }

  const handleEditPermission = (permission: PermissionItem) => {
    setEditingPermission(permission)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!editingPermission) return
    
    setPermissionData(prev => 
      prev.map(p => 
        p.key === editingPermission.key ? editingPermission : p
      )
    )
    setIsEditing(false)
    setEditingPermission(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingPermission(null)
  }

  const handleIconChange = (iconName: string) => {
    if (editingPermission) {
      setEditingPermission({
        ...editingPermission,
        icon: iconName
      })
    }
  }

  const handleColorChange = (color: string) => {
    if (editingPermission) {
      setEditingPermission({
        ...editingPermission,
        color: color
      })
    }
  }

  // Handle category selection in edit modal
  const handleCategoryToggle = (categoryKey: string) => {
    if (!editingPermission) return
    
    const currentCategories = editingPermission.categories || []
    const newCategories = currentCategories.includes(categoryKey)
      ? currentCategories.filter(cat => cat !== categoryKey)
      : [...currentCategories, categoryKey]
    
    setEditingPermission({
      ...editingPermission,
      categories: newCategories
    })
  }

  const getActivePermission = () => {
    return permissionData.find(p => p.key === activePermission)
  }

  const getTotalSelectedFunctionalities = () => {
    return Object.values(selectedFunctionalities).reduce((total, funcs) => total + funcs.length, 0)
  }

  const handleSave = () => {
    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission")
      return
    }

    const permissionsArray = selectedPermissions.map((permissionKey, index) => {
      const permission = permissionData.find(p => p.key === permissionKey)
      return {
        permissionName: permission?.name || permissionKey,
        permissionKey: permissionKey,
        permissionFunctionality: selectedFunctionalities[permissionKey] || [],
        icon: permission?.icon || "Shield",
        color: permission?.color || "blue",
        description: permission?.description || "",
        isActive: true,
        order: index
      }
    })

    updateMutation.mutate(permissionsArray)
  }

  const handleClearAll = () => {
    setSelectedPermissions([])
    setSelectedFunctionalities({})
    setExpandedCategories([])
    if (permissionData.length > 0) {
      setActivePermission(permissionData[0].key)
    }
  }

  const isPermissionSelected = (permissionKey: string) => {
    return selectedPermissions.includes(permissionKey)
  }

  const getPermissionFuncCount = (permissionKey: string) => {
    return selectedFunctionalities[permissionKey]?.length || 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex h-[80vh]">
          {/* Left Sidebar - Collapsible Categories */}
          <div className="w-64 border-r bg-gray-50 overflow-y-auto p-2">
            <div className="p-2 mb-2">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Role Categories</h3>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs">
                  <div className="text-gray-500">Selected:</div>
                  <div className="font-bold text-gray-900">{selectedPermissions.length}</div>
                </div>
                <div className="text-xs">
                  <div className="text-gray-500">Functions:</div>
                  <div className="font-bold text-gray-900">{getTotalSelectedFunctionalities()}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              {permissionCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.key)
                const categoryPermissions = getPermissionsByCategory(category.key)
                const hasSelected = hasSelectedPermissionsInCategory(category.key)
                const selectedCount = getSelectedCountInCategory(category.key)
                const totalCount = getTotalCountInCategory(category.key)
                const IconComponent = getIconComponent(category.icon)
                const color = colorClasses[category.color] || colorClasses.blue
                
                return (
                  <div key={category.key} className="border rounded-md overflow-hidden">
                    {/* Category Header */}
                    <div 
                      onClick={() => toggleCategory(category.key)}
                      className={`p-2 cursor-pointer transition-all ${hasSelected ? color.bgLight : 'bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${hasSelected ? color.bg : 'bg-gray-100'}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-gray-900">{category.name}</h4>
                            <p className="text-[10px] text-gray-500">
                              {selectedCount}/{totalCount} selected
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasSelected && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              {selectedCount}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Permissions List (Collapsible) */}
                    {isExpanded && (
                      <div className="pl-2 pr-1 py-1 space-y-1 border-t">
                        {categoryPermissions.map((permission) => {
                          const PermissionIcon = getIconComponent(permission.icon)
                          const isSelected = isPermissionSelected(permission.key)
                          const isActive = activePermission === permission.key
                          const color = colorClasses[permission.color] || colorClasses.blue
                          const funcCount = getPermissionFuncCount(permission.key)
                          
                          return (
                            <div 
                              key={`${category.key}-${permission.key}`}
                              className={`relative rounded transition-all duration-150 ${isActive ? color.bg : ''}`}
                            >
                              {/* Checkbox */}
                              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
                                <div 
                                  onClick={() => handlePermissionToggle(permission.key)}
                                  className={`h-4 w-4 rounded-sm border flex items-center justify-center cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-blue-500 border-blue-500' 
                                      : 'bg-white border-gray-300 hover:border-blue-500'
                                  }`}
                                >
                                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                              </div>
                              
                              {/* Permission Item */}
                              <button
                                onClick={() => setActivePermission(permission.key)}
                                className={`w-full text-left pl-8 pr-2 py-1.5 rounded transition-all ${
                                  isActive 
                                    ? `${color.bg} border ${color.border}` 
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 rounded ${isSelected ? color.bgLight : 'bg-gray-100'}`}>
                                    <div className={`h-3 w-3 ${isSelected ? color.text : 'text-gray-600'}`}>
                                      <PermissionIcon className="h-3 w-3" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-medium text-gray-900 truncate">{permission.name}</h4>
                                      {funcCount > 0 && (
                                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
                                          {funcCount}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate">{permission.description}</p>
                                  </div>
                                </div>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Sidebar Footer */}
            <div className="mt-4 p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-xs h-7 text-gray-600 hover:text-gray-900 mb-2"
              >
                <X className="h-3 w-3 mr-1.5" />
                Clear All
              </Button>
              
              {/* Expand/Collapse All */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCategories(permissionCategories.map(c => c.key))}
                  className="flex-1 text-xs h-7"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCategories([])}
                  className="flex-1 text-xs h-7"
                >
                  Collapse All
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Edit Permission Modal - Updated for multiple categories */}
            {isEditing && editingPermission && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 w-96 max-w-[90vw]">
                  <h3 className="text-lg font-semibold mb-4">Edit Permission</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Permission Name
                      </label>
                      <input
                        type="text"
                        value={editingPermission.name}
                        onChange={(e) => setEditingPermission({...editingPermission, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editingPermission.description}
                        onChange={(e) => setEditingPermission({...editingPermission, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categories
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {permissionCategories.map((category) => {
                          const isSelected = editingPermission.categories?.includes(category.key) || false
                          const color = colorClasses[category.color] || colorClasses.blue
                          const Icon = getIconComponent(category.icon)
                          
                          return (
                            <button
                              key={category.key}
                              type="button"
                              onClick={() => handleCategoryToggle(category.key)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                                isSelected 
                                  ? `${color.bg} ${color.text} border ${color.border}` 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                              {category.name}
                              {isSelected && <Check className="h-3 w-3 ml-1" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon
                      </label>
                      <Select value={editingPermission.icon} onValueChange={handleIconChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {Object.keys(iconMap).map((iconName) => {
                            const Icon = iconMap[iconName]
                            return (
                              <SelectItem key={iconName} value={iconName}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{iconName}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {availableColors.map((color: Key | null | undefined) => {
                          if (!color || typeof color !== 'string') return null
                          const colorClass = colorClasses[color] || colorClasses.blue
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => handleColorChange(color)}
                              className={`h-8 rounded flex items-center justify-center ${
                                editingPermission.color === color 
                                  ? 'ring-2 ring-offset-1 ring-gray-400' 
                                  : ''
                              }`}
                              style={{ backgroundColor: `var(--color-${color})` }}
                              title={color}
                            >
                              {editingPermission.color === color && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <DialogHeader className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-sm font-semibold text-gray-900">
                    Permissions for {userName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-600">
                    {userEmail} • {selectedPermissions.length} permission(s) selected
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getTotalSelectedFunctionalities()} functions
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activePermission && getActivePermission() ? (
                <div className="space-y-4">
                  {/* Permission Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses[getActivePermission()?.color || 'blue'].bgLight}`}>
                        {(() => {
                          const iconName = getActivePermission()?.icon || "Shield"
                          const IconComponent = getIconComponent(iconName)
                          return (
                            <IconComponent className={`h-4 w-4 ${colorClasses[getActivePermission()?.color || 'blue'].text}`} />
                          )
                        })()}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">
                          {getActivePermission()?.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isPermissionSelected(activePermission) 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isPermissionSelected(activePermission) ? 'Enabled' : 'Disabled'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getPermissionFuncCount(activePermission)}/{getActivePermission()?.functionalities.length} functions
                          </span>
                          {/* Show categories for current permission */}
                          <div className="flex items-center gap-1">
                            {getActivePermission()?.categories?.map(categoryKey => {
                              const category = permissionCategories.find(c => c.key === categoryKey)
                              if (!category) return null
                              const color = colorClasses[category.color] || colorClasses.blue
                              const Icon = getIconComponent(category.icon)
                              
                              return (
                                <span 
                                  key={categoryKey}
                                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${color.bgLight} ${color.text}`}
                                >
                                  <Icon className="h-2.5 w-2.5" />
                                  {category.name}
                                </span>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => handleEditPermission(getActivePermission()!)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Enable:</span>
                        <div 
                          onClick={() => handlePermissionToggle(activePermission)}
                          className={`h-5 w-10 rounded-full cursor-pointer transition-all duration-200 flex items-center p-0.5 ${
                            isPermissionSelected(activePermission) 
                              ? 'bg-blue-500 justify-end' 
                              : 'bg-gray-300 justify-start'
                          }`}
                        >
                          <div className="h-4 w-4 bg-white rounded-full shadow-sm" />
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAllFunctionalities}
                          className="h-7 px-2 text-xs"
                          disabled={!isPermissionSelected(activePermission)}
                          title="Select all functions"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearAllFunctionalities}
                          className="h-7 px-2 text-xs"
                          disabled={!isPermissionSelected(activePermission)}
                          title="Clear all functions"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Functionalities Grid */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                      Available Functions
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {getActivePermission()?.functionalities.map((func) => {
                        const isSelected = selectedFunctionalities[activePermission]?.includes(func.id) || false
                        const isPermissionSelectedValue = isPermissionSelected(activePermission)
                        const color = colorClasses[getActivePermission()?.color || 'blue']
                        
                        return (
                          <div
                            key={func.id}
                            onClick={() => {
                              if (isPermissionSelectedValue) {
                                handleFunctionalityToggle(activePermission, func.id)
                              }
                            }}
                            className={`p-2 border rounded-md cursor-pointer transition-all duration-150 ${
                              isPermissionSelectedValue
                                ? isSelected
                                  ? `${color.bg} border ${color.border}`
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-200 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${
                                isSelected && isPermissionSelectedValue 
                                  ? `${color.bgLight} ${color.text}` 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {isSelected && isPermissionSelectedValue ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-medium text-gray-900 truncate">{func.label}</h4>
                                <p className="text-[10px] text-gray-500 truncate">{func.description}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Status Message */}
                  {!isPermissionSelected(activePermission) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center">
                          <ShieldCheck className="h-2.5 w-2.5 text-amber-600" />
                        </div>
                        <p className="text-xs font-medium text-amber-800">
                          Enable this permission to configure functions
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="p-3 bg-gray-100 rounded-full mb-3">
                    <ShieldCheck className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Select a Permission
                  </h3>
                  <p className="text-xs text-gray-600 max-w-sm">
                    Choose a permission from the sidebar to configure its functions
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="p-3 border-t bg-white">
              <div className="flex items-center justify-between w-full">
                <div className="text-xs text-gray-600">
                  {selectedPermissions.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedPermissions.length} permission(s)</span>
                      <span className="text-gray-400">•</span>
                      <span>{getTotalSelectedFunctionalities()} function(s)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-amber-700">No permissions selected</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={updateMutation.isPending}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || selectedPermissions.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs"
                    size="sm"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}