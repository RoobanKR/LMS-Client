"use client";
import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Send, Upload, Trash2, Eye, UserPlus, GraduationCap, ShieldCheck, ChevronDown, BookOpen, Building, Calendar, Users, X } from "lucide-react";
import { User, Role, UserFormData, ApiPermission } from "./types";
import { PermissionModal } from "@/app/lms/component/PermissionModal";
import { BulkPermissionModal } from "@/app/lms/component/BulkPermissionModal";
import BulkUploadModal from "@/app/lms/component/BulkUploadModal";

// Constants
const degreeOptions = ["B.Tech", "B.E", "B.Sc", "B.Com", "B.A", "M.Tech", "M.Sc", "MBA", "PhD"];
const departmentOptions = ["Computer Science", "Electrical", "Mechanical", "Civil", "Electronics", "Information Technology", "Mathematics", "Physics", "Chemistry"];
const semesterOptions = ["1", "2", "3", "4", "5", "6", "7", "8"];
const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const batchOptions = ["2021-2025", "2022-2026", "2023-2027", "2024-2028", "2025-2029"];

interface UserModalsProps {
  showAddUserModal: boolean;
  setShowAddUserModal: (show: boolean) => void;
  showSuccessModal: boolean;
  setShowSuccessModal: (show: boolean) => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  showPermissionModal: boolean;
  setShowPermissionModal: (show: boolean) => void;
  showBulkUploadModal: boolean;
  setShowBulkUploadModal: (show: boolean) => void;
  showBulkPermissionModal: boolean;
  setShowBulkPermissionModal: (show: boolean) => void;
  showViewDetailsModal: boolean;
  setShowViewDetailsModal: (show: boolean) => void;
  newUser: UserFormData;
  setNewUser: (user: UserFormData) => void;
  newUserId: string;
  userToDelete: User | null;
  selectedUserForPermission: User | null;
  setSelectedUserForPermission: (user: User | null) => void;  // ADD THIS
  selectedUserForDetails: User | null;
  setSelectedUserForDetails: (user: User | null) => void;  // ADD THIS
  selectedUserForBulkPermissions: User | null;
  setSelectedUserForBulkPermissions: (user: User | null) => void;
  roles: Role[];
  isLoadingRoles: boolean;
  basedOn: string | null;
  userPermissions: ApiPermission[];
  allUsers: User[];
  onAddUserSubmit: (e: React.FormEvent) => Promise<void>;
  onConfirmDelete: () => void;
  onConfigurePermissions: () => void;
  isDeleting: boolean;
  isEditing: boolean;
  canBulkUpload: boolean;
  canBulkPermission: boolean;
}

