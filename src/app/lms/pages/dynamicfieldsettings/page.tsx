"use client"

import React, { useState, useEffect } from 'react'
import { BookAIcon, Users, Settings2, Loader2 } from 'lucide-react'
import DashboardLayout from '../../component/layout'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import ClientManagement from './clientTab'
import CourseserviceServicemodal from './courseserviceServicemodal'
import CategoryManagementPage from './categoryTab'
import PedagogyManagementComponent from './PedagogyComponent'
import { userPermission } from '@/apiServices/tokenVerify'

// Define types for the tab
type Tab = {
    key: string
    label: string
    icon?: React.ComponentType<{ className?: string }>
    component: React.ComponentType
}

// Define types for permission
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





// Define tab configuration
const tabConfig = {
    'Service Modal': {
        label: 'Service Model',
        icon: Users,
        component: CourseserviceServicemodal,
        permissionKey: 'Service Modal'
    },
    'Course Category': {
        label: 'Course Category',
        icon: BookAIcon,
        component: CategoryManagementPage,
        permissionKey: 'Course Category'
    },
    'Pedagogy': {
        label: 'Pedagogy',
        icon: BookAIcon,
        component: PedagogyManagementComponent,
        permissionKey: 'Pedagogy'
    }
}

export default function Page() {
    const [activeTab, setActiveTab] = useState<string>('Service Modal')
    const [availableTabs, setAvailableTabs] = useState<Tab[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userPermissions, setUserPermissions] = useState<ApiPermission[]>([])

    useEffect(() => {
        const fetchUserPermissions = () => {
            try {
                setIsLoading(true)
                const response = userPermission()
                
                if (response.valid && response.user) {
                    const permissions = response.user.permissions || []
                    setUserPermissions(permissions)
                    
                    // Find the dynamicfieldsettings permission
                    const dynamicFieldPermission = permissions.find(
                        (p: ApiPermission) => p.permissionKey === 'dynamicfieldsettings' && p.isActive
                    )
                    
                    if (dynamicFieldPermission) {
                        // Check which functionalities the user has access to
                        const userFunctionalities = dynamicFieldPermission.permissionFunctionality || []
                        
                        // Create tabs based on available functionalities
                        const tabs: Tab[] = []
                        
                        // Check each tab configuration
                        Object.entries(tabConfig).forEach(([tabKey, config]) => {
                            if (userFunctionalities.includes(config.permissionKey)) {
                                tabs.push({
                                    key: tabKey,
                                    label: config.label,
                                    icon: config.icon,
                                    component: config.component
                                })
                            }
                        })
                        
                        setAvailableTabs(tabs)
                        
                        // Set active tab to the first available tab if current active tab is not available
                        if (tabs.length > 0 && !tabs.some(tab => tab.key === activeTab)) {
                            setActiveTab(tabs[0].key)
                        }
                    } else {
                        // If no dynamicfieldsettings permission, show no tabs
                        setAvailableTabs([])
                    }
                } else {
                    // If no user data found
                    setAvailableTabs([])
                }
            } catch (error) {
                console.error('Failed to fetch user permissions from localStorage:', error)
                setAvailableTabs([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserPermissions()
    }, [])

    // Check if user has access to a specific functionality
    const hasAccess = (functionality: string): boolean => {
        const dynamicFieldPermission = userPermissions.find(
            (p: ApiPermission) => p.permissionKey === 'dynamicfieldsettings' && p.isActive
        )
        
        if (!dynamicFieldPermission) return false
        
        return dynamicFieldPermission.permissionFunctionality.includes(functionality)
    }

    // Get the active tab component
    const ActiveTabComponent = availableTabs.find(tab => tab.key === activeTab)?.component

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="bg-gray-50 min-h-screen">
                    <div className="space-y-4 p-3 md:p-4">
                        <div className="mx-auto">
                            {/* Header Section */}
                            <div className="mb-3">
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbLink href="/lms/pages/admindashboard" className="text-xs text-gray-600 hover:text-indigo-600">
                                                Dashboard
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator className="text-gray-400" />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="text-xs font-medium text-indigo-600">Dynamic Field Management</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>
                        </div>

                        {/* Loading State */}
                        <div className="w-full bg-white rounded-lg border border-gray-200 p-8">
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                                <p className="text-sm text-gray-600">Loading permissions...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    // Check if user has access to any tab
    if (availableTabs.length === 0) {
        return (
            <DashboardLayout>
                <div className="bg-gray-50 min-h-screen">
                    <div className="space-y-4 p-3 md:p-4">
                        <div className="mx-auto">
                            {/* Header Section */}
                            <div className="mb-3">
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbLink href="/lms/pages/admindashboard" className="text-xs text-gray-600 hover:text-indigo-600">
                                                Dashboard
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator className="text-gray-400" />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="text-xs font-medium text-indigo-600">Dynamic Field Management</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>
                        </div>

                        {/* No Access Message */}
                        <div className="w-full bg-white rounded-lg border border-gray-200">
                            <div className="border-b border-gray-200 bg-white">
                                <nav className="flex space-x-6 px-4">
                                    {Object.entries(tabConfig).map(([tabKey, config]) => (
                                        <button
                                            key={tabKey}
                                            disabled
                                            className={`py-3 px-1 border-b-2 font-medium text-xs flex items-center gap-2 border-transparent text-gray-300 cursor-not-allowed`}
                                        >
                                            {config.icon && <config.icon className="h-3 w-3" />}
                                            {config.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-8 text-center">
                                <div className="mx-auto max-w-md">
                                    <Settings2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Access</h3>
                                    <p className="text-sm text-gray-600 mb-6">
                                        You don't have permission to access Dynamic Field Management features.
                                    </p>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <p className="text-xs text-gray-500">
                                            Required permission: <span className="font-medium">dynamicfieldsettings</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Contact your administrator to request access.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="bg-gray-50 min-h-screen">
                <div className="space-y-4 p-3 md:p-4">
                    <div className="mx-auto">
                        {/* Header Section */}
                        <div className="mb-3">
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/lms/pages/admindashboard" className="text-xs text-gray-600 hover:text-indigo-600">
                                            Dashboard
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="text-gray-400" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-xs font-medium text-indigo-600">Dynamic Field Management</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </div>

                    {/* Custom Tabs */}
                    <div className="w-full">
                        {/* Tab Navigation */}
                        <div className="border-b border-gray-200 bg-white">
                            <nav className="flex space-x-6 px-4">
                                {availableTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`py-3 px-1 border-b-2 font-medium text-xs flex items-center gap-2 ${activeTab === tab.key
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {tab.icon && <tab.icon className="h-3 w-3" />}
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="mt-4">
                            {ActiveTabComponent && <ActiveTabComponent />}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

// Export helper function if needed elsewhere
export { userPermission };