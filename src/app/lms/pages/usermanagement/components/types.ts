export interface ApiPermission {
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

export interface Role {
  _id: string;
  originalRole: string;
  renameRole: string;
  roleValue: string;
  institution: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
  role: string;
  roleId: string;
  status: "active" | "inactive";
  lastLogin: string;
  degree?: string;
  department?: string;
  semester?: string;
  year?: string;
  batch?: string;
}

export interface UserFormData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  roleId: string;
  status: "active" | "inactive";
  gender: "Male" | "Female";
  degree: string;
  department: string;
  semester: string;
  year: string;
  batch: string;
}

export interface Column<T> {
  key: string;
  label: string;
  width: string;
  align: "left" | "center" | "right";
  renderCell?: (row: T) => React.ReactNode;
}