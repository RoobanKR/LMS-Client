"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Key,
  Plus,
  X,
  Check,
  Search,
  UserPlus,
  Loader2,
  ChevronDown,
  Send,
  MagnetIcon,
  Briefcase,
  UserCheck,
  Handshake,
  ClipboardList,
  ShieldCheck,
  PencilLine,
  GraduationCap,
  Upload,
  BookOpen,
  Building,
  Calendar,
  Users,
  Filter,
  XCircle,
  KeyRound,
  Eye,
  Copy,
  MoreVertical,
  UserX,
} from "lucide-react"
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import DashboardLayout from "../../component/layout"
import { StatusCards } from "../../component/StatusCards"
import MultiSelect from "../../component/MultiSelect"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addUser, deleteUser, fetchUsers, toggleUserStatus, updateUser } from "@/apiServices/userService"
import { Switch } from "@/components/ui/switch"
import { UserTable } from "@/components/ui/alterationTable"
import { fetchRoles } from "@/apiServices/rolesApi"
import BulkUploadModal from "../../component/BulkUploadModal"
import { PermissionModal } from "../../component/PermissionModal"
import { BulkPermissionModal } from "../../component/BulkPermissionModal"
import { getCurrentUser } from "@/apiServices/tokenVerify"

// Permission Types - Renamed to avoid conflict
interface ApiPermission {
  permissionName: string;
  permissionKey: string;
  permissionFunctionality: string[];
  icon: string;
  color: string;
  description: string;
  isActive: boolean;
  order: number;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    _id: string;
    originalRole: string;
    renameRole: string;
    roleValue: string;
  };
  permissions: ApiPermission[];
}

interface VerifyTokenResponse {
  valid: boolean;
  user: UserData;
}

// Simple Permission interface for checkbox permissions
interface SimplePermission {
  create: boolean;
  edit: boolean;
  delete: boolean;
  report: boolean;
}

interface ModulePermissions {
  courseManagement: SimplePermission;
  userManagement: SimplePermission;
  testAccess: SimplePermission;
}

// Permission utility functions - Updated to use ApiPermission
const hasPermission = (
  permissions: ApiPermission[],
  permissionKey: string,
  functionality?: string
): boolean => {
  
  const permission = permissions.find(p => p.permissionKey === permissionKey);
  
  if (!permission) {
    return false;
  }
  
  if (!permission.isActive) {
    return false;
  }
  
  if (functionality) {
    const trimmedFunctionality = functionality.trim();
    const hasFunc = permission.permissionFunctionality.some(func => 
      func.trim() === trimmedFunctionality
    );
 
    return hasFunc;
  }
  
  return true;
};

const getPermission = (
  permissions: ApiPermission[],
  permissionKey: string
): ApiPermission | undefined => {
  return permissions.find(p => p.permissionKey === permissionKey && p.isActive);
};

// Debug helper function
const debugPermissions = (permissions: ApiPermission[], permissionKey: string) => {
  const permission = permissions.find(p => p.permissionKey === permissionKey);
  if (!permission) {
    return;
  }
  
 
};

// Interfaces
interface Role {
  _id: string
  originalRole: string
  renameRole: string
  roleValue: string
  institution: string
}

export interface User {
  id: string
  firstName: string
  lastName: string
  gender: string
  email: string
  phone: string
  role: string 
  roleId: string
  status: "active" | "inactive"
  lastLogin: string
  degree?: string
  department?: string
  semester?: string
  year?: string
  batch?: string
}

interface ActionButtons {
  edit: (user: User) => void
  permissions: (user: User) => void
  delete: (user: User) => void
  viewDetails?: (user: User) => void
  toggleStatus?: (user: User) => void
  duplicate?: (user: User) => void
}

interface Column<T> {
  key: string
  label: string
  width: string
  align: "left" | "center" | "right"
  renderCell?: (row: T) => React.ReactNode
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalUsers: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Custom Dropdown Component with permissions
interface CustomDropdownProps {
  user: User;
  onEdit: (user: User) => void;
  onPermissions: (user: User) => void;
  onDelete: (user: User) => void;
  onViewDetails?: (user: User) => void;
  onToggleStatus?: (user: User) => void;
  onDuplicate?: (user: User) => void;
  userPermissions: ApiPermission[];
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  user, 
  onEdit, 
  onPermissions, 
  onDelete,
  onViewDetails,
  onToggleStatus,
  onDuplicate,
  userPermissions
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check permissions - Use exact functionality names from your data
  const canAddUser = hasPermission(userPermissions, 'usermanagement', 'Add User');
  const canEditUser = hasPermission(userPermissions, 'usermanagement', 'Edit');
  const canAssignPermissions = hasPermission(userPermissions, 'usermanagement', 'Permissions');
  const canToggleStatus = hasPermission(userPermissions, 'usermanagement', 'Toggle User Status');
  const canDeleteUser = hasPermission(userPermissions, 'usermanagement', 'Delete');
  const canDuplicateUser = hasPermission(userPermissions, 'usermanagement', 'Duplicate User');
  const canViewDetails = hasPermission(userPermissions, 'usermanagement', 'View Full Details');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    switch (action) {
      case 'view':
        onViewDetails?.(user);
        break;
      case 'edit':
        onEdit(user);
        break;
      case 'permissions':
        onPermissions(user);
        break;
      case 'toggle':
        onToggleStatus?.(user);
        break;
      case 'duplicate':
        onDuplicate?.(user);
        break;
      case 'delete':
        onDelete(user);
        break;
    }
  };
  
  // Get user management permission
  const userPermission = getPermission(userPermissions, 'usermanagement');
  const hasUserManagementAccess = userPermission?.isActive || false;
  const hasAnyPermission = canAddUser || canEditUser || canAssignPermissions || canToggleStatus || canDuplicateUser || canDeleteUser || canViewDetails;

