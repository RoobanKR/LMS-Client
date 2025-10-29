"use client"

import React, { useState } from 'react'
import { BookAIcon, Users } from 'lucide-react'
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


// Define types for the tab
type Tab = {
    key: string
    label: string
    icon?: React.ComponentType<{ className?: string }>
}

export default function Page() {
    const [activeTab, setActiveTab] = useState<string>('Service Model')

    const tabs: Tab[] = [
        { key: 'Service Model', label: 'Service Model', icon: Users },

        { key: "Course Category", label: "Course Category", icon: BookAIcon },

        { key: "Pedagogy", label: "Pedagogy", icon: BookAIcon },

    ]

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
                                        <BreadcrumbLink href="/admin/pages/admindashboard" className="text-xs text-gray-600 hover:text-indigo-600">
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
                                {tabs.map((tab) => (
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
                            {activeTab === 'Service Model' && <CourseserviceServicemodal />}

                            {activeTab === "Course Category" && (
                                <>
                                    <CategoryManagementPage />
                                </>
                            )}

                            {activeTab === "Pedagogy" && (
                                <>
                                    <PedagogyManagementComponent />
                                </>
                            )}



                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}