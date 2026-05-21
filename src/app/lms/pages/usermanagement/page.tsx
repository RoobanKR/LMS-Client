"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Loader2,
  Briefcase,
  UserCheck,
  Handshake,
  ClipboardList,
  ShieldCheck,
  GraduationCap,
  Filter,
  KeyRound,
  Eye,
  Copy,
  MoreVertical,
  UserX,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "../../component/layout";
import { StaffLayout } from "../../component/stafflayout/staff-layout";
import { StatusCards } from "../../component/StatusCards";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addUser, deleteUser, fetchUsers, toggleUserStatus, updateUser } from "@/apiServices/userService";
import { Switch } from "@/components/ui/switch";
import { fetchRoles } from "@/apiServices/rolesApi";
import { userPermission } from "@/apiServices/tokenVerify";

// Import local components
import { UserTable } from "./components/UserTable";
import { UserModals } from "./components/UserModals";
import { UserFiltersSection } from "./components/UserFiltersSection";
import { User, Role, UserFormData, ApiPermission, Column } from "./components/types";

// Permission utility functions
const hasPermission = (permissions: ApiPermission[], permissionKey: string, functionality?: string): boolean => {
  const permission = permissions.find(p => p.permissionKey === permissionKey);
  if (!permission || !permission.isActive) return false;
  if (functionality) {
    return permission.permissionFunctionality.some(func => func.trim() === functionality.trim());
  }
  return true;
};

const getPermission = (permissions: ApiPermission[], permissionKey: string): ApiPermission | undefined => {
  return permissions.find(p => p.permissionKey === permissionKey && p.isActive);
};

function getRoleIcon(roleName: string) {
  const lowerRole = roleName.toLowerCase();
  if (lowerRole.includes('lms')) return ShieldCheck;
  if (lowerRole.includes('manager')) return Briefcase;
  if (lowerRole.includes('hr')) return UserCheck;
  if (lowerRole.includes('poc')) return Handshake;
  if (lowerRole.includes('coordinator')) return ClipboardList;
  if (lowerRole.includes('student')) return GraduationCap;
  return ShieldCheck;
}

function getRoleColor(roleName: string) {
  const lowerRole = roleName.toLowerCase();
  if (lowerRole.includes('lms')) return "text-blue-500 dark:text-blue-400";
  if (lowerRole.includes('manager')) return "text-green-500 dark:text-green-400";
  if (lowerRole.includes('hr')) return "text-pink-500 dark:text-pink-400";
  if (lowerRole.includes('poc')) return "text-yellow-500 dark:text-yellow-400";
  if (lowerRole.includes('coordinator')) return "text-orange-500 dark:text-orange-400";
  if (lowerRole.includes('student')) return "text-purple-500 dark:text-purple-400";
  return "text-gray-500 dark:text-gray-400";
}

