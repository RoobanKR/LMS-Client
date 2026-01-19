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
import { getCurrentUser } from '@/apiServices/tokenVerify'

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
        const fetchUserPermissions = async () => {
            try {
                setIsLoading(true)
                const response = await getCurrentUser()
                
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
                }
            } catch (error) {
                console.error('Failed to fetch user permissions:', error)
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

  



    return (
        <DashboardLayout>
            <div className="bg-gray-50">
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