export const UserModals: React.FC<UserModalsProps> = ({
  showAddUserModal, setShowAddUserModal,
  showSuccessModal, setShowSuccessModal,
  showDeleteModal, setShowDeleteModal,
  showPermissionModal, setShowPermissionModal,
  showBulkUploadModal, setShowBulkUploadModal,
  showBulkPermissionModal, setShowBulkPermissionModal,
  showViewDetailsModal, setShowViewDetailsModal,
  newUser, setNewUser, newUserId, userToDelete,
  selectedUserForPermission, setSelectedUserForPermission,  // ADD THIS
  selectedUserForDetails, setSelectedUserForDetails,  // ADD THIS
  selectedUserForBulkPermissions, setSelectedUserForBulkPermissions,
  roles, isLoadingRoles, basedOn, userPermissions, allUsers,
  onAddUserSubmit, onConfirmDelete, onConfigurePermissions,
  isDeleting, isEditing, canBulkUpload, canBulkPermission,
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isDegreeDropdownOpen, setIsDegreeDropdownOpen] = useState(false);
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const genderDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const degreeDropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);
  const semesterDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const batchDropdownRef = useRef<HTMLDivElement>(null);

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
      ];
      dropdowns.forEach(({ ref, setter }) => {
        if (ref.current && !ref.current.contains(event.target as Node)) setter(false);
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const renderDropdown = (label: string, icon: React.ReactNode, value: string, options: string[], isOpen: boolean, setIsOpen: (open: boolean) => void, onChange: (value: string) => void, ref: React.RefObject<HTMLDivElement | null>, placeholder: string) => (
    <div className="space-y-1" ref={ref}>
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <div className="relative">
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2">
            {icon}
            <span className="flex-1 text-left">{value || placeholder}</span>
          </div>
          <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {options.map(option => (
              <div key={option} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${value === option ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'text-gray-900 dark:text-gray-100'}`} onClick={() => { onChange(option); setIsOpen(false); }}>
                {icon}<span className="flex-1">{option}</span>{value === option && <Check className="h-3 w-3 text-blue-500" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const getRoleBadgeClass = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('lms')) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    if (roleLower.includes('manager')) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (roleLower.includes('coordinator')) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  };

  return (
    <>
      {/* Add/Edit User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={(open) => { if (!open) setShowAddUserModal(false); }}>
        <DialogContent className="max-w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[40vw] p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-800">
            <DialogTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isEditing ? "Edit User" : "New User"} {basedOn === 'college' && " (College)"}{basedOn === 'skilling' && " (Skilling)"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Required fields are marked with an asterisk <span className="text-red-500">*</span></p>
            <form onSubmit={onAddUserSubmit} className="space-y-3">
              {/* Role Dropdown */}
              <div className="space-y-1" ref={roleDropdownRef}>
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Role Assignment <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <button type="button" onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)} className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-gray-500" />
                      <span className="flex-1 text-left">{roles.find(role => role._id === newUser.roleId)?.renameRole || "Select Role"}</span>
                    </div>
                    <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isRoleDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {isLoadingRoles ? (
                        <div className="flex items-center justify-center py-2 px-3"><Loader2 className="h-4 w-4 animate-spin text-gray-500" /><span className="ml-2 text-xs text-gray-600">Loading roles...</span></div>
                      ) : roles.length > 0 ? (
                        roles.map(role => (
                          <div key={role._id} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${newUser.roleId === role._id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`} onClick={() => { setNewUser({ ...newUser, roleId: role._id, role: role.renameRole }); setIsRoleDropdownOpen(false); }}>
                            <ShieldCheck className="h-3 w-3 text-blue-500" />
                            <div className="flex-1"><div className="font-medium">{role.renameRole}</div><div className="text-gray-500">{role.originalRole}</div></div>
                            {newUser.roleId === role._id && <Check className="h-3 w-3 text-blue-500" />}
                          </div>
                        ))
                      ) : (<div className="text-xs text-gray-500 py-2 px-3 text-center">No roles available</div>)}
                    </div>
                  )}
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="block text-xs font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></Label><input name="firstName" type="text" value={newUser.firstName} placeholder="First Name" onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900" required /></div>
                <div><Label className="block text-xs font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></Label><input name="lastName" type="text" value={newUser.lastName} placeholder="Last Name" onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900" required /></div>
              </div>

              {/* Email */}
              <div><Label className="block text-xs font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></Label><input name="email" type="email" value={newUser.email} placeholder="Enter Email Address" onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900" required /></div>

              {/* Phone */}
              <div><Label className="block text-xs font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></Label><input name="phone" type="tel" value={newUser.phone} placeholder="Enter phone number" onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900" required /></div>

              {/* Gender Dropdown */}
              <div className="space-y-1" ref={genderDropdownRef}>
                <Label className="text-xs font-medium text-gray-700">Gender <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <button type="button" onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)} className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <div className="flex items-center gap-2">
                      {newUser.gender === "Male" && <span className="text-blue-500 text-sm">♂</span>}{newUser.gender === "Female" && <span className="text-pink-500 text-sm">♀</span>}
                      <span className="capitalize flex-1 text-left">{newUser.gender}</span>
                    </div>
                    <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isGenderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isGenderDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 rounded-md shadow-lg">
                      {["Male", "Female"].map(gender => (
                        <div key={gender} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${newUser.gender === gender ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`} onClick={() => { setNewUser({ ...newUser, gender: gender as "Male" | "Female" }); setIsGenderDropdownOpen(false); }}>
                          <span className={gender === "Male" ? "text-blue-500" : "text-pink-500"}>{gender === "Male" ? "♂" : "♀"}</span><span className="flex-1">{gender}</span>{newUser.gender === gender && <Check className="h-3 w-3 text-blue-500" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* College Fields */}
              {basedOn === 'college' && (
                <>
                  {renderDropdown("Degree", <GraduationCap className="h-3 w-3 text-gray-500" />, newUser.degree, degreeOptions, isDegreeDropdownOpen, setIsDegreeDropdownOpen, (value) => setNewUser({ ...newUser, degree: value }), degreeDropdownRef, "Select Degree")}
                  {renderDropdown("Department", <Building className="h-3 w-3 text-gray-500" />, newUser.department, departmentOptions, isDepartmentDropdownOpen, setIsDepartmentDropdownOpen, (value) => setNewUser({ ...newUser, department: value }), departmentDropdownRef, "Select Department")}
                  <div className="grid grid-cols-2 gap-3">
                    {renderDropdown("Semester", <BookOpen className="h-3 w-3 text-gray-500" />, newUser.semester, semesterOptions, isSemesterDropdownOpen, setIsSemesterDropdownOpen, (value) => setNewUser({ ...newUser, semester: value }), semesterDropdownRef, "Select Semester")}
                    {renderDropdown("Year", <Calendar className="h-3 w-3 text-gray-500" />, newUser.year, yearOptions, isYearDropdownOpen, setIsYearDropdownOpen, (value) => setNewUser({ ...newUser, year: value }), yearDropdownRef, "Select Year")}
                  </div>
                  {renderDropdown("Batch", <Users className="h-3 w-3 text-gray-500" />, newUser.batch, batchOptions, isBatchDropdownOpen, setIsBatchDropdownOpen, (value) => setNewUser({ ...newUser, batch: value }), batchDropdownRef, "Select Batch")}
                </>
              )}

              {/* Password */}
              {!isEditing && (<div><Label className="block text-xs font-medium text-gray-700 mb-1">Password</Label><input name="password" type="password" value={newUser.password} onChange={handleInputChange} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900" placeholder="Enter password..." /></div>)}

              {/* Status Dropdown */}
              {!isEditing && (
                <div className="space-y-1" ref={statusDropdownRef}>
                  <Label className="text-xs font-medium text-gray-700">Status</Label>
                  <div className="relative">
                    <button type="button" onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)} className="h-8 w-full flex items-center justify-between px-3 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <div className="flex items-center gap-2"><span className={`inline-block w-2 h-2 rounded-full ${newUser.status === "active" ? "bg-green-500" : "bg-red-500"}`} /><span className="capitalize flex-1 text-left">{newUser.status === "active" ? "Active" : "Inactive"}</span></div>
                      <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isStatusDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 rounded-md shadow-lg">
                        {["active", "inactive"].map(status => (
                          <div key={status} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${newUser.status === status ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`} onClick={() => { setNewUser({ ...newUser, status: status as "active" | "inactive" }); setIsStatusDropdownOpen(false); }}>
                            <span className={`w-2 h-2 rounded-full ${status === "active" ? "bg-green-500" : "bg-red-500"}`} /><span className="flex-1 capitalize">{status}</span>{newUser.status === status && <Check className="h-3 w-3 text-blue-500" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
          <DialogFooter className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {canBulkUpload && (<Button onClick={() => { setShowAddUserModal(false); setShowBulkUploadModal(true); }} variant="outline" size="sm" className="flex items-center gap-1 text-xs"><Upload className="h-3 w-3" />Bulk Upload Users</Button>)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddUserModal(false)} className="text-xs h-8">Cancel</Button>
                <Button onClick={onAddUserSubmit} disabled={!newUser.roleId} className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"><Send className="h-3 w-3 mr-1" />{isEditing ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full"><Check className="h-5 w-5 text-green-600" /></div>
              <div><DialogTitle className="text-lg font-semibold">{isEditing ? "User Updated Successfully" : "User Created Successfully"}</DialogTitle><DialogDescription className="text-sm text-gray-600">{isEditing ? "The user account has been updated successfully." : "The user account has been created and is ready to use."}</DialogDescription></div>
            </div>
          </DialogHeader>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700"><strong>User ID:</strong> {newUserId}</p>
            {basedOn === 'college' && (<>{newUser.degree && <p className="text-sm"><strong>Degree:</strong> {newUser.degree}</p>}{newUser.department && <p className="text-sm"><strong>Department:</strong> {newUser.department}</p>}{newUser.batch && <p className="text-sm"><strong>Batch:</strong> {newUser.batch}</p>}</>)}
            <p className="text-xs text-gray-500 mt-1">The user will receive login credentials via email.</p>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">Close</Button>
            {!isEditing && <Button onClick={onConfigurePermissions} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white mb-2 sm:mb-0">Configure Permissions</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full"><Trash2 className="h-5 w-5 text-red-600" /></div>
              <div><DialogTitle className="text-lg font-semibold">Confirm Deletion</DialogTitle><DialogDescription className="text-sm text-gray-600">Are you sure you want to delete this user? This action cannot be undone.</DialogDescription></div>
            </div>
          </DialogHeader>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700"><strong>User:</strong> {userToDelete?.firstName} {userToDelete?.lastName}</p>
            <p className="text-xs text-gray-500 mt-1">Email: {userToDelete?.email}</p>
            {basedOn === 'college' && userToDelete?.degree && (<p className="text-xs text-gray-500">{userToDelete.degree} • {userToDelete.department} • {userToDelete.batch}</p>)}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
            <Button onClick={onConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={isDeleting}>{isDeleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : "Delete User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={showViewDetailsModal} onOpenChange={setShowViewDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full"><Eye className="h-5 w-5 text-blue-600" /></div>
              <div><DialogTitle className="text-lg font-semibold">User Details - {selectedUserForDetails?.firstName} {selectedUserForDetails?.lastName}</DialogTitle><DialogDescription className="text-sm text-gray-600">Complete information for this user account</DialogDescription></div>
            </div>
          </DialogHeader>
          {selectedUserForDetails && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4" />Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><p className="text-xs font-medium text-gray-500">Full Name</p><p className="text-sm text-gray-900">{selectedUserForDetails.firstName} {selectedUserForDetails.lastName}</p></div>
                  <div><p className="text-xs font-medium text-gray-500">Email Address</p><p className="text-sm text-gray-900">{selectedUserForDetails.email}</p></div>
                  <div><p className="text-xs font-medium text-gray-500">Phone Number</p><p className="text-sm text-gray-900">{selectedUserForDetails.phone}</p></div>
                  <div><p className="text-xs font-medium text-gray-500">Gender</p><p className="text-sm text-gray-900 capitalize">{selectedUserForDetails.gender}</p></div>
                  <div><p className="text-xs font-medium text-gray-500">Role</p><Badge className={getRoleBadgeClass(selectedUserForDetails.role)}>{selectedUserForDetails.role}</Badge></div>
                  <div><p className="text-xs font-medium text-gray-500">Status</p><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${selectedUserForDetails.status === "active" ? "bg-green-500" : "bg-red-500"}`} /><span className={`text-sm font-medium ${selectedUserForDetails.status === "active" ? "text-green-600" : "text-red-600"}`}>{selectedUserForDetails.status === "active" ? "Active" : "Inactive"}</span></div></div>
                  {selectedUserForDetails.lastLogin && (<div><p className="text-xs font-medium text-gray-500">Last Login</p><p className="text-sm text-gray-900">{selectedUserForDetails.lastLogin}</p></div>)}
                </div>
              </div>
              {basedOn === 'college' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4" />College Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUserForDetails.degree && (<div><p className="text-xs font-medium text-gray-500">Degree</p><p className="text-sm text-gray-900">{selectedUserForDetails.degree}</p></div>)}
                    {selectedUserForDetails.department && (<div><p className="text-xs font-medium text-gray-500">Department</p><p className="text-sm text-gray-900">{selectedUserForDetails.department}</p></div>)}
                    {selectedUserForDetails.year && (<div><p className="text-xs font-medium text-gray-500">Year</p><p className="text-sm text-gray-900">{selectedUserForDetails.year}</p></div>)}
                    {selectedUserForDetails.semester && (<div><p className="text-xs font-medium text-gray-500">Semester</p><p className="text-sm text-gray-900">Semester {selectedUserForDetails.semester}</p></div>)}
                    {selectedUserForDetails.batch && (<div><p className="text-xs font-medium text-gray-500">Batch</p><p className="text-sm text-gray-900">{selectedUserForDetails.batch}</p></div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setShowViewDetailsModal(false)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Modal */}
      {showPermissionModal && selectedUserForPermission && (
        <PermissionModal 
          isOpen={showPermissionModal} 
          onClose={() => { 
            setShowPermissionModal(false); 
            setSelectedUserForPermission(null); 
          }} 
          userId={selectedUserForPermission.id} 
          userName={`${selectedUserForPermission.firstName} ${selectedUserForPermission.lastName}`} 
          userEmail={selectedUserForPermission.email} 
        />
      )}

      {/* Bulk Upload Modal */}
      {canBulkUpload && showBulkUploadModal && (
        <BulkUploadModal 
          isOpen={showBulkUploadModal} 
          onClose={() => setShowBulkUploadModal(false)} 
          onSuccess={() => window.dispatchEvent(new CustomEvent('usersDataUpdated', { detail: { version: Date.now() } }))} 
        />
      )}

      {/* Bulk Permission Modal */}
      {canBulkPermission && showBulkPermissionModal && (
        <BulkPermissionModal 
          isOpen={showBulkPermissionModal} 
          onClose={() => { 
            setShowBulkPermissionModal(false); 
            setSelectedUserForBulkPermissions(null); 
          }} 
          availableUsers={allUsers} 
          roles={roles} 
          basedOn={basedOn} 
          preSelectedUser={selectedUserForBulkPermissions} 
        />
      )}
    </>
  );
};