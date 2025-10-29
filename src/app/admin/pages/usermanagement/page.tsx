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
} from "lucide-react"
import { ShieldCheck, PencilLine, GraduationCap } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
import DashboardLayoutProgramcoordinator from "@/app/programcoordinator/components/layout"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addUser, deleteUser, fetchUsers, toggleUserStatus, updateUser } from "@/apiServices/userService"
import { Switch } from "@/components/ui/switch"
import { UserTable } from "@/components/ui/alterationTable"


export interface User {
  id: string
  firstName: string
  lastName: string
  gender: string
  email: string
  phone: string
  role: string
  status: "active" | "inactive"
  lastLogin: string
}

interface ActionButtons {
  edit: (user: User) => void;
  permissions: (user: User) => void;
  delete: (user: User) => void;
}

interface Column<T> {
  key: string;
  label: string;
  width: string;
  align: "left" | "center" | "right";
  renderCell?: (row: T) => React.ReactNode;
}


interface Permission {
  create: boolean
  edit: boolean
  delete: boolean
  report: boolean
}

interface ModulePermissions {
  courseManagement: Permission
  userManagement: Permission
  testAccess: Permission
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalUsers: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function UserManagementPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUserId, setNewUserId] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("course-management")
  const [token, setToken] = useState<string | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [allUser, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    // Get token and institutionId from localStorage when component mounts
    const storedToken = localStorage.getItem('smartcliff_token');
    const storedInstitutionId = localStorage.getItem('smartcliff_institution');
    setToken(storedToken);
    setInstitutionId(storedInstitutionId);
  }, []);

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "Student",
    status: "active" as "active" | "inactive",
    gender: "Male" as "Male" | "Female",
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("")

  const usersPerPage = 5
  const queryClient = useQueryClient();
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      const { version } = event.detail;
      setDataVersion(version);
      // Invalidate and refetch to update UI with new data
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    window.addEventListener('usersDataUpdated', handleDataUpdate as EventListener);

    return () => {
      window.removeEventListener('usersDataUpdated', handleDataUpdate as EventListener);

    };
  }, [queryClient]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedRoles, selectedStatus])

  // Fetch users with pagination and filters
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['users', institutionId, token, currentPage, debouncedSearchTerm, selectedRoles, selectedStatus],
    queryFn: async () => {
      if (!token || !institutionId) return { users: [], pagination: { currentPage: 1, totalPages: 1, totalUsers: 0, hasNextPage: false, hasPrevPage: false } };
      // Fetch users with token
      const allUsers = await fetchUsers(institutionId, token);


      // Transform API data to match our User interface
      const transformedUsers: User[] = (allUsers.users || []).map((user: any) => ({
        id: user._id || user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        gender: user.gender,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status || 'active',
        lastLogin: user.lastLogin || ''
      }))

      // Apply client-side filtering
      const filteredUsers = transformedUsers.filter(user => {
        const matchesSearch = !debouncedSearchTerm ||
          user.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          user.phone.includes(debouncedSearchTerm)

        const matchesRoles = selectedRoles.length === 0 || selectedRoles.includes(user.role)
        const matchesStatus = !selectedStatus || selectedStatus === "all" || user.status === selectedStatus

        return matchesSearch && matchesRoles && matchesStatus
      })


      setAllUsers(transformedUsers);
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
      };
    },
    enabled: !!token && !!institutionId, // Only run query if token and institutionId are available
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    notifyOnChangeProps: ['data', 'error', 'isError', 'isLoading'],
  });
  const allUsers = usersData?.allUsers || [];
  // Add user mutation with token

  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!token) throw new Error("No token");
      return addUser(userData, token);
    },
    onSuccess: (data) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Handle success
      const addedUser: User = {
        id: data.user._id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        gender: data.user.gender,
        email: data.user.email,
        phone: newUser.phone,
        role: data.user.role,
        status: "active" as "active",
        lastLogin: ""
      };

      setNewUserId(addedUser.id);
      setShowAddUserModal(false);
      setShowSuccessModal(true);

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
        status: "active",
      });

      // Handle success/warning messages
      if (data.message) {
        data.message.forEach((msg: { key: string; value: any }) => {
          if (msg.key === 'success') {
            toast.success(msg.value);
          } else if (msg.key === 'warning') {
            toast.warn(msg.value);
          }
        });
      }
      else {
        toast.success("User added successfully");
      }
    },
    onError: (error) => {
      console.error('Error adding user:', error);

      let errorMessage = 'Failed to add user. Please try again.';

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: any } } };
        if (err.response?.data?.message) {
          const errorMessages = err.response.data.message;
          if (Array.isArray(errorMessages)) {
            errorMessages.forEach((msg: { value: string }) => {
              toast.error(msg.value);
            });
            return;
          } else {
            errorMessage = errorMessages;
          }
        }
      }

      toast.error(errorMessage);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string, userData: any }) => {
      if (!token) throw new Error("No token");
      return updateUser(userId, userData, token);
    },
    onSuccess: (data) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Handle success
      setShowAddUserModal(false);
      setShowSuccessModal(true);

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
        status: "active",
      });

      // Handle success/warning messages
      if (data.message) {
        data.message.forEach((msg: { key: string; value: any }) => {
          if (msg.key === 'success') {
            toast.success(msg.value);
          } else if (msg.key === 'warning') {
            toast.warn(msg.value);
          }
        });
      } else {
        toast.success("User updated successfully");
      }
    },
    onError: (error) => {
      console.error('Error updating user:', error);

      let errorMessage = 'Failed to update user. Please try again.';

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: any } } };
        if (err.response?.data?.message) {
          const errorMessages = err.response.data.message;
          if (Array.isArray(errorMessages)) {
            errorMessages.forEach((msg: { value: string }) => {
              toast.error(msg.value);
            });
            return;
          } else {
            errorMessage = errorMessages;
          }
        }
      }

      toast.error(errorMessage);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!token) throw new Error("No token");
      return deleteUser(userId, token);
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteModal(false);
      // Show success toast/notification
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
      let errorMessage = 'Failed to delete user. Please try again.';

      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: { data?: { message?: any } } };
        if (err.response?.data?.message) {
          const errorMessages = err.response.data.message;
          if (Array.isArray(errorMessages)) {
            errorMessage = errorMessages.map((msg: { value: string }) => msg.value).join(', ');
          } else {
            errorMessage = errorMessages;
          }
        }
      }

      toast.error(errorMessage);
    }
  });

  const toggleStatus = async (userId: string, newStatus: "active" | "inactive") => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [userId]: true }));
      // Optimistically update the UI immediately
      queryClient.setQueryData(
        ['users', token, currentPage, debouncedSearchTerm, selectedRoles, selectedStatus],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            users: oldData.users.map((user: User) =>
              user.id === userId ? { ...user, status: newStatus } : user
            )
          };
        }
      );

      // Call the API to update the status
      await toggleUserStatus(userId, newStatus, token || undefined);

      // Show toast notification
      toast.success(`Status changed to ${newStatus}`);

      // Optionally refetch to ensure data consistency
      await refetch();
    } catch (error) {
      console.error("Error updating status:", error);

      // Revert the optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['users'] });

      toast.error("Failed to update user status");
    }
    finally {
      setUpdatingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAddUserSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    const userData = {
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      role: newUser.role,
      gender: newUser.gender,
      status: newUser.status || "active",
      ...(newUser.password && { password: newUser.password }),
    };

    try {
      // await addUserMutation.mutateAsync(userData);
      if (newUser.id) {
        // Update existing user
        await updateUserMutation.mutateAsync({
          userId: newUser.id,
          userData
        });
      } else {
        // Create new user
        await addUserMutation.mutateAsync(userData);
      }
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
  };

  const isLoading = addUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending;

  // Handle actions
  const handleEdit = (user: User) => {
    setNewUser({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      password: "", // Don't pre-fill password for security
      role: user.role,
      status: user.status,
      gender: user.gender as "Male" | "Female",
    });
    setShowAddUserModal(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };


  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id, {
        onSuccess: () => {
          // Check if we just deleted the last user on the current page
          if (currentUsers.length === 1 && currentPage > 1) {
            // Move to previous page
            setCurrentPage(currentPage - 1);
          }
        }
      });
    }
  };


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsAddModalOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handlePermissionsClick = (user: User) => {
    setSelectedUser(user)
    setShowPermissionsModal(true)
  }

  const handleAddUserClick = () => {
    setNewUser({
      id: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      role: "Student",
      status: "active",
      gender: "Male",
    });
    setShowAddUserModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePermissionChange = (module: keyof ModulePermissions, permission: keyof Permission) => {
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
    // Find user by ID from the API data
    const user = usersData?.users.find(u => u.id === newUserId)
    if (user) {
      setSelectedUser(user)
      setShowSuccessModal(false)
      setShowPermissionsModal(true)
    }
  }

  const renderPermissionCheckboxes = (module: keyof ModulePermissions, moduleTitle: string) => {
    const permissions = modulePermissions[module]
    const permissionLabels = {
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      report: "Report"
    }

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">{moduleTitle} Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(permissionLabels).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`${module}-${key}`}
                checked={permissions[key as keyof Permission]}
                onChange={() => handlePermissionChange(module, key as keyof Permission)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor={`${module}-${key}`}
                className="text-xs font-medium text-gray-700"
              >
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>
    )
  }
  const getFilteredCount = (
    allUsers: User[],
    searchTerm: string,
    selectedRoles: string[],
    selectedStatus: string
  ): number => {
    return allUsers.filter(user => {
      const matchesSearch = !searchTerm ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)

      const matchesRoles = selectedRoles.length === 0 || selectedRoles.includes(user.role)
      const matchesStatus = !selectedStatus || selectedStatus === "all" || user.status === selectedStatus

      return matchesSearch && matchesRoles && matchesStatus
    }).length
  }

  const roleOptions = [
    { value: "Admin", label: "Admin", icon: ShieldCheck, color: "text-blue-500" },
    { value: "Instructor", label: "Instructor", icon: PencilLine, color: "text-green-500" },
    { value: "Student", label: "Student", icon: GraduationCap, color: "text-purple-500" },
  ];
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
    const badges: { label: string; value: number }[] = [];
    // Only show badges for selected roles
    if (selectedRoles.length > 0) {
      selectedRoles.forEach(role => {
        badges.push({
          label: role,
          value: getFilteredCount(
            allUser,
            debouncedSearchTerm,
            [role],
            selectedStatus
          ),
        });
      });
    }
    // Only show badge for selected status (not "all" or empty)
    if (selectedStatus && selectedStatus !== "all") {
      badges.push({
        label: selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1),
        value: getFilteredCount(
          allUser,
          debouncedSearchTerm,
          selectedRoles,
          selectedStatus
        ),
      });
    }
    return badges;
  };



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
            <div className="text-xxs text-gray-500">ID: {user.id}</div>
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
        <Badge className={`${user.role.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' :
          user.role.toLowerCase() === 'manager' ? 'bg-blue-100 text-blue-800' :
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
      renderCell: (user: User) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
            <span className={`text-xs font-medium ${user.status === "active" ? "text-green-600" : "text-red-600"}`}>
              {user.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>
          <Switch
            checked={user.status === "active"}
            onCheckedChange={(checked: boolean) => {
              const newStatus: "active" | "inactive" = checked ? "active" : "inactive";
              toggleStatus(user.id, newStatus);
            }}
            disabled={updatingStatus[user.id]}
            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
          />
        </div>
      )
    }
  ];


  const actionButtons: ActionButtons = {
    edit: (user: User) => handleEdit(user),
    permissions: (user: User) => handlePermissionsClick(user),
    delete: (user: User) => handleDelete(user)
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
                  <BreadcrumbLink href="/admin/pages/admindashboard" className="text-xs sm:text-sm text-gray-600 hover:text-indigo-600">
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

          {/* Filters and Add button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center gap-3 mb-4 w-full"
          >
            {/* Left side - filters and badges (tablet layout) */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
              {/* Search Input - always full width on mobile, auto on tablet+ */}
              <div className="flex items-center justify-center w-full md:w-68">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search name or email..."
                    className="w-full pl-8 h-8 shadow-none"
                    style={{ fontSize: "12px" }}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                    }}
                  />
                </div>
              </div>

              {/* Role Multi-select Dropdown */}
              <div className="w-full md:w-45">
                <MultiSelect
                  options={roleOptions}
                  selected={selectedRoles}
                  onChange={setSelectedRoles}
                  placeholder="Filter by role"
                />
              </div>

              {/* Status Single-select Dropdown */}
              <div className="w-full md:w-33">
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => {
                    setSelectedStatus(value)
                  }}
                >
                  <SelectTrigger className="text-xs md:text-xs h-5 md:h-8 cursor-pointer">
                    <SelectValue className="text-gray-100" placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs md:text-xs cursor-pointer">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Badges - hidden on mobile, shown on tablet+ (right side) */}
              <div className="hidden md:flex flex-wrap gap-1 md:w-auto">
                {getBadgeData().map(badge => (
                  <Badge
                    key={badge.label}
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {badge.label}: {badge.value}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Add button - appears below filters on tablet, inline on desktop */}
            <div className="w-full md:w-auto flex justify-end">
              <Button
                onClick={handleAddUserClick}
                className="bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white gap-1 md:gap-2 shadow-sm text-xs md:text-sm h-8 md:h-8 w-full md:w-auto"
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline">Add New User</span>
                <span className="md:hidden">Add User</span>
              </Button>
            </div>

            {/* Badges - shown only on mobile (below button) */}
            <div className="flex md:hidden flex-wrap gap-1 w-full">
              {getBadgeData().map(badge => (
                <Badge
                  key={badge.label}
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {badge.label}: {badge.value}
                </Badge>
              ))}
            </div>
          </motion.div>

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
              actionButtons={actionButtons}
              pagination={{
                currentPage: currentPage,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalUsers,
                itemsPerPage: usersPerPage,
                onPageChange: (page) => setCurrentPage(page),
              }}
            />
          </motion.div>

          {/* Add User Modal */}
          <AnimatePresence>
            {showAddUserModal && (
              <Dialog open={showAddUserModal} onOpenChange={(open) => {
                if (!open) {
                  setNewUser({
                    id: "", firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    password: "",
                    role: "Student",
                    status: "active",
                    gender: "Male",
                  });
                }
                setShowAddUserModal(open);
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
                        {/* User Type */}
                        <div className="space-y-1">
                          <Label htmlFor="role" className="text-xs font-medium text-gray-700">
                            User type <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                          >
                            <SelectTrigger
                              className="h-8 text-xs w-full border border-gray-300 hover:border-gray-400"
                              id="role"
                            >
                              <div className="flex items-center gap-2 w-full">
                                {newUser.role === "Admin" && <ShieldCheck className="h-3 w-3 text-purple-500" />}
                                {newUser.role === "Instructor" && <PencilLine className="h-3 w-3 text-blue-500" />}
                                {newUser.role === "Student" && <GraduationCap className="h-3 w-3 text-green-500" />}
                                <span className="capitalize flex-1 text-left">
                                  {newUser.role || "Select Role"}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              <SelectItem
                                value="Admin"
                                className="text-xs cursor-pointer focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <ShieldCheck className="h-3 w-3 text-purple-500" />
                                  <span className="flex-1">Admin</span>
                                </div>
                              </SelectItem>
                              <SelectItem
                                value="Instructor"
                                className="text-xs cursor-pointer focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <PencilLine className="h-3 w-3 text-blue-500" />
                                  <span className="flex-1">Instructor</span>
                                </div>
                              </SelectItem>
                              <SelectItem
                                value="Student"
                                className="text-xs cursor-pointer focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <GraduationCap className="h-3 w-3 text-green-500" />
                                  <span className="flex-1">Student</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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

                        {/* Gender */}
                        <div className="space-y-1">
                          <Label htmlFor="gender" className="text-xs font-medium text-gray-700">
                            Gender <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={newUser.gender}
                            onValueChange={(value) =>
                              setNewUser({ ...newUser, gender: value as "Male" | "Female" })
                            }
                          >
                            <SelectTrigger
                              className="h-8 text-xs w-full border border-gray-300 hover:border-gray-400"
                              id="gender"
                            >
                              <div className="flex items-center gap-2 w-full">
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
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)]">
                              <SelectItem
                                value="Male"
                                className="text-xs cursor-pointer focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-blue-500">♂</span>
                                  <span className="flex-1">Male</span>
                                </div>
                              </SelectItem>
                              <SelectItem
                                value="Female"
                                className="text-xs cursor-pointer focus:bg-gray-100"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-pink-500">♀</span>
                                  <span className="flex-1">Female</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

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

                        {/* Status */}
                        {!newUser.id && (
                          <div className="space-y-1">
                            <Label htmlFor="status" className="text-xs font-medium text-gray-700">
                              Status
                            </Label>
                            <Select
                              value={newUser.status}
                              onValueChange={(value) =>
                                setNewUser({ ...newUser, status: value as "active" | "inactive" })
                              }
                            >
                              <SelectTrigger
                                className="h-8 text-xs w-full border border-gray-300 hover:border-gray-400"
                                id="status"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full ${newUser.status === "active" ? "bg-green-500" : "bg-red-500"
                                      }`}
                                  />
                                  <span className="capitalize flex-1 text-left">
                                    {newUser.status === "active" ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                <SelectItem
                                  value="active"
                                  className="text-xs cursor-pointer focus:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="flex-1">Active</span>
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="inactive"
                                  className="text-xs cursor-pointer focus:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="flex-1">Inactive</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                      </form>
                    </div>

                    {/* Fixed Footer */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex justify-end gap-3">
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
                        disabled={isLoading}
                        className={`px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Key className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      Configure Permissions for {selectedUser?.firstName} {selectedUser?.lastName}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Set module-specific permissions for this user account.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="course-management" className="text-xs">Course Management</TabsTrigger>
                    <TabsTrigger value="user-management" className="text-xs">User Management</TabsTrigger>
                    <TabsTrigger value="test-access" className="text-xs">Test Access</TabsTrigger>
                  </TabsList>

                  <div className="mt-4 space-y-4">
                    <TabsContent value="course-management" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Course Management Permissions</CardTitle>
                          <CardDescription className="text-sm">
                            Control access to course creation, editing, and management features.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {renderPermissionCheckboxes("courseManagement", "Course Management")}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="user-management" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">User Management Permissions</CardTitle>
                          <CardDescription className="text-sm">
                            Control access to user creation, editing, and management features.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {renderPermissionCheckboxes("userManagement", "User Management")}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="test-access" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Test Access Permissions</CardTitle>
                          <CardDescription className="text-sm">
                            Control access to test creation, management, and reporting features.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {renderPermissionCheckboxes("testAccess", "Test Access")}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPermissionsModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={savePermissions}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 mb-2 sm:mb-0"
                >
                  Save Permissions
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        </div>
      </div>

    </DashboardLayout >
  )
}