// Custom Dropdown Component
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
  user, onEdit, onPermissions, onDelete, onViewDetails, onToggleStatus, onDuplicate, userPermissions
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const canEditUser = hasPermission(userPermissions, 'usermanagement', 'Edit');
  const canAssignPermissions = hasPermission(userPermissions, 'usermanagement', 'Permissions');
  const canToggleStatus = hasPermission(userPermissions, 'usermanagement', 'Toggle User Status');
  const canDeleteUser = hasPermission(userPermissions, 'usermanagement', 'Delete');
  const canDuplicateUser = hasPermission(userPermissions, 'usermanagement', 'Duplicate User');
  const canViewDetails = hasPermission(userPermissions, 'usermanagement', 'View Full Details');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    switch (action) {
      case 'view': onViewDetails?.(user); break;
      case 'edit': onEdit(user); break;
      case 'permissions': onPermissions(user); break;
      case 'toggle': onToggleStatus?.(user); break;
      case 'duplicate': onDuplicate?.(user); break;
      case 'delete': onDelete(user); break;
    }
  };
  
  const userPermission = getPermission(userPermissions, 'usermanagement');
  const hasUserManagementAccess = userPermission?.isActive || false;

  if (!hasUserManagementAccess) {
    return (
      <button className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed" disabled>
        <MoreVertical className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200 group"
      >
        <MoreVertical className="h-3 w-3 text-gray-600 dark:text-gray-400" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
          >
            {canViewDetails && onViewDetails && (
              <>
                <button onClick={() => handleAction('view')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left">
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  View Details
                </button>
                {(canEditUser || canAssignPermissions || canToggleStatus || canDuplicateUser || canDeleteUser) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                )}
              </>
            )}
            {canEditUser && (
              <button onClick={() => handleAction('edit')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left">
                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Edit User
              </button>
            )}
            {canAssignPermissions && (
              <button onClick={() => handleAction('permissions')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left">
                <KeyRound className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Assign Permissions
              </button>
            )}
            {canToggleStatus && (
              <button onClick={() => handleAction('toggle')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left">
                {user.status === 'active' ? (
                  <><UserX className="h-4 w-4 text-orange-600 dark:text-orange-400" /> Deactivate User</>
                ) : (
                  <><UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" /> Activate User</>
                )}
              </button>
            )}
            {canDuplicateUser && (
              <button onClick={() => handleAction('duplicate')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left">
                <Copy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Duplicate
              </button>
            )}
            {(canEditUser || canAssignPermissions || canToggleStatus || canDuplicateUser) && canDeleteUser && (
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            )}
            {canDeleteUser && (
              <button onClick={() => handleAction('delete')} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left">
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Constants
const degreeOptions = ["B.Tech", "B.E", "B.Sc", "B.Com", "B.A", "M.Tech", "M.Sc", "MBA", "PhD"];
const departmentOptions = ["Computer Science", "Electrical", "Mechanical", "Civil", "Electronics", "Information Technology", "Mathematics", "Physics", "Chemistry"];
const semesterOptions = ["1", "2", "3", "4", "5", "6", "7", "8"];
const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const batchOptions = ["2021-2025", "2022-2026", "2023-2027", "2024-2028", "2025-2029"];

export default function UserManagementPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUserId, setNewUserId] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const [token, setToken] = useState<string | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [basedOn, setBasedOn] = useState<string | null>(null);
  const [allUser, setAllUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<ApiPermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [canAddUser, setCanAddUser] = useState(false);
  const [canBulkUpload, setCanBulkUpload] = useState(false);
  const [canBulkPermission, setCanBulkPermission] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUserForPermission, setSelectedUserForPermission] = useState<User | null>(null);
  const [showBulkPermissionModal, setShowBulkPermissionModal] = useState(false);
  const [selectedUserForBulkPermissions, setSelectedUserForBulkPermissions] = useState<User | null>(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDegree, setSelectedDegree] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const [newUser, setNewUser] = useState<UserFormData>({
    id: "", firstName: "", lastName: "", email: "", phone: "", password: "",
    role: "Student", roleId: "", status: "active", gender: "Male",
    degree: "", department: "", semester: "", year: "", batch: "",
  });

  const usersPerPage = 5;
  const queryClient = useQueryClient();
  const [dataVersion, setDataVersion] = useState(0);

  // Fetch user role and permissions
  useEffect(() => {
    const role = localStorage.getItem('smartcliff_roleValue');
    setUserRole(role);
    
    const fetchUserPermissions = async () => {
      try {
        setIsLoadingPermissions(true);
        const response = await userPermission();
        if (response.valid && response.user && response.user.permissions) {
          setUserPermissions(response.user.permissions);
          setCanAddUser(hasPermission(response.user.permissions, 'usermanagement', 'Add User'));
          setCanBulkUpload(hasPermission(response.user.permissions, 'usermanagement', 'Bulk Upload'));
          setCanBulkPermission(hasPermission(response.user.permissions, 'usermanagement', 'Bulk Permission'));
        }
      } catch (error) {
        console.error('Failed to fetch user permissions:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    fetchUserPermissions();
  }, []);

  // Get token and institution info
  useEffect(() => {
    setToken(localStorage.getItem('smartcliff_token'));
    setInstitutionId(localStorage.getItem('smartcliff_institution'));
    setBasedOn(localStorage.getItem('smartcliff_basedOn'));
  }, []);

  // Data update listener
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      setDataVersion(event.detail.version);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };
    window.addEventListener('usersDataUpdated', handleDataUpdate as EventListener);
    return () => window.removeEventListener('usersDataUpdated', handleDataUpdate as EventListener);
  }, [queryClient]);

  // Fetch roles
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles', token],
    queryFn: async () => {
      if (!token) return [];
      const result = await fetchRoles(token);
      return result.roles || [];
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (rolesData && Array.isArray(rolesData)) setRoles(rolesData);
  }, [rolesData]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedRoles, selectedStatus, selectedDegree, selectedDepartment, selectedYear]);

  // Fetch users
  const { data: usersData, isLoading: isLoadingUsers, isFetching, refetch } = useQuery({
    queryKey: ['users', institutionId, token, basedOn, currentPage, debouncedSearchTerm, selectedRoles, selectedStatus, selectedDegree, selectedDepartment, selectedYear, dataVersion],
    queryFn: async () => {
      if (!token || !institutionId || !basedOn) return { users: [], allUsers: [], pagination: { currentPage: 1, totalPages: 1, totalUsers: 0, hasNextPage: false, hasPrevPage: false } };
      const allUsers = await fetchUsers(institutionId, token, basedOn);
      const transformedUsers: User[] = (allUsers.users || []).map((user: any) => ({
        id: user._id || user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        gender: user.gender,
        email: user.email,
        phone: user.phone || '',
        role: user.role?.renameRole || (typeof user.role === 'string' ? user.role : 'Unknown Role'),
        roleId: user.role?._id || user.role,
        status: user.status || 'active',
        lastLogin: user.lastLogin || '',
        degree: user.degree || '',
        department: user.department || '',
        semester: user.semester || '',
        year: user.year || '',
        batch: user.batch || '',
      }));
      
      const filteredUsers = transformedUsers.filter(user => {
        const matchesSearch = !debouncedSearchTerm ||
          user.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesRoles = selectedRoles.length === 0 || selectedRoles.includes(user.roleId);
        const matchesStatus = !selectedStatus || selectedStatus === "all" || user.status === selectedStatus;
        const matchesDegree = !selectedDegree || selectedDegree === "all" || user.degree === selectedDegree;
        const matchesDepartment = !selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment;
        const matchesYear = !selectedYear || selectedYear === "all" || user.year === selectedYear;
        return matchesSearch && matchesRoles && matchesStatus && matchesDegree && matchesDepartment && matchesYear;
      });
      
      setAllUsers(transformedUsers);
      const startIndex = (currentPage - 1) * usersPerPage;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);
      return {
        users: paginatedUsers,
        allUsers: transformedUsers,
        pagination: {
          currentPage,
          totalPages: Math.ceil(filteredUsers.length / usersPerPage),
          totalUsers: filteredUsers.length,
          hasNextPage: currentPage < Math.ceil(filteredUsers.length / usersPerPage),
          hasPrevPage: currentPage > 1
        }
      };
    },
    enabled: !!token && !!institutionId && !!basedOn,
  });

  // Mutations
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => addUser(userData, token!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUserId(data.user._id);
      setShowAddUserModal(false);
      setShowSuccessModal(true);
      resetForm();
      toast.success("User added successfully");
    },
    onError: () => toast.error("Failed to add user"),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => updateUser(userId, userData, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddUserModal(false);
      setShowSuccessModal(true);
      resetForm();
      toast.success("User updated successfully");
    },
    onError: () => toast.error("Failed to update user"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => deleteUser(userId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteModal(false);
      toast.success("User deleted successfully");
    },
    onError: () => toast.error("Failed to delete user"),
  });

  const resetForm = () => {
    setNewUser({
      id: "", firstName: "", lastName: "", email: "", phone: "", password: "",
      role: "Student", roleId: "", status: "active", gender: "Male",
      degree: "", department: "", semester: "", year: "", batch: "",
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.roleId) {
      toast.error("Please select a role");
      return;
    }
    const userData: any = {
      email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName,
      phone: newUser.phone, role: newUser.roleId, gender: newUser.gender,
      status: newUser.status, ...(newUser.password && { password: newUser.password }),
    };
    if (basedOn === 'college') {
      if (newUser.degree) userData.degree = newUser.degree;
      if (newUser.department) userData.department = newUser.department;
      if (newUser.semester) userData.semester = newUser.semester;
      if (newUser.year) userData.year = newUser.year;
      if (newUser.batch) userData.batch = newUser.batch;
    }
    if (newUser.id) {
      await updateUserMutation.mutateAsync({ userId: newUser.id, userData });
    } else {
      await addUserMutation.mutateAsync(userData);
    }
  };

  const handleEdit = (user: User) => {
    setNewUser({
      id: user.id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, password: "",
      role: user.role, roleId: user.roleId, status: user.status,
      gender: user.gender as "Male" | "Female",
      degree: user.degree || "", department: user.department || "",
      semester: user.semester || "", year: user.year || "", batch: user.batch || "",
    });
    setShowAddUserModal(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (userToDelete) deleteUserMutation.mutate(userToDelete.id);
  };

  const toggleStatus = async (userId: string, newStatus: "active" | "inactive") => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [userId]: true }));
      await toggleUserStatus(userId, newStatus, token || undefined);
      toast.success(`Status changed to ${newStatus}`);
      await refetch();
    } catch (error) {
      toast.error("Failed to update user status");
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAddUserClick = () => {
    resetForm();
    setShowAddUserModal(true);
  };

  const handlePermissionsClick = (user: User) => {
    setSelectedUserForPermission(user);
    setShowPermissionModal(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUserForDetails(user);
    setShowViewDetailsModal(true);
  };

  const handleToggleStatus = (user: User) => {
    toggleStatus(user.id, user.status === "active" ? "inactive" : "active");
  };

  const handleDuplicateUser = (user: User) => {
    const duplicateEmail = user.email.replace(/@/, `+copy@`);
    setNewUser({
      id: "", firstName: user.firstName + " (Copy)", lastName: user.lastName,
      email: duplicateEmail, phone: user.phone, password: "",
      role: user.role, roleId: user.roleId, status: "active",
      gender: user.gender as "Male" | "Female",
      degree: user.degree || "", department: user.department || "",
      semester: user.semester || "", year: user.year || "", batch: user.batch || "",
    });
    setShowAddUserModal(true);
  };

  const clearAllFilters = () => {
    setSelectedRoles([]);
    setSelectedStatus("");
    setSelectedDegree("");
    setSelectedDepartment("");
    setSelectedYear("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return selectedRoles.length > 0 || selectedStatus !== "" || 
           selectedDegree !== "" || selectedDepartment !== "" || 
           selectedYear !== "" || searchTerm !== "";
  };

  const dynamicRoleOptions = Array.from(new Map(roles.map(role => [role.renameRole, role])).values()).map(role => ({
    value: role.renameRole, label: role.renameRole, icon: getRoleIcon(role.renameRole), color: getRoleColor(role.renameRole)
  }));

  const currentUsers = usersData?.users || [];
  const pagination = usersData?.pagination || { currentPage: 1, totalPages: 1, totalUsers: 0, hasNextPage: false, hasPrevPage: false };

  const columns: Column<User>[] = [
    {
      key: 'name', label: 'Name', width: '25%', align: 'left',
      renderCell: (user: User) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <span className="text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm font-medium">
              {user.firstName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="ml-2">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</div>
            <div className="text-xxs text-gray-500 dark:text-gray-400">Gender: {user.gender}</div>
          </div>
        </div>
      )
    },
    { key: 'email', label: 'Email', width: '25%', align: 'center', renderCell: (user: User) => <span className="text-xs text-gray-700 dark:text-gray-300">{user.email}</span> },
    { key: 'phone', label: 'Phone', width: '15%', align: 'center', renderCell: (user: User) => <span className="text-xs text-gray-700 dark:text-gray-300">{user.phone}</span> },
    {
      key: 'role', label: 'Role', width: '15%', align: 'center',
      renderCell: (user: User) => {
        const roleLower = user.role.toLowerCase();
        let badgeClasses = "px-1.5 py-0.5 rounded-full text-xxs sm:text-xs";
        if (roleLower.includes('lms')) badgeClasses += " bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
        else if (roleLower.includes('manager')) badgeClasses += " bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        else if (roleLower.includes('coordinator')) badgeClasses += " bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
        else badgeClasses += " bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
        return <Badge className={badgeClasses}>{user.role}</Badge>;
      }
    },
    {
      key: 'status', label: 'Status', width: '10%', align: 'center',
      renderCell: (user: User) => {
        const canToggleStatus = hasPermission(userPermissions, 'usermanagement', 'Toggle User Status');
        return (
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400"}`} />
              <span className={`text-xs font-medium ${user.status === "active" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {user.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            {canToggleStatus && (
              <Switch
                checked={user.status === "active"}
                onCheckedChange={(checked) => toggleStatus(user.id, checked ? "active" : "inactive")}
                disabled={updatingStatus[user.id]}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
            )}
          </div>
        );
      }
    },
    {
      key: 'actions', label: 'Actions', width: '10%', align: 'center',
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
  ];

  if (isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading permissions...</p>
        </div>
      </div>
    );
  }

  const pageContent = (
    <div className="p-1 bg-white dark:bg-gray-950 min-h-screen">
      <div className="mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/lms/pages/admindashboard" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-gray-400 dark:text-gray-600" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400">User Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <StatusCards users={allUser} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div className="flex items-center w-full md:w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="search"
                placeholder={basedOn === 'college' ? "Search name, email, degree, department..." : "Search name or email..."}
                className="w-full pl-10 h-9 shadow-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button onClick={() => setShowFilters(!showFilters)} variant={hasActiveFilters() ? "default" : "outline"} className={`h-9 gap-2 text-xs ${hasActiveFilters() ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
              <Filter className="h-3.5 w-3.5" />
             
             <span>FILTER</span> {hasActiveFilters() && <span className="hidden sm:inline">Filters</span>}
            </Button>
            {canBulkPermission && (
              <Button onClick={() => setShowBulkPermissionModal(true)} variant="outline" className="h-9 gap-2 text-xs">
                <KeyRound className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bulk Permission</span>
              </Button>
            )}
            {canAddUser && (
              <Button onClick={handleAddUserClick} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add User</span>
              </Button>
            )}
          </div>
        </motion.div>

        <UserFiltersSection
          showFilters={showFilters}
          onClose={() => setShowFilters(false)}
          selectedRoles={selectedRoles}
          setSelectedRoles={setSelectedRoles}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedDegree={selectedDegree}
          setSelectedDegree={setSelectedDegree}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onClearFilters={clearAllFilters}
          dynamicRoleOptions={dynamicRoleOptions}
          basedOn={basedOn}
          degreeOptions={degreeOptions}
          departmentOptions={departmentOptions}
          yearOptions={yearOptions}
          hasActiveFilters={hasActiveFilters}
          allUsers={allUser}
          roles={roles}
          searchTerm={debouncedSearchTerm}
        />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <UserTable
            users={currentUsers}
            isLoading={isLoadingUsers || isFetching}
            columns={columns}
            pagination={{
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalUsers,
              itemsPerPage: usersPerPage,
              onPageChange: setCurrentPage,
            }}
          />
        </motion.div>


<UserModals
  showAddUserModal={showAddUserModal}
  setShowAddUserModal={setShowAddUserModal}
  showSuccessModal={showSuccessModal}
  setShowSuccessModal={setShowSuccessModal}
  showDeleteModal={showDeleteModal}
  setShowDeleteModal={setShowDeleteModal}
  showPermissionModal={showPermissionModal}
  setShowPermissionModal={setShowPermissionModal}
  showBulkUploadModal={showBulkUploadModal}
  setShowBulkUploadModal={setShowBulkUploadModal}
  showBulkPermissionModal={showBulkPermissionModal}
  setShowBulkPermissionModal={setShowBulkPermissionModal}
  showViewDetailsModal={showViewDetailsModal}
  setShowViewDetailsModal={setShowViewDetailsModal}
  newUser={newUser}
  setNewUser={setNewUser}
  newUserId={newUserId}
  userToDelete={userToDelete}
  selectedUserForPermission={selectedUserForPermission}
  setSelectedUserForPermission={setSelectedUserForPermission}  // ADD THIS LINE
  selectedUserForDetails={selectedUserForDetails}
  setSelectedUserForDetails={setSelectedUserForDetails}  // ADD THIS LINE
  selectedUserForBulkPermissions={selectedUserForBulkPermissions}
  setSelectedUserForBulkPermissions={setSelectedUserForBulkPermissions}
  roles={roles}
  isLoadingRoles={isLoadingRoles}
  basedOn={basedOn}
  userPermissions={userPermissions}
  allUsers={allUser}
  onAddUserSubmit={handleAddUserSubmit}
  onConfirmDelete={confirmDelete}
  onConfigurePermissions={() => {
    const user = usersData?.users.find(u => u.id === newUserId);
    if (user) {
      setSelectedUserForPermission(user);
      setShowSuccessModal(false);
      setShowPermissionModal(true);
    }
  }}
  isDeleting={deleteUserMutation.isPending}
  isEditing={!!newUser.id}
  canBulkUpload={canBulkUpload}
  canBulkPermission={canBulkPermission}
/>
      </div>
    </div>
  );

  if (userRole === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return userRole === 'admin' ? <DashboardLayout>{pageContent}</DashboardLayout> : <StaffLayout>{pageContent}</StaffLayout>;
}