  // If no user management access at all, return null or disabled state
  if (!hasUserManagementAccess) {
    return (
      <button
        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 border border-gray-200 transition-all duration-200 group opacity-50 cursor-not-allowed"
        disabled
      >
        <MoreVertical className="h-3 w-3 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-200 group"
        disabled={!hasAnyPermission}
      >
        <MoreVertical className="h-3 w-3 text-gray-600 group-hover:text-gray-700" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
          >
            {/* View Details - Add at the top */}
            {canViewDetails && onViewDetails && (
              <button
                onClick={() => handleAction('view')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
              >
                <Eye className="h-4 w-4 text-blue-600" />
                View Details
              </button>
            )}
            
            {/* Show divider only if there are items above and below */}
            {(canViewDetails && (canEditUser || canAssignPermissions || canToggleStatus || canDuplicateUser || canDeleteUser)) && (
              <div className="border-t border-gray-200 my-1"></div>
            )}
            
            {/* Edit User */}
            {canEditUser && (
              <button
                onClick={() => handleAction('edit')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
              >
                <Edit className="h-4 w-4 text-blue-600" />
                Edit User
              </button>
            )}
            
            {/* Assign Permissions */}
            {canAssignPermissions && (
              <button
                onClick={() => handleAction('permissions')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
              >
                <KeyRound className="h-4 w-4 text-purple-600" />
                Assign Permissions
              </button>
            )}
            
            {/* Toggle Status */}
            {canToggleStatus && (
              <button
                onClick={() => handleAction('toggle')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
              >
                {user.status === 'active' ? (
                  <>
                    <UserX className="h-4 w-4 text-orange-600" />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 text-green-600" />
                    Activate User
                  </>
                )}
              </button>
            )}
            
            {/* Duplicate User */}
            {canDuplicateUser && (
              <button
                onClick={() => handleAction('duplicate')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
              >
                <Copy className="h-4 w-4 text-purple-600" />
                Duplicate
              </button>
            )}
            
            {/* Show divider only if there are items above and delete below */}
            {(canAddUser || canEditUser || canAssignPermissions || canToggleStatus || canDuplicateUser) && canDeleteUser && (
              <div className="border-t border-gray-200 my-1"></div>
            )}
            
            {/* Delete User */}
            {canDeleteUser && (
              <button
                onClick={() => handleAction('delete')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            )}
            
            {/* If no permissions show message */}
            {!canViewDetails && !canAddUser && !canEditUser && !canAssignPermissions && !canToggleStatus && !canDuplicateUser && !canDeleteUser && (
              <div className="px-3 py-2 text-xs text-gray-500 text-center italic">
                No actions available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function getRoleIcon(roleName: string) {
  const lowerRole = roleName.toLowerCase()
  if (lowerRole.includes('lms')) return ShieldCheck
  if (lowerRole.includes('manager')) return Briefcase
  if (lowerRole.includes('hr')) return UserCheck
  if (lowerRole.includes('poc')) return Handshake
  if (lowerRole.includes('coordinator')) return ClipboardList
  if (lowerRole.includes('student')) return GraduationCap
  return ShieldCheck
}

function getRoleColor(roleName: string) {
  const lowerRole = roleName.toLowerCase()
  if (lowerRole.includes('lms')) return "text-blue-500"
  if (lowerRole.includes('manager')) return "text-green-500"
  if (lowerRole.includes('hr')) return "text-pink-500"
  if (lowerRole.includes('poc')) return "text-yellow-500"
  if (lowerRole.includes('coordinator')) return "text-orange-500"
  if (lowerRole.includes('student')) return "text-purple-500"
  return "text-gray-500"
}

export default function UserManagementPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [newUserId, setNewUserId] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("course-management")
  const [token, setToken] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [basedOn, setBasedOn] = useState<string | null>(null)

  const [allUser, setAllUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  // User permissions state - Updated to use ApiPermission
  const [userPermissions, setUserPermissions] = useState<ApiPermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [canAddUser, setCanAddUser] = useState(false);
  const [canBulkUpload, setCanBulkUpload] = useState(false);
  const [canBulkPermission, setCanBulkPermission] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Custom dropdown states
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // College-specific dropdown states
  const [isDegreeDropdownOpen, setIsDegreeDropdownOpen] = useState(false)
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false)
  const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false)
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false)
const [showPermissionModal, setShowPermissionModal] = useState(false)
const [selectedUserForPermission, setSelectedUserForPermission] = useState<User | null>(null)
const [showBulkPermissionModal, setShowBulkPermissionModal] = useState(false);
const [selectedUserForBulkPermissions, setSelectedUserForBulkPermissions] = useState<User | null>(null);

  // View Details states
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [userFullDetails, setUserFullDetails] = useState<any>(null);

  // Updated to use SimplePermission interface
  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({
    courseManagement: {
      create: false,
      edit: false,
      delete: false,
      report: false,
    },
    userManagement: {
      create: false,
      edit: false,
      delete: false,
      report: false,
    },
    testAccess: {
      create: false,
      edit: false,
      delete: false,
      report: false,
    },
  })

  const modalRef = useRef<HTMLDivElement>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const genderDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const degreeDropdownRef = useRef<HTMLDivElement>(null)
  const departmentDropdownRef = useRef<HTMLDivElement>(null)
  const semesterDropdownRef = useRef<HTMLDivElement>(null)
  const yearDropdownRef = useRef<HTMLDivElement>(null)
  const batchDropdownRef = useRef<HTMLDivElement>(null)

  // College-specific data
  const degreeOptions = ["B.Tech", "B.E", "B.Sc", "B.Com", "B.A", "M.Tech", "M.Sc", "MBA", "PhD"]
  const departmentOptions = ["Computer Science", "Electrical", "Mechanical", "Civil", "Electronics", "Information Technology", "Mathematics", "Physics", "Chemistry"]
  const semesterOptions = ["1", "2", "3", "4", "5", "6", "7", "8"]
  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"]
  const batchOptions = ["2021-2025", "2022-2026", "2023-2027", "2024-2028", "2025-2029"]

  const [newUser, setNewUser] = useState({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "Student",
    roleId: "",
    status: "active" as "active" | "inactive",
    gender: "Male" as "Male" | "Female",
    // College-specific fields
    degree: "",
    department: "",
    semester: "",
    year: "",
    batch: "",
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  // College-specific filter states
  const [selectedDegree, setSelectedDegree] = useState<string>("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>("")

  const usersPerPage = 5
  const queryClient = useQueryClient()
  const [dataVersion, setDataVersion] = useState(0)

  // Fetch user permissions on component mount
  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        setIsLoadingPermissions(true);
        const response = await getCurrentUser();
        
        if (response.valid && response.user) {
          setUserData(response.user);
          
          if (response.user.permissions && Array.isArray(response.user.permissions)) {
            setUserPermissions(response.user.permissions);
            
            debugPermissions(response.user.permissions, 'usermanagement');
            
            const canAdd = hasPermission(response.user.permissions, 'usermanagement', 'Add User');

            setCanAddUser(canAdd);
            
            // Check if user can bulk upload
            const canBulkUp = hasPermission(response.user.permissions, 'usermanagement', 'Bulk Upload');
            setCanBulkUpload(canBulkUp);
            
            // Check if user can bulk permission
            const canBulkPerm = hasPermission(response.user.permissions, 'usermanagement', 'Bulk Permission');
            setCanBulkPermission(canBulkPerm);
            
          } else {
            setUserPermissions([]);
          }
        } else {
        }
      } catch (error) {
        console.error('Failed to fetch user permissions:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchUserPermissions();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('smartcliff_token')
    const storedInstitutionId = localStorage.getItem('smartcliff_institution')
    const storedBasedOn = localStorage.getItem('smartcliff_basedOn')

    setToken(storedToken)
    setInstitutionId(storedInstitutionId)
    setBasedOn(storedBasedOn)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdowns = [
        { ref: roleDropdownRef, setter: setIsRoleDropdownOpen },
        { ref: genderDropdownRef, setter: setIsGenderDropdownOpen },
        { ref: statusDropdownRef, setter: setIsStatusDropdownOpen },
        { ref: degreeDropdownRef, setter: setIsDegreeDropdownOpen },
        { ref: departmentDropdownRef, setter: setIsDepartmentDropdownOpen },
        { ref: semesterDropdownRef, setter: setIsSemesterDropdownOpen },
        { ref: yearDropdownRef, setter: setIsYearDropdownOpen },
        { ref: batchDropdownRef, setter: setIsBatchDropdownOpen },
      ]

      dropdowns.forEach(({ ref, setter }) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setter(false)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Data update listener
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      const { version } = event.detail
      setDataVersion(version)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }

    window.addEventListener('usersDataUpdated', handleDataUpdate as EventListener)

    return () => {
      window.removeEventListener('usersDataUpdated', handleDataUpdate as EventListener)
    }
  }, [queryClient])

  // Fetch roles from API
  const { data: rolesData, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ['roles', token],
    queryFn: async () => {
      if (!token) {
        return []
      }
      try {
        const result = await fetchRoles(token)
        return result.roles || []
      } catch (error) {
        console.error("Error fetching roles:", error)
        throw error
      }
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (rolesData && Array.isArray(rolesData)) {
      setRoles(rolesData)
    } else {
      setRoles([])
    }
  }, [rolesData])

  // Generate dynamic role options from API - group by role name
  const dynamicRoleOptions = Array.from(
    new Map(
      roles.map(role => [role.renameRole, role])
    ).values()
  ).map(role => ({
    value: role.renameRole,
    label: role.renameRole,
    icon: getRoleIcon(role.renameRole),
    color: getRoleColor(role.renameRole)
  }))

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedRoles, selectedStatus, selectedDegree, selectedDepartment, selectedYear])

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['users', institutionId, token, basedOn, currentPage, debouncedSearchTerm, selectedRoles, selectedStatus, selectedDegree, selectedDepartment, selectedYear, dataVersion],
    queryFn: async () => {
      if (!token || !institutionId || !basedOn) return { 
        users: [], 
        allUsers: [],
        pagination: { 
          currentPage: 1, 
          totalPages: 1, 
          totalUsers: 0, 
          hasNextPage: false, 
          hasPrevPage: false 
        } 
      }
      
      const allUsers = await fetchUsers(institutionId, token, basedOn)

      const transformedUsers: User[] = (allUsers.users || []).map((user: any) => {
        const roleName = user.role?.renameRole || 
                       (typeof user.role === 'string' ? user.role : 'Unknown Role');
        
        const roleId = user.role?._id || user.role;

        return {
          id: user._id || user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          gender: user.gender,
          email: user.email,
          phone: user.phone || '',
          role: roleName,
          roleId: roleId,
          status: user.status || 'active',
          lastLogin: user.lastLogin || '',
          degree: user.degree || '',
          department: user.department || '',
          semester: user.semester || '',
          year: user.year || '',
          batch: user.batch || '',
        }
      })

      const filteredUsers = transformedUsers.filter(user => {
        const matchesSearch = !debouncedSearchTerm ||
          user.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.phone.includes(debouncedSearchTerm) ||
          (basedOn === 'college' && (
            (user.degree && user.degree.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (user.department && user.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
            (user.batch && user.batch.includes(debouncedSearchTerm))
          ))

        const matchesRoles = selectedRoles.length === 0 || 
          selectedRoles.some(selectedRoleName => {
            return user.role === selectedRoleName
          })
        const matchesStatus = !selectedStatus || selectedStatus === "all" || user.status === selectedStatus

        // College-specific filters
        const matchesDegree = !selectedDegree || selectedDegree === "all" || user.degree === selectedDegree
        const matchesDepartment = !selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment
        const matchesYear = !selectedYear || selectedYear === "all" || user.year === selectedYear

        return matchesSearch && matchesRoles && matchesStatus && matchesDegree && matchesDepartment && matchesYear
      })

      setAllUsers(transformedUsers)
      
      // Client-side pagination
      const startIndex = (currentPage - 1) * usersPerPage
      const endIndex = startIndex + usersPerPage
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

      const totalPages = Math.ceil(filteredUsers.length / usersPerPage)

      return {
        users: paginatedUsers,
        allUsers: transformedUsers,
        pagination: {
          currentPage,
          totalPages,
          totalUsers: filteredUsers.length,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      }
    },
    enabled: !!token && !!institutionId && !!basedOn,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const allUsers = usersData?.allUsers || []

  // Add user mutation with token
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!token) throw new Error("No token")
      return addUser(userData, token)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })

      const addedUser: User = {
        id: data.user._id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        gender: data.user.gender,
        email: data.user.email,
        phone: newUser.phone,
        role: data.user.role,
        roleId: data.user.roles || data.user.roleId,
        status: "active",
        lastLogin: "",
        degree: newUser.degree,
        department: newUser.department,
        semester: newUser.semester,
        year: newUser.year,
        batch: newUser.batch,
      }

      setNewUserId(addedUser.id)
      setShowAddUserModal(false)
      setShowSuccessModal(true)

      // Reset form
      setNewUser({
        id: "",
        firstName: "",
        lastName: "",
        gender: "Male",
        email: "",
        phone: "",
        password: "",
        role: "Student",
        roleId: "",
        status: "active",
        degree: "",
        department: "",
        semester: "",
        year: "",
        batch: "",
      })

      // Handle success/warning messages
      if (data.message) {
        data.message.forEach((msg: { key: string; value: any }) => {
          if (msg.key === 'success') {
            toast.success(msg.value)
          } else if (msg.key === 'warning') {
            toast.warn(msg.value)
          }
        })
      } else {
        toast.success("User added successfully")
      }
    },
    onError: (error) => {
      console.error('Error adding user:', error)
      let errorMessage = 'Failed to add user. Please try again.'

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: any } } }
        if (err.response?.data?.message) {
          const errorMessages = err.response.data.message
          if (Array.isArray(errorMessages)) {
            errorMessages.forEach((msg: { value: string }) => {
              toast.error(msg.value)
            })
            return
          } else {
            errorMessage = errorMessages
          }
        }
      }

      toast.error(errorMessage)
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string, userData: any }) => {
      if (!token) throw new Error("No token")
      return updateUser(userId, userData, token)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddUserModal(false)
      setShowSuccessModal(true)

      // Reset form
      setNewUser({
        id: "",
        firstName: "",
        lastName: "",
        gender: "Male",
        email: "",
        phone: "",
        password: "",
        role: "Student",
        roleId: "",
        status: "active",
        degree: "",
        department: "",
        semester: "",
        year: "",
        batch: "",
      })

      if (data.message) {
        data.message.forEach((msg: { key: string; value: any }) => {
          if (msg.key === 'success') {
            toast.success(msg.value)
          } else if (msg.key === 'warning') {
            toast.warn(msg.value)
          }
        })
      } else {
        toast.success("User updated successfully")
      }
    },
    onError: (error) => {
      console.error('Error updating user:', error)
      let errorMessage = 'Failed to update user. Please try again.'

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: any } } }
        if (err.response?.data?.message) {
          const errorMessages = err.response.data.message
          if (Array.isArray(errorMessages)) {
            errorMessages.forEach((msg: { value: string }) => {
              toast.error(msg.value)
            })
            return
          } else {
            errorMessage = errorMessages
          }
        }
      }

      toast.error(errorMessage)
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!token) throw new Error("No token")
      return deleteUser(userId, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowDeleteModal(false)
      toast.success("User deleted successfully")
    },
    onError: (error) => {
      console.error('Error deleting user:', error)
      let errorMessage = 'Failed to delete user. Please try again.'

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: any } } }
        if (err.response?.data?.message) {
          const errorMessages = err.response.data.message
          if (Array.isArray(errorMessages)) {
            errorMessage = errorMessages.map((msg: { value: string }) => msg.value).join(', ')
          } else {
            errorMessage = errorMessages
          }
        }
      }

      toast.error(errorMessage)
    }
  })

  const toggleStatus = async (userId: string, newStatus: "active" | "inactive") => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [userId]: true }))
      queryClient.setQueryData(
        ['users', token, currentPage, debouncedSearchTerm, selectedRoles, selectedStatus],
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            users: oldData.users.map((user: User) =>
              user.id === userId ? { ...user, status: newStatus } : user
            )
          }
        }
      )

      const apiStatus = newStatus === "inactive" ? "inactive" : newStatus
      await toggleUserStatus(userId, apiStatus, token || undefined)
      toast.success(`Status changed to ${newStatus}`)
      await refetch()
    } catch (error) {
      console.error("Error updating status:", error)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.error("Failed to update user status")
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleAddUserSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newUser.roleId) {
      toast.error("Please select a role")
      return
    }

    // Base user data
    const userData: any = {
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      role: newUser.roleId,
      gender: newUser.gender,
      status: newUser.status || "active",
      ...(newUser.password && { password: newUser.password }),
    }

    // Add college-specific fields if basedOn is college
    if (basedOn === 'college') {
      if (newUser.degree) userData.degree = newUser.degree
      if (newUser.department) userData.department = newUser.department
      if (newUser.semester) userData.semester = newUser.semester
      if (newUser.year) userData.year = newUser.year
      if (newUser.batch) userData.batch = newUser.batch
    }

    try {
      if (newUser.id) {
        await updateUserMutation.mutateAsync({
          userId: newUser.id,
          userData
        })
      } else {
        await addUserMutation.mutateAsync(userData)
      }
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
  }

  const isLoading = addUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending

  // Handle actions
  const handleEdit = (user: User) => {
    setNewUser({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      password: "",
      role: user.role,
      roleId: user.roleId,
      status: user.status,
      gender: user.gender as "Male" | "Female",
      degree: user.degree || "",
      department: user.department || "",
      semester: user.semester || "",
      year: user.year || "",
      batch: user.batch || "",
    })
    setShowAddUserModal(true)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id, {
        onSuccess: () => {
          if (currentUsers.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1)
          }
        }
      })
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowAddUserModal(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

const handlePermissionsClick = (user: User) => {
  setSelectedUserForPermission(user)
  setShowPermissionModal(true)
}
const handleBulkPermissionsClick = (user?: User) => {
  // If a user is provided, pre-select them
  if (user) {
    setSelectedUserForBulkPermissions(user);
  }
  setShowBulkPermissionModal(true);
}

// Handle viewing user details
const handleViewDetails = async (user: User) => {
  try {
    setSelectedUserForDetails(user);
    
    // If you have an API to fetch full user details, use it here
    // For now, we'll use the user data from the table
    setUserFullDetails({
      ...user,
      // Add mock data or fetch from API
      lastLogin: user.lastLogin || "Never logged in",
      permissions: userPermissions, // This would be the current user's permissions, not the selected user's
      // You might want to fetch the selected user's actual permissions here
    });
    
    setShowViewDetailsModal(true);
  } catch (error) {
    console.error("Error fetching user details:", error);
    toast.error("Failed to fetch user details");
  }
};

  const handleAddUserClick = () => {
    setNewUser({
      id: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      role: "Student",
      roleId: "",
      status: "active",
      gender: "Male",
      degree: "",
      department: "",
      semester: "",
      year: "",
      batch: "",
    })
    setShowAddUserModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Updated to use SimplePermission
  const handlePermissionChange = (module: keyof ModulePermissions, permission: keyof SimplePermission) => {
    setModulePermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: !prev[module][permission]
      }
    }))
  }

  const savePermissions = () => {
    setShowPermissionsModal(false)
  }

  const configurePermissionsForNewUser = () => {
    const user = usersData?.users.find(u => u.id === newUserId)
    if (user) {
      setSelectedUser(user)
      setShowSuccessModal(false)
      setShowPermissionsModal(true)
    }
  }



  const getFilteredCount = (
    allUsers: User[],
    searchTerm: string,
    selectedRoles: string[],
    selectedStatus: string,
    selectedDegree: string,
    selectedDepartment: string,
    selectedYear: string
  ): number => {
    return allUsers.filter(user => {
      const matchesSearch = !searchTerm ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm) ||
        (basedOn === 'college' && (
          (user.degree && user.degree.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.batch && user.batch.includes(searchTerm))
        ))

      const matchesRoles = selectedRoles.length === 0 || 
        selectedRoles.some(selectedRoleId => {
          return user.roleId === selectedRoleId
        })

      const matchesStatus = !selectedStatus || selectedStatus === "all" || user.status === selectedStatus

      // College-specific filters
      const matchesDegree = !selectedDegree || selectedDegree === "all" || user.degree === selectedDegree
      const matchesDepartment = !selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment
      const matchesYear = !selectedYear || selectedYear === "all" || user.year === selectedYear

      return matchesSearch && matchesRoles && matchesStatus && matchesDegree && matchesDepartment && matchesYear
    }).length
  }

  const currentUsers = usersData?.users || []
  const pagination = usersData?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  }

  // Helper to get badge data based on current filters
  const getBadgeData = () => {
    const badges: { label: string; value: number }[] = []
    
    if (selectedRoles.length > 0) {
      selectedRoles.forEach(roleId => {
        const role = roles.find(r => r._id === roleId)
        if (role) {
          badges.push({
            label: role.renameRole,
            value: getFilteredCount(
              allUser,
              debouncedSearchTerm,
              [roleId],
              selectedStatus,
              selectedDegree,
              selectedDepartment,
              selectedYear
            ),
          })
        }
      })
    }
    
    if (selectedStatus && selectedStatus !== "all") {
      badges.push({
        label: selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1),
        value: getFilteredCount(
          allUser,
          debouncedSearchTerm,
          selectedRoles,
          selectedStatus,
          selectedDegree,
          selectedDepartment,
          selectedYear
        ),
      })
    }
    
    // College-specific badges
    if (basedOn === 'college') {
      if (selectedDegree && selectedDegree !== "all") {
        badges.push({
          label: `Degree: ${selectedDegree}`,
          value: getFilteredCount(
            allUser,
            debouncedSearchTerm,
            selectedRoles,
            selectedStatus,
            selectedDegree,
            selectedDepartment,
            selectedYear
          ),
        })
      }
      
      if (selectedDepartment && selectedDepartment !== "all") {
        badges.push({
          label: `Dept: ${selectedDepartment}`,
          value: getFilteredCount(
            allUser,
            debouncedSearchTerm,
            selectedRoles,
            selectedStatus,
            selectedDegree,
            selectedDepartment,
            selectedYear
          ),
        })
      }
      
      if (selectedYear && selectedYear !== "all") {
        badges.push({
          label: `Year: ${selectedYear}`,
          value: getFilteredCount(
            allUser,
            debouncedSearchTerm,
            selectedRoles,
            selectedStatus,
            selectedDegree,
            selectedDepartment,
            selectedYear
          ),
        })
      }
    }
    
    return badges
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedRoles([])
    setSelectedStatus("")
    setSelectedDegree("")
    setSelectedDepartment("")
    setSelectedYear("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      selectedRoles.length > 0 ||
      selectedStatus !== "" ||
      selectedDegree !== "" ||
      selectedDepartment !== "" ||
      selectedYear !== "" ||
      searchTerm !== ""
    )
  }

  // Handle toggle status from dropdown
  const handleToggleStatus = (user: User) => {
    const newStatus: "active" | "inactive" = user.status === "active" ? "inactive" : "active";
    toggleStatus(user.id, newStatus);
  };

  // Handle duplicate user
  const handleDuplicateUser = (user: User) => {
    // Create a duplicate user with modified email
    const duplicateEmail = user.email.replace(/@/, `+copy@`);
    
    setNewUser({
      id: "",
      firstName: user.firstName + " (Copy)",
      lastName: user.lastName,
      email: duplicateEmail,
      phone: user.phone,
      password: "",
      role: user.role,
      roleId: user.roleId,
      status: "active",
      gender: user.gender as "Male" | "Female",
      degree: user.degree || "",
      department: user.department || "",
      semester: user.semester || "",
      year: user.year || "",
      batch: user.batch || "",
    });
    setShowAddUserModal(true);
  };

  // Check if user has any permissions for user management
  const hasAnyUserPermission = userPermissions.some(p => p.permissionKey === 'usermanagement' && p.isActive);
  
  // Show loading state while fetching permissions
  if (isLoadingPermissions) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      label: 'Name',
      width: '25%',
      align: 'left',
      renderCell: (user: User) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-indigo-600 text-xs sm:text-sm font-medium">
              {user.firstName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="ml-2">
            <div className="text-xs font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </div>
                        <div className="text-xxs text-gray-500">Gender: {user.gender}</div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      width: '25%',
      align: 'center'
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '15%',
      align: 'center'
    },
    {
      key: 'role',
      label: 'Role',
      width: '15%',
      align: 'center',
      renderCell: (user: User) => (
        <Badge className={`${user.role.toLowerCase().includes('lms') ? 'bg-purple-100 text-purple-800' :
          user.role.toLowerCase().includes('manager') ? 'bg-blue-100 text-blue-800' :
          user.role.toLowerCase().includes('coordinator') ? 'bg-orange-100 text-orange-800' :
          'bg-green-100 text-green-800'
          } px-1.5 py-0.5 rounded-full text-xxs sm:text-xs`}>
          {user.role}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      align: 'center',
      renderCell: (user: User) => {
        const canToggleStatus = hasPermission(userPermissions, 'usermanagement', 'Toggle User Status');
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`text-xs font-medium ${user.status === "active" ? "text-green-600" : "text-red-600"}`}>
                {user.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            {canToggleStatus && (
              <Switch
                checked={user.status === "active"}
                onCheckedChange={(checked: boolean) => {
                  const newStatus: "active" | "inactive" = checked ? "active" : "inactive"
                  toggleStatus(user.id, newStatus)
                }}
                disabled={updatingStatus[user.id]}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '10%',
      align: 'center',
      renderCell: (user: User) => (
        <CustomDropdown
          user={user}
          onEdit={handleEdit}
          onPermissions={handlePermissionsClick}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onToggleStatus={handleToggleStatus}
          onDuplicate={handleDuplicateUser}
          userPermissions={userPermissions}
        />
      )
    }
  ]

  // Render college-specific fields
  const renderCollegeFields = () => {
    if (basedOn !== 'college') return null;

    return (
      <>
        {/* Degree Dropdown */}
        <div className="space-y-1" ref={degreeDropdownRef}>
          <Label className="text-xs font-medium text-gray-700">
            Degree
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDegreeDropdownOpen(!isDegreeDropdownOpen)}
              className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="h-3 w-3 text-gray-500" />
                <span className="flex-1 text-left">
                  {newUser.degree || "Select Degree"}
                </span>
              </div>
              <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isDegreeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDegreeDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {degreeOptions.map((degree) => (
                  <div
                    key={degree}
                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                      newUser.degree === degree ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => {
                      setNewUser({ ...newUser, degree })
                      setIsDegreeDropdownOpen(false)
                    }}
                  >
                    <GraduationCap className="h-3 w-3 text-blue-500" />
                    <span className="flex-1">{degree}</span>
                    {newUser.degree === degree && (
                      <Check className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Department Dropdown */}
        <div className="space-y-1" ref={departmentDropdownRef}>
          <Label className="text-xs font-medium text-gray-700">
            Department
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
              className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3 text-gray-500" />
                <span className="flex-1 text-left">
                  {newUser.department || "Select Department"}
                </span>
              </div>
              <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDepartmentDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {departmentOptions.map((dept) => (
                  <div
                    key={dept}
                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                      newUser.department === dept ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => {
                      setNewUser({ ...newUser, department: dept })
                      setIsDepartmentDropdownOpen(false)
                    }}
                  >
                    <Building className="h-3 w-3 text-blue-500" />
                    <span className="flex-1">{dept}</span>
                    {newUser.department === dept && (
                      <Check className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Semester Dropdown */}
          <div className="space-y-1" ref={semesterDropdownRef}>
            <Label className="text-xs font-medium text-gray-700">
              Semester
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-gray-500" />
                  <span className="flex-1 text-left">
                    {newUser.semester || "Select Semester"}
                  </span>
                </div>
                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isSemesterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSemesterDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {semesterOptions.map((sem) => (
                    <div
                      key={sem}
                      className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                        newUser.semester === sem ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setNewUser({ ...newUser, semester: sem })
                        setIsSemesterDropdownOpen(false)
                      }}
                    >
                      <BookOpen className="h-3 w-3 text-blue-500" />
                      <span className="flex-1">Semester {sem}</span>
                      {newUser.semester === sem && (
                        <Check className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Year Dropdown */}
          <div className="space-y-1" ref={yearDropdownRef}>
            <Label className="text-xs font-medium text-gray-700">
              Year
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="flex-1 text-left">
                    {newUser.year || "Select Year"}
                  </span>
                </div>
                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isYearDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {yearOptions.map((year) => (
                    <div
                      key={year}
                      className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                        newUser.year === year ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setNewUser({ ...newUser, year })
                        setIsYearDropdownOpen(false)
                      }}
                    >
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <span className="flex-1">{year}</span>
                      {newUser.year === year && (
                        <Check className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Batch Dropdown */}
        <div className="space-y-1" ref={batchDropdownRef}>
          <Label className="text-xs font-medium text-gray-700">
            Batch
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
              className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-gray-500" />
                <span className="flex-1 text-left">
                  {newUser.batch || "Select Batch"}
                </span>
              </div>
              <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isBatchDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBatchDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {batchOptions.map((batch) => (
                  <div
                    key={batch}
                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                      newUser.batch === batch ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => {
                      setNewUser({ ...newUser, batch })
                      setIsBatchDropdownOpen(false)
                    }}
                  >
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="flex-1">{batch}</span>
                    {newUser.batch === batch && (
                      <Check className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Render college-specific filters
  const renderCollegeFilters = () => {
    if (basedOn !== 'college') return null;

    return (
      <>
        {/* Degree Filter */}
        <div className="w-full">
          <Label className="text-xs font-medium text-gray-700 mb-1">Degree</Label>
          <Select
            value={selectedDegree}
            onValueChange={(value) => {
              setSelectedDegree(value)
            }}
          >
            <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
              <SelectValue placeholder="All Degrees" />
            </SelectTrigger>
            <SelectContent className="text-xs cursor-pointer">
              <SelectItem value="all">All Degrees</SelectItem>
              {degreeOptions.map((degree) => (
                <SelectItem key={degree} value={degree}>
                  {degree}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter */}
        <div className="w-full">
          <Label className="text-xs font-medium text-gray-700 mb-1">Department</Label>
          <Select
            value={selectedDepartment}
            onValueChange={(value) => {
              setSelectedDepartment(value)
            }}
          >
            <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="text-xs cursor-pointer">
              <SelectItem value="all">All Departments</SelectItem>
              {departmentOptions.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Filter */}
        <div className="w-full">
          <Label className="text-xs font-medium text-gray-700 mb-1">Year</Label>
          <Select
            value={selectedYear}
            onValueChange={(value) => {
              setSelectedYear(value)
            }}
          >
            <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent className="text-xs cursor-pointer">
              <SelectItem value="all">All Years</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-1">
        <div className="mx-auto">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-2"
          >
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/lms/pages/admindashboard" className="text-xs sm:text-sm text-gray-600 hover:text-indigo-600">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-gray-400" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs sm:text-sm font-medium text-indigo-600">User Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StatusCards users={allUsers} />
          </motion.div>

          {/* Main Header with Search, Filter Toggle, and Add Button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4"
          >
            {/* Search Input */}
            <div className="flex items-center w-full md:w-96">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder={
                    basedOn === 'college' 
                      ? "Search name, email, degree, department..." 
                      : "Search name or email..."
                  }
                  className="w-full pl-10 h-9 shadow-none"
                  style={{ fontSize: "13px" }}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                  }}
                />
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Filter Toggle Button */}
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={hasActiveFilters() ? "default" : "outline"}
                className={`h-9 gap-2 text-xs ${hasActiveFilters() ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                <Filter className="h-3.5 w-3.5" />
                {hasActiveFilters() ? (
                  <span className="hidden sm:inline">Filters ({getBadgeData().length})</span>
                ) : (
                  <span className="hidden sm:inline">Filters</span>
                )}
              </Button>

              {/* Bulk Permission Button - only show if user has permission */}
              {canBulkPermission && (
                <Button
                  onClick={() => setShowBulkPermissionModal(true)}
                  variant="outline"
                  className="h-9 gap-2 text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Bulk Permission</span>
                </Button>
              )}

              {/* Add User Button - only show if user has permission */}
              {canAddUser && (
                <Button
                  onClick={handleAddUserClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add User</span>
                </Button>
              )}
            </div>
          </motion.div>

          {/* Active Filter Badges */}
          {hasActiveFilters() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">Active Filters:</span>
                  {getBadgeData().map(badge => (
                    <Badge
                      key={badge.label}
                      variant="secondary"
                      className="flex items-center gap-1 text-xs"
                    >
                      {badge.label}: {badge.value}
                      <button
                        onClick={() => {
                          if (badge.label.startsWith('Degree:')) {
                            setSelectedDegree("")
                          } else if (badge.label.startsWith('Dept:')) {
                            setSelectedDepartment("")
                          } else if (badge.label.startsWith('Year:')) {
                            setSelectedYear("")
                          } else if (badge.label === 'Active' || badge.label === 'Inactive') {
                            setSelectedStatus("")
                          } else {
                            // Remove role from selectedRoles
                            const roleToRemove = roles.find(r => r.renameRole === badge.label)
                            if (roleToRemove) {
                              setSelectedRoles(prev => prev.filter(id => id !== roleToRemove._id))
                            }
                          }
                        }}
                        className="ml-1 hover:text-red-600"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Button
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-gray-600 hover:text-red-600"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </motion.div>
          )}

          {/* Expandable Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Filter Users</h3>
                    <Button
                      onClick={() => setShowFilters(false)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Role Filter */}
                    <div className="w-full">
                      <Label className="text-xs font-medium text-gray-700 mb-1">Role</Label>
                      <div className="w-full">
                        <MultiSelect
                          options={dynamicRoleOptions}
                          selected={selectedRoles}
                          onChange={setSelectedRoles}
                          placeholder="All Roles"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="w-full">
                      <Label className="text-xs font-medium text-gray-700 mb-1">Status</Label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(value) => {
                          setSelectedStatus(value)
                        }}
                      >
                        <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent className="text-xs cursor-pointer">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* College-specific filters */}
                    {renderCollegeFilters()}
                  </div>

                  {/* Filter Actions */}
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button
                      onClick={clearAllFilters}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                    >
                      Clear Filters
                    </Button>
                    <Button
                      onClick={() => setShowFilters(false)}
                      variant="default"
                      size="sm"
                      className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Table */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="overflow-x-auto"
            id="table-container"
          >
            <UserTable
              users={currentUsers}
              isLoading={isLoading || isLoadingUsers || isFetching}
              columns={columns}
              pagination={{
                currentPage: currentPage,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalUsers,
                itemsPerPage: usersPerPage,
                onPageChange: (page) => setCurrentPage(page),
              }}
            />
          </motion.div>

          {/* Add User Modal - Only show if user has permission */}
          {canAddUser && (
            <AnimatePresence>
              {showAddUserModal && (
                <Dialog open={showAddUserModal} onOpenChange={(open) => {
                  if (!open) {
                    setNewUser({
                      id: "", 
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                      password: "",
                      role: "Student",
                      roleId: "",
                      status: "active",
                      gender: "Male",
                      degree: "",
                      department: "",
                      semester: "",
                      year: "",
                      batch: "",
                    })
                    // Reset all dropdown states when modal closes
                    setIsRoleDropdownOpen(false)
                    setIsGenderDropdownOpen(false)
                    setIsStatusDropdownOpen(false)
                    setIsDegreeDropdownOpen(false)
                    setIsDepartmentDropdownOpen(false)
                    setIsSemesterDropdownOpen(false)
                    setIsYearDropdownOpen(false)
                    setIsBatchDropdownOpen(false)
                  }
                  setShowAddUserModal(open)
                }}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50"
                  >
                    <motion.div
                      ref={modalRef}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="max-w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[40vw] xl:w-[40vw] mx-auto max-h-[93vh] flex flex-col bg-white rounded-md shadow-lg overflow-hidden"
                    >
                      {/* Fixed Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-200 rounded flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-gray-700" />
                          </div>
                          <h2 className="text-sm font-medium text-gray-900">
                            {newUser.id ? "Edit User" : "New User"}
                            {basedOn === 'college' && " (College)"}
                            {basedOn === 'skilling' && " (Skilling)"}
                          </h2>
                        </div>
                        <button
                          onClick={() => setShowAddUserModal(false)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto px-4 py-2">
                        <p className="text-xs text-gray-600 mb-3">
                          Required fields are marked with an asterisk <span className="text-red-500">*</span>
                        </p>

                        <form onSubmit={handleAddUserSubmit} className="space-y-2">
                          {/* Custom Roles Dropdown */}
                          <div className="space-y-1" ref={roleDropdownRef}>
                            <Label className="text-xs font-medium text-gray-700">
                              Role Assignment <span className="text-red-500">*</span>
                            </Label>
                            
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-3 w-3 text-gray-500" />
                                  <span className="flex-1 text-left">
                                    {roles.find(role => role._id === newUser.roleId)?.renameRole || "Select Role"}
                                  </span>
                                </div>
                                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {isRoleDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                  {isLoadingRoles ? (
                                    <div className="flex items-center justify-center py-2 px-3">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="ml-2 text-xs">Loading roles...</span>
                                    </div>
                                  ) : roles.length > 0 ? (
                                    roles.map((role) => (
                                      <div
                                        key={role._id}
                                        className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                                          newUser.roleId === role._id ? 'bg-blue-50 text-blue-700' : ''
                                        }`}
                                        onClick={() => {
                                          setNewUser({ 
                                            ...newUser, 
                                            roleId: role._id,
                                            role: role.renameRole 
                                          })
                                          setIsRoleDropdownOpen(false)
                                        }}
                                      >
                                        <ShieldCheck className="h-3 w-3 text-blue-500" />
                                        <div className="flex-1">
                                          <div className="font-medium">{role.renameRole}</div>
                                          <div className="text-gray-500">{role.originalRole}</div>
                                        </div>
                                        {newUser.roleId === role._id && (
                                          <Check className="h-3 w-3 text-blue-500" />
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-500 py-2 px-3 text-center">
                                      No roles available
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-500">
                              Select a role from your institution's custom roles
                            </p>
                          </div>

                          {/* Name - First and Last in same row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                name="firstName"
                                type="text"
                                value={newUser.firstName}
                                placeholder="First Name"
                                onChange={handleInputChange}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Last Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                name="lastName"
                                type="text"
                                value={newUser.lastName}
                                placeholder="Last Name"
                                onChange={handleInputChange}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                          </div>

                          {/* Email */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="email"
                              type="email"
                              value={newUser.email}
                              placeholder="Enter Email Address"
                              onChange={handleInputChange}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>

                          {/* Phone */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="phone"
                              type="tel"
                              value={newUser.phone}
                              placeholder="Enter phone number"
                              onChange={handleInputChange}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>

                          {/* Custom Gender Dropdown */}
                          <div className="space-y-1" ref={genderDropdownRef}>
                            <Label className="text-xs font-medium text-gray-700">
                              Gender <span className="text-red-500">*</span>
                            </Label>
                            
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                                className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <div className="flex items-center gap-2">
                                  {newUser.gender === "Male" && (
                                    <span className="text-blue-500 text-sm">♂</span>
                                  )}
                                  {newUser.gender === "Female" && (
                                    <span className="text-pink-500 text-sm">♀</span>
                                  )}
                                  <span className="capitalize flex-1 text-left">
                                    {newUser.gender}
                                  </span>
                                </div>
                                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isGenderDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {isGenderDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                  <div
                                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                                      newUser.gender === "Male" ? 'bg-blue-50 text-blue-700' : ''
                                    }`}
                                    onClick={() => {
                                      setNewUser({ ...newUser, gender: "Male" as "Male" | "Female" })
                                      setIsGenderDropdownOpen(false)
                                    }}
                                  >
                                    <span className="text-blue-500">♂</span>
                                    <span className="flex-1">Male</span>
                                    {newUser.gender === "Male" && (
                                      <Check className="h-3 w-3 text-blue-500" />
                                    )}
                                  </div>
                                  <div
                                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                                      newUser.gender === "Female" ? 'bg-blue-50 text-blue-700' : ''
                                    }`}
                                    onClick={() => {
                                      setNewUser({ ...newUser, gender: "Female" as "Male" | "Female" })
                                      setIsGenderDropdownOpen(false)
                                    }}
                                  >
                                    <span className="text-pink-500">♀</span>
                                    <span className="flex-1">Female</span>
                                    {newUser.gender === "Female" && (
                                      <Check className="h-3 w-3 text-blue-500" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* College-specific fields */}
                          {renderCollegeFields()}

                          {/* Password */}
                          {!newUser.id && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Password
                              </label>
                              <div className="relative">
                                <input
                                  name="password"
                                  type="password"
                                  value={newUser.password}
                                  onChange={handleInputChange}
                                  className="w-full px-2 py-1.5 pr-10 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Enter password..."
                                />
                              </div>
                            </div>
                          )}

                          {/* Custom Status Dropdown */}
                          {!newUser.id && (
                            <div className="space-y-1" ref={statusDropdownRef}>
                              <Label className="text-xs font-medium text-gray-700">
                                Status
                              </Label>
                              
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                  className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full ${newUser.status === "active" ? "bg-green-500" : "bg-red-500"
                                        }`}
                                    />
                                    <span className="capitalize flex-1 text-left">
                                      {newUser.status === "active" ? "Active" : "Inactive"}
                                    </span>
                                  </div>
                                  <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isStatusDropdownOpen && (
                                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                    <div
                                      className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                                        newUser.status === "active" ? 'bg-blue-50 text-blue-700' : ''
                                      }`}
                                      onClick={() => {
                                        setNewUser({ ...newUser, status: "active" as "active" | "inactive" })
                                        setIsStatusDropdownOpen(false)
                                      }}
                                    >
                                      <span className="w-2 h-2 rounded-full bg-green-500" />
                                      <span className="flex-1">Active</span>
                                      {newUser.status === "active" && (
                                        <Check className="h-3 w-3 text-blue-500" />
                                      )}
                                    </div>
                                    <div
                                      className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${
                                        newUser.status === "inactive" ? 'bg-blue-50 text-blue-700' : ''
                                      }`}
                                      onClick={() => {
                                        setNewUser({ ...newUser, status: "inactive" as "active" | "inactive" })
                                        setIsStatusDropdownOpen(false)
                                      }}
                                    >
                                      <span className="w-2 h-2 rounded-full bg-red-500" />
                                      <span className="flex-1">Inactive</span>
                                      {newUser.status === "inactive" && (
                                        <Check className="h-3 w-3 text-blue-500" />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </form>
                      </div>

                      {/* Fixed Footer */}
                      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex justify-end gap-3">
                        <div className="flex items-center gap-2">
                          {canBulkUpload && (
                            <Button
                              onClick={() => {
                                setShowAddUserModal(false)
                                setShowBulkUploadModal(true)
                              }}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-xs"
                            >
                              <Upload className="h-3 w-3" />
                              Bulk Upload
                            </Button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddUserModal(false)}
                          className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-500 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          onClick={handleAddUserSubmit}
                          disabled={isLoading || !newUser.roleId}
                          className={`px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium flex items-center gap-1 ${isLoading || !newUser.roleId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isLoading ? (
                            <>
                              <Send className="h-3 w-3 animate-spin inline" />
                              {newUser.id ? "Updating..." : "Creating..."}
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3 inline" />
                              {newUser.id ? "Update" : "Create"}
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                </Dialog>
              )}
            </AnimatePresence>
          )}

          {/* Success Modal */}
          <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      {newUser.id ? "User Updated Successfully" : "User Created Successfully"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      {newUser.id
                        ? "The user account has been updated successfully."
                        : "The user account has been created and is ready to use."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>User ID:</strong> {newUserId}
                </p>
                {basedOn === 'college' && (
                  <>
                    {newUser.degree && <p className="text-sm text-gray-700"><strong>Degree:</strong> {newUser.degree}</p>}
                    {newUser.department && <p className="text-sm text-gray-700"><strong>Department:</strong> {newUser.department}</p>}
                    {newUser.batch && <p className="text-sm text-gray-700"><strong>Batch:</strong> {newUser.batch}</p>}
                  </>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  The user will receive login credentials via email.
                </p>
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  onClick={configurePermissionsForNewUser}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 mb-2 sm:mb-0"
                >
                  Configure Permissions
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Permissions Modal */}
         {showPermissionModal && selectedUserForPermission && (
  <PermissionModal
    isOpen={showPermissionModal}
    onClose={() => {
      setShowPermissionModal(false)
      setSelectedUserForPermission(null)
    }}
    userId={selectedUserForPermission.id}
    userName={`${selectedUserForPermission.firstName} ${selectedUserForPermission.lastName}`}
    userEmail={selectedUserForPermission.email}
  />
)}
          
          {/* Bulk Upload Modal - only show if user has permission */}
          {canBulkUpload && (
            <BulkUploadModal
              isOpen={showBulkUploadModal}
              onClose={() => setShowBulkUploadModal(false)}
              onSuccess={(data:any) => {
                // Refresh the user list
                queryClient.invalidateQueries({ queryKey: ['users'] })
                // Show success message
                toast.success(`Successfully created ${data.summary?.successfullyCreated || 0} users`)
              }}
            />
          )}
          
         {/* Bulk Permission Modal - only show if user has permission */}
         {canBulkPermission && showBulkPermissionModal && (
  <BulkPermissionModal
    isOpen={showBulkPermissionModal}
    onClose={() => {
      setShowBulkPermissionModal(false);
      setSelectedUserForBulkPermissions(null); // Reset when closing
    }}
    availableUsers={allUsers}
    roles={roles}
    basedOn={basedOn}
    // Optional: Pass the pre-selected user if you want to auto-select them
    preSelectedUser={selectedUserForBulkPermissions}
  />
)}

          {/* Delete Confirmation Modal */}
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">Confirm Deletion</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Are you sure you want to delete this user? This action cannot be undone.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>User:</strong> {userToDelete?.firstName} {userToDelete?.lastName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Email: {userToDelete?.email}
                </p>
                {basedOn === 'college' && userToDelete?.degree && (
                  <p className="text-xs text-gray-500">
                    {userToDelete.degree} • {userToDelete.department} • {userToDelete.batch}
                  </p>
                )}
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full sm:w-auto"
                  disabled={deleteUserMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 mb-2 sm:mb-0"
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Details Modal */}
          <Dialog open={showViewDetailsModal} onOpenChange={setShowViewDetailsModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      User Details - {selectedUserForDetails?.firstName} {selectedUserForDetails?.lastName}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Complete information for this user account
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              {selectedUserForDetails && (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Full Name</p>
                        <p className="text-sm text-gray-900">{selectedUserForDetails.firstName} {selectedUserForDetails.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Email Address</p>
                        <p className="text-sm text-gray-900">{selectedUserForDetails.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Phone Number</p>
                        <p className="text-sm text-gray-900">{selectedUserForDetails.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Gender</p>
                        <p className="text-sm text-gray-900 capitalize">{selectedUserForDetails.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Role</p>
                        <Badge className={`${selectedUserForDetails.role.toLowerCase().includes('lms') ? 'bg-purple-100 text-purple-800' :
                          selectedUserForDetails.role.toLowerCase().includes('manager') ? 'bg-blue-100 text-blue-800' :
                          selectedUserForDetails.role.toLowerCase().includes('coordinator') ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                          } px-2 py-0.5 rounded-full text-xs`}>
                          {selectedUserForDetails.role}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Status</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selectedUserForDetails.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={`text-sm font-medium ${selectedUserForDetails.status === "active" ? "text-green-600" : "text-red-600"}`}>
                            {selectedUserForDetails.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      {selectedUserForDetails.lastLogin && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Last Login</p>
                          <p className="text-sm text-gray-900">{selectedUserForDetails.lastLogin}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* College Information (if applicable) */}
                  {basedOn === 'college' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        College Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUserForDetails.degree && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">Degree</p>
                            <p className="text-sm text-gray-900">{selectedUserForDetails.degree}</p>
                          </div>
                        )}
                        {selectedUserForDetails.department && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">Department</p>
                            <p className="text-sm text-gray-900">{selectedUserForDetails.department}</p>
                          </div>
                        )}
                        {selectedUserForDetails.year && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">Year</p>
                            <p className="text-sm text-gray-900">{selectedUserForDetails.year}</p>
                          </div>
                        )}
                        {selectedUserForDetails.semester && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">Semester</p>
                            <p className="text-sm text-gray-900">Semester {selectedUserForDetails.semester}</p>
                          </div>
                        )}
                        {selectedUserForDetails.batch && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">Batch</p>
                            <p className="text-sm text-gray-900">{selectedUserForDetails.batch}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                
                
                </div>
              )}
              
              <DialogFooter>
                <Button
                  onClick={() => setShowViewDetailsModal(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  )
}