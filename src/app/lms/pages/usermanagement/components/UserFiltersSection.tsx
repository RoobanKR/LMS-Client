"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Role, User } from "./types";
import MultiSelect from "@/app/lms/component/MultiSelect";

interface UserFiltersSectionProps {
  showFilters: boolean;
  onClose: () => void;
  selectedRoles: string[];
  setSelectedRoles: (roles: string[]) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedDegree: string;
  setSelectedDegree: (degree: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (department: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  onClearFilters: () => void;
  dynamicRoleOptions: Array<{ value: string; label: string; icon: any; color: string }>;
  basedOn: string | null;
  degreeOptions: string[];
  departmentOptions: string[];
  yearOptions: string[];
  hasActiveFilters: () => boolean;
  allUsers: User[];
  roles: Role[];
  searchTerm: string;
}

export const UserFiltersSection: React.FC<UserFiltersSectionProps> = ({
  showFilters,
  onClose,
  selectedRoles,
  setSelectedRoles,
  selectedStatus,
  setSelectedStatus,
  selectedDegree,
  setSelectedDegree,
  selectedDepartment,
  setSelectedDepartment,
  selectedYear,
  setSelectedYear,
  onClearFilters,
  dynamicRoleOptions,
  basedOn,
  degreeOptions,
  departmentOptions,
  yearOptions,
  hasActiveFilters,
  allUsers,
  roles,
  searchTerm,
}) => {
  const getFilteredCount = (): { label: string; value: number }[] => {
    const badges: { label: string; value: number }[] = [];
    selectedRoles.forEach(roleId => {
      const role = roles.find(r => r._id === roleId);
      if (role) {
        const count = allUsers.filter(user => user.roleId === roleId && 
          (!searchTerm || user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (!selectedStatus || selectedStatus === "all" || user.status === selectedStatus) &&
          (!selectedDegree || selectedDegree === "all" || user.degree === selectedDegree) &&
          (!selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment) &&
          (!selectedYear || selectedYear === "all" || user.year === selectedYear)
        ).length;
        badges.push({ label: role.renameRole, value: count });
      }
    });
    if (selectedStatus && selectedStatus !== "all") {
      const count = allUsers.filter(user => user.status === selectedStatus &&
        (!searchTerm || user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedRoles.length === 0 || selectedRoles.includes(user.roleId)) &&
        (!selectedDegree || selectedDegree === "all" || user.degree === selectedDegree) &&
        (!selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment) &&
        (!selectedYear || selectedYear === "all" || user.year === selectedYear)
      ).length;
      badges.push({ label: selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1), value: count });
    }
    if (basedOn === 'college') {
      if (selectedDegree && selectedDegree !== "all") {
        const count = allUsers.filter(user => user.degree === selectedDegree &&
          (!searchTerm || user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedRoles.length === 0 || selectedRoles.includes(user.roleId)) &&
          (!selectedStatus || selectedStatus === "all" || user.status === selectedStatus) &&
          (!selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment) &&
          (!selectedYear || selectedYear === "all" || user.year === selectedYear)
        ).length;
        badges.push({ label: `Degree: ${selectedDegree}`, value: count });
      }
      if (selectedDepartment && selectedDepartment !== "all") {
        const count = allUsers.filter(user => user.department === selectedDepartment &&
          (!searchTerm || user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedRoles.length === 0 || selectedRoles.includes(user.roleId)) &&
          (!selectedStatus || selectedStatus === "all" || user.status === selectedStatus) &&
          (!selectedDegree || selectedDegree === "all" || user.degree === selectedDegree) &&
          (!selectedYear || selectedYear === "all" || user.year === selectedYear)
        ).length;
        badges.push({ label: `Dept: ${selectedDepartment}`, value: count });
      }
      if (selectedYear && selectedYear !== "all") {
        const count = allUsers.filter(user => user.year === selectedYear &&
          (!searchTerm || user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedRoles.length === 0 || selectedRoles.includes(user.roleId)) &&
          (!selectedStatus || selectedStatus === "all" || user.status === selectedStatus) &&
          (!selectedDegree || selectedDegree === "all" || user.degree === selectedDegree) &&
          (!selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment)
        ).length;
        badges.push({ label: `Year: ${selectedYear}`, value: count });
      }
    }
    return badges;
  };

  const removeBadge = (label: string) => {
    if (label.startsWith('Degree:')) setSelectedDegree("");
    else if (label.startsWith('Dept:')) setSelectedDepartment("");
    else if (label.startsWith('Year:')) setSelectedYear("");
    else if (label === 'Active' || label === 'Inactive') setSelectedStatus("");
    else {
      const roleToRemove = roles.find(r => r.renameRole === label);
      if (roleToRemove) setSelectedRoles(prev => prev.filter(id => id !== roleToRemove._id));
    }
  };

  const badges = getFilteredCount();

  return (
    <>
      {hasActiveFilters() && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active Filters:</span>
              {badges.map(badge => (
                <Badge key={badge.label} variant="secondary" className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {badge.label}: {badge.value}
                  <button onClick={() => removeBadge(badge.label)} className="ml-1 hover:text-red-600"><XCircle className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <Button onClick={onClearFilters} variant="ghost" size="sm" className="text-xs h-7 text-gray-600 hover:text-red-600"><XCircle className="h-3 w-3 mr-1" />Clear All</Button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filter Users</h3>
                <Button onClick={onClose} variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="w-full">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</Label>
                  <MultiSelect options={dynamicRoleOptions} selected={selectedRoles} onChange={setSelectedRoles} placeholder="All Roles" className="h-8 text-xs bg-white dark:bg-gray-800 border-gray-300" />
                </div>
                <div className="w-full">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="text-xs h-8 cursor-pointer w-full bg-white dark:bg-gray-800 border-gray-300"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent className="text-xs cursor-pointer bg-white dark:bg-gray-800">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {basedOn === 'college' && (
                  <>
                    <div className="w-full">
                      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Degree</Label>
                      <Select value={selectedDegree} onValueChange={setSelectedDegree}>
                        <SelectTrigger className="text-xs h-8 cursor-pointer w-full bg-white dark:bg-gray-800 border-gray-300"><SelectValue placeholder="All Degrees" /></SelectTrigger>
                        <SelectContent className="text-xs cursor-pointer bg-white dark:bg-gray-800">
                          <SelectItem value="all">All Degrees</SelectItem>
                          {degreeOptions.map(degree => <SelectItem key={degree} value={degree}>{degree}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="text-xs h-8 cursor-pointer w-full bg-white dark:bg-gray-800 border-gray-300"><SelectValue placeholder="All Departments" /></SelectTrigger>
                        <SelectContent className="text-xs cursor-pointer bg-white dark:bg-gray-800">
                          <SelectItem value="all">All Departments</SelectItem>
                          {departmentOptions.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Year</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="text-xs h-8 cursor-pointer w-full bg-white dark:bg-gray-800 border-gray-300"><SelectValue placeholder="All Years" /></SelectTrigger>
                        <SelectContent className="text-xs cursor-pointer bg-white dark:bg-gray-800">
                          <SelectItem value="all">All Years</SelectItem>
                          {yearOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={onClearFilters} variant="outline" size="sm" className="text-xs h-8">Clear Filters</Button>
                <Button onClick={onClose} variant="default" size="sm" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white">Apply Filters</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};