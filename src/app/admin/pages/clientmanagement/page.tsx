"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Users, Edit, Link, Trash2, ChevronLeft, ChevronRight, Plus, X, Upload, Building, User, Mail, Phone, FileText, AlertTriangle, Loader2, Search, CheckCircle, XCircle, Clock, Send } from 'lucide-react'
import { UserTable } from '@/components/ui/alterationTable'
import { cleanup, createClient, deleteClient, fetchClients, invalidateClientsCache, toggleClientStatus, updateClient } from '@/apiServices/dynamicFields/client'
import DashboardLayout from '../../component/layout'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ContactPerson = {
    name: string
    email: string
    phoneNumber: string
    isPrimary: boolean
}

// Define types for the client data
type Client = {
    _id: string
    contactPersons: ContactPerson[]
    clientCompany: string
    description: string
    clientAddress: string
    status: string
    isActive: boolean
}

// Define types for the form data
type FormData = {
    contactPersons: ContactPerson[]
    clientCompany: string
    description: string
    clientAddress: string
    status: string
}

export default function ClientManagement() {
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [clientList, setClientList] = useState<Client[]>([])
    const [showForm, setShowForm] = useState<boolean>(false)
    const [showContactsPopup, setShowContactsPopup] = useState(false);
    const [currentContacts, setCurrentContacts] = useState<ContactPerson[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [currentClientId, setCurrentClientId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>({
        contactPersons: [{
            name: '',
            email: '',
            phoneNumber: '',
            isPrimary: true
        }],
        clientCompany: '',
        description: '',
        clientAddress: '',
        status: 'active'
    })
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [token, setToken] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        // Get token from localStorage when component mounts
        const storedToken = localStorage.getItem('smartcliff_token')
        setToken(storedToken)
    }, [])

    const usersPerPage = 5
    const totalUsers = clientList.length
    const totalPages = Math.ceil(totalUsers / usersPerPage)
    const totalClients = clientList.length
    const activeClients = clientList.filter(client => client.status === 'active').length
    const inactiveClients = clientList.filter(client => client.status === 'inactive').length
    const clientDataCount = 10

    // Get current users for the current page
    const currentUsers = clientList.slice(
        (currentPage - 1) * usersPerPage,
        currentPage * usersPerPage
    )

    // Fetch clients when token is available
    useEffect(() => {
        if (token) {
            loadClients()
        }

        return () => {
            cleanup() // Clean up background refresh when component unmounts
        }
    }, [token, searchTerm])

    const loadClients = async () => {
        if (!token) {
            console.error("Authentication token is missing");
            toast.error("Authentication token is missing");
            return;
        }
        setIsLoading(true)
        try {
            const response = await fetchClients(token)
            if (response && response.clients) {
                let filteredClients = response.clients.map((client: any) => ({
                    ...client
                }))

                // Apply search filter if searchTerm exists
                if (searchTerm) {
                    filteredClients = filteredClients.filter((client: Client) =>
                        client.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                }

                setClientList(filteredClients)
            }
        } catch (error) {
            console.error("Failed to load clients:", error)
            toast.error("Failed to load clients. Please try again.")
            setFormError("Failed to load clients. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }
    const truncateText = (text: string, wordLimit: number) => {
        if (!text) return 'N/A';
        const words = text.split(' ');
        if (words.length <= wordLimit) return text;
        return words.slice(0, wordLimit).join(' ') + '...';
    };

    const truncateTextadd = (text: string, wordLimit: number) => {
        if (!text) return 'N/A';
        // Split by comma, space, and hyphen using regex
        const words = text.split(/[,\s-]+/).filter(word => word.trim() !== '');
        if (words.length <= wordLimit) return text;
        return words.slice(0, wordLimit).join(', ') + '...';
    };
    const columns = [
        {
            key: 'clientCompany',
            label: 'Company Name',
            width: '20%',
            align: 'left' as const,
            renderCell: (client: Client) => (
                <div className="text-xs font-medium text-gray-900">
                    {client.clientCompany || 'N/A'}
                </div>
            )
        },
        {
            key: 'clientAddress',
            label: 'Address',
            width: '25%',
            align: 'left' as const,
            renderCell: (client: Client) => (
                <div
                    className="text-xs text-gray-900 cursor-help"
                    title={client.clientAddress || 'N/A'}
                >
                    {truncateTextadd(client.clientAddress, 5)}
                </div>
            )
        },
        {
            key: 'description',
            label: 'Description',
            width: '25%',
            align: 'left' as const,
            renderCell: (client: Client) => (
                <div
                    className="text-xs text-gray-900 cursor-help"
                    title={client.description || 'N/A'}
                >
                    {truncateText(client.description, 5)}
                </div>
            )
        },
        {
            key: 'contactPersons',
            label: 'Contacts',
            width: '15%',
            align: 'left' as const,
            renderCell: (client: Client) => (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-100 hover:border-indigo-200 rounded-md px-3 py-1 flex items-center gap-1 transition-colors duration-200"
                    onClick={() => handleShowContacts(client)}
                >
                    <Users className="h-4 w-4" style={{ height: '13px', width: '13px' }} />
                    <span>{client.contactPersons.length}</span>
                    <span className="hidden sm:inline">Contacts</span>
                </Button>
            )
        },
        {
            key: 'status',
            label: 'Status',
            width: '10%',
            align: 'center' as const,
            renderCell: (client: Client) => (
                <div className="flex items-center gap-2 justify-center">
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${client.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                        <span className={`text-xs font-medium ${client.status === "active" ? "text-green-600" : "text-red-600"}`}>
                            {client.status === "active" ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <Switch
                        checked={client.status === "active"}
                        onCheckedChange={(checked: boolean) => {
                            const newStatus = checked ? "active" : "inactive";
                            handleToggleStatus(client._id, newStatus);
                        }}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                    />
                </div>
            )
        },
    ]

    const actionButtons = {
        edit: (client: Client) => handleEdit(client._id),
        delete: (client: Client) => handleDeleteClick(client)

    }

    const handleShowContacts = (client: Client) => {
        setCurrentContacts(client.contactPersons);
        setShowContactsPopup(true);
    };

    const handleAddContactPerson = () => {
        setFormData(prev => ({
            ...prev,
            contactPersons: [
                ...prev.contactPersons,
                {
                    name: '',
                    email: '',
                    phoneNumber: '',
                    isPrimary: false // First one is primary by default
                }
            ]
        }))
    }

    const handleRemoveContactPerson = (index: number) => {
        setFormData(prev => {
            const newContacts = [...prev.contactPersons]
            newContacts.splice(index, 1)

            // If we removed the primary contact, make the first one primary
            if (newContacts.length > 0 && prev.contactPersons[index].isPrimary) {
                newContacts[0].isPrimary = true
            }

            return {
                ...prev,
                contactPersons: newContacts
            }
        })
    }

    const handleContactPersonChange = (index: number, field: keyof ContactPerson, value: string | boolean) => {
        setFormData(prev => {
            const newContacts = [...prev.contactPersons]
            newContacts[index] = {
                ...newContacts[index],
                [field]: value
            }
            return {
                ...prev,
                contactPersons: newContacts
            }
        })
    }
    const handleToggleStatus = async (clientId: string, newStatus: string) => {
        if (!token) {
            console.error("Authentication token is missing");
            toast.error("Authentication token is missing");
            return;
        }

        try {
            // Set loading state for this specific client
            setUpdatingStatus(prev => ({ ...prev, [clientId]: true }));

            // Call the toggle status API
            const response = await toggleClientStatus(clientId, token);

            if (response.success) {
                // Update the local state
                setClientList(prev => prev.map(client =>
                    client._id === clientId ? { ...client, status: newStatus } : client
                ));
                invalidateClientsCache();
                toast.success(`Client status updated to ${newStatus}`);
            }
        } catch (error) {
            console.error("Failed to toggle client status:", error);
            toast.error("Failed to update client status. Please try again.");
        } finally {
            // Remove loading state
            setUpdatingStatus(prev => ({ ...prev, [clientId]: false }));
        }
    };
    const handleSetPrimary = (index: number) => {
        setFormData(prev => ({
            ...prev,
            contactPersons: prev.contactPersons.map((person, i) => ({
                ...person,
                isPrimary: i === index
            }))
        }))
    }

    const handleEdit = (id: string) => {
        const clientToEdit = clientList.find(client => client._id === id)
        if (clientToEdit) {
            setFormData({
                contactPersons: clientToEdit.contactPersons,
                clientCompany: clientToEdit.clientCompany,
                description: clientToEdit.description || '',
                clientAddress: clientToEdit.clientAddress || '',
                status: clientToEdit.status || ''
            })
            setCurrentClientId(id)
            setIsEditing(true)
            setShowForm(true)
            setFormError(null)
        }
    }

    const handleDeleteClick = (client: Client) => {
        setClientToDelete(client)
        setShowDeleteConfirm(true)
    }

    const handleDeleteConfirm = async (confirmed: boolean) => {
        if (confirmed && clientToDelete && clientToDelete._id && token) {
            try {
                setIsLoading(true)
                await deleteClient(clientToDelete._id, token)
                setClientList(prev => prev.filter(client => client._id !== clientToDelete._id))
                invalidateClientsCache()
                toast.success(`Client "${clientToDelete.clientCompany}" deleted successfully`);
            } catch (error) {
                console.error("Failed to delete client:", error)
                toast.error("Failed to delete client. Please try again.");
                setFormError("Failed to delete client. Please try again.")
            } finally {
                setIsLoading(false)
            }
        }
        setShowDeleteConfirm(false)
        setClientToDelete(null)
    }


    const handleAddNew = () => {
        setFormData({
            contactPersons: [{
                name: '',
                email: '',
                phoneNumber: '',
                isPrimary: true
            }],
            clientCompany: '',
            description: '',
            clientAddress: '',
            status: 'active'
        })
        setCurrentClientId(null)
        setIsEditing(false)
        setShowForm(true)
        setFormError(null)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setFormError(null)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Form validation
    const validateForm = (): boolean => {
        if (!formData.clientCompany.trim()) {
            setFormError("Client company name is required")
            toast.error("Client company name is required");
            return false
        }

        if (formData.contactPersons.length === 0) {
            setFormError("At least one contact person is required")
            toast.error("At least one contact person is required");
            return false
        }

        const hasPrimaryContact = formData.contactPersons.some(p => p.isPrimary)
        if (!hasPrimaryContact) {
            setFormError("Please select a primary contact")
            toast.error("Please select a primary contact");
            return false
        }

        for (let i = 0; i < formData.contactPersons.length; i++) {
            const person = formData.contactPersons[i]
            if (!person.name.trim()) {
                setFormError(`Contact person ${i + 1}: Name is required`)
                toast.error(`Contact person ${i + 1}: Name is required`);
                return false
            }
            if (!person.email.trim()) {
                setFormError(`Contact person ${i + 1}: Email is required`)
                toast.error(`Contact person ${i + 1}: Email is required`);
                return false
            }
            if (!person.phoneNumber.trim()) {
                setFormError(`Contact person ${i + 1}: Phone number is required`)
                toast.error(`Contact person ${i + 1}: Phone is required`);
                return false
            }
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(person.email)) {
                setFormError(`Contact person ${i + 1}: Invalid email format`)
                toast.error(`Contact person ${i + 1}: Invalid email format`);
                return false
            }
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        if (!token) {
            setFormError("Authentication token is missing")
            toast.error("Authentication token is missing");
            return
        }

        setIsLoading(true)
        setFormError(null)

        try {
            console.log("Submitting form data:", formData) // Debug log

            if (isEditing && currentClientId) {
                // Update existing client
                const updatedClient = await updateClient(currentClientId, formData, token)
                console.log("Client updated:", updatedClient) // Debug log

                // Update the client in the local state
                setClientList(prev => prev.map(client =>
                    client._id === currentClientId ? { ...client, ...formData } : client
                ))
                toast.success(`Client "${formData.clientCompany}" updated successfully`);
            } else {
                // Create new client
                const newClient = await createClient(formData, token)
                console.log("New client created:", newClient) // Debug log

                // Add the new client to the local state
                setClientList(prev => [...prev, newClient])
                toast.success(`Client "${formData.clientCompany}" created successfully`);
            }

            invalidateClientsCache() // Force refresh of cache
            await loadClients() // Reload clients
            handleCloseForm()
        } catch (error) {
            console.error("Failed to save client:", error)
            setFormError(`Failed to ${isEditing ? 'update' : 'create'} client. Please try again.`)
            toast.error(`Failed to ${isEditing ? 'update' : 'create'} client. Please try again.`);
        } finally {
            setIsLoading(false)
        }
    }

    const formVariants = {
        hidden: {
            opacity: 0,
            scale: 0.8,
            y: 50
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        },
        exit: {
            opacity: 0,
            scale: 0.8,
            y: 50,
            transition: {
                duration: 0.2,
                ease: "easeIn"
            }
        }
    } as const

    const overlayVariants = {
        hidden: {
            opacity: 0
        },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.1
            }
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.2
            }
        }
    }

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-1"
            >
                <div className="p-1">
                    <div className="mb-2">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/admin/pages/admindashboard" className="text-xs sm:text-sm text-gray-600 hover:text-indigo-600">
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="text-gray-400" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-xs sm:text-sm font-medium text-indigo-600">Client Management</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    {/* Header with Search and New Button */}

                    {/* Statistics Cards */}
                    <div className=" py-3 border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            {/* Total Clients */}
                            <div className="bg-none border border-gray-300 rounded-lg  p-2">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-md p-2 bg-gray-100 text-gray-700">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-gray-900 text-xs font-semibold" >
                                            {!isLoading ? (
                                                <span className=" pr-1 font-bold text-blue-700" style={{ fontSize: "14px" }}>
                                                    {totalClients}
                                                </span>
                                            ) : (
                                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                            )}
                                            <span className="text-xs text-gray-600 font-medium">Total Clients</span>
                                        </div>
                                        <div className="text-gray-500" style={{ fontSize: "10px" }}>All current clients</div>
                                    </div>
                                </div>
                            </div>

                            {/* Active Clients */}

                            <div className="bg-none border border-gray-300 rounded-lg  p-2">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-md p-2 bg-green-100 text-green-700">
                                        <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-gray-900 text-xs font-semibold" >
                                            {!isLoading ? (
                                                <span className=" pr-1 font-bold text-green-700" style={{ fontSize: "14px" }}>
                                                    {activeClients}
                                                </span>
                                            ) : (
                                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                            )}
                                            <span className="text-xs text-gray-600 font-medium">Active Clients</span>
                                        </div>
                                        <div className="text-gray-500" style={{ fontSize: "10px" }}>Currently active clients</div>
                                    </div>
                                </div>
                            </div>

                            {/* Inactive Clients */}


                            <div className="bg-none border border-gray-300 rounded-lg  p-2">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-md p-2 bg-red-100 text-red-700">
                                        <XCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-gray-900 text-xs font-semibold" >
                                            {!isLoading ? (
                                                <span className=" pr-1 font-bold text-red-700" style={{ fontSize: "14px" }}>
                                                    {inactiveClients}
                                                </span>
                                            ) : (
                                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                            )}
                                            <span className="text-xs text-gray-600 font-medium">Inactive Clients</span>
                                        </div>
                                        <div className="text-gray-500" style={{ fontSize: "10px" }}>Inactive clients</div>
                                    </div>
                                </div>
                            </div>
                            {/* Client Data */}
                            <div className="bg-none border border-gray-300 rounded-lg  p-2">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-md p-2 bg-purple-100 text-purple-700">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-gray-900 text-xs font-semibold" >
                                            {!isLoading ? (
                                                <span className=" pr-1 font-bold text-purple-700" style={{ fontSize: "14px" }}>
                                                    {clientDataCount}
                                                </span>
                                            ) : (
                                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                            )}
                                            <span className="text-xs text-gray-600 font-medium">Recent Clients</span>
                                        </div>
                                        <div className="text-gray-500" style={{ fontSize: "10px" }}>Recently added clients</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search and New Button Row */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Search Input */}
                            <div className="w-full sm:flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Search by company name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-9 text-sm w-full"
                                />
                                {isLoading && searchTerm && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    </div>
                                )}
                                {searchTerm && !isLoading && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    >
                                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                    </button>
                                )}
                            </div>

                            {/* New Client Button */}
                            <div className="w-full sm:w-auto">
                                <Button
                                    onClick={handleAddNew}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-auto w-full sm:w-auto"
                                    disabled={isLoading}
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    <span className="whitespace-nowrap">New Client</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">


                        <UserTable
                            users={currentUsers}
                            isLoading={isLoading}
                            columns={columns}
                            actionButtons={actionButtons}
                            pagination={{
                                currentPage: currentPage,
                                totalPages: totalPages,
                                totalItems: totalUsers,
                                itemsPerPage: usersPerPage,
                                onPageChange: (page) => setCurrentPage(page),
                            }}
                        />

                    </div>

                    {/* Client Form Modal */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                variants={overlayVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
                            >
                                <motion.div
                                    variants={formVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-[85vw] md:max-w-[75vw] lg:max-w-[50vw] xl:max-w-[50vw] max-h-[95vh] sm:max-h-[93vh] flex flex-col"
                                >
                                    {/* Form Header */}
                                    <div className="px-3 sm:px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                                                <User className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm sm:text-md font-semibold text-gray-900">
                                                    {isEditing ? 'Edit Client' : 'New Client'}
                                                </h2>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCloseForm}
                                            className="text-white h-6 w-6 bg-red-500 cursor-pointer hover:bg-red-600 hover:text-white"
                                            disabled={isLoading}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {/* Error Message */}
                                    {formError && (
                                        <div className="px-3 sm:px-6 py-2 bg-red-50 border-l-4 border-red-500">
                                            <p className="text-sm text-red-700">{formError}</p>
                                        </div>
                                    )}

                                    {/* Form Content */}
                                    <div className="overflow-y-auto flex-1 px-3 sm:px-6 py-4">
                                        <p className="text-xs text-gray-600 mb-4">
                                            Required fields are marked with an asterisk <span className="text-red-500">*</span>
                                        </p>
                                        <form onSubmit={handleSubmit} className="space-y-4">

                                            {/* Company Name */}
                                            <div className="space-y-2">
                                                <Label htmlFor="clientCompany" className="text-xs font-medium text-gray-700">
                                                    Client Company Name <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="clientCompany"
                                                    name="clientCompany"
                                                    type="text"
                                                    required
                                                    placeholder="Company Name"
                                                    value={formData.clientCompany}
                                                    onChange={handleInputChange}
                                                    className="w-full h-8 rounded-sm shadow-none border-gray-300"
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            {/* Contact Persons */}
                                            <div className="space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <Label className="text-xs font-medium text-gray-700">
                                                        Contact Persons <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        onClick={handleAddContactPerson}
                                                        className="bg-sky-600 text-white hover:bg-sky-700 cursor-pointer text-xs font-medium h-8 px-3 flex items-center gap-1 rounded-md shadow-sm w-full sm:w-auto"
                                                        disabled={isLoading}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Add Contact
                                                    </Button>
                                                </div>

                                                {formData.contactPersons.map((person, index) => (
                                                    <div
                                                        key={index}
                                                        className={`border rounded-md p-3 sm:p-4 space-y-3 transition-all duration-200 ${formData.contactPersons.length > 1 && person.isPrimary
                                                            ? "border-blue-500 bg-blue-50 shadow-[0_0_0_1px_#3b82f6]"
                                                            : "border-gray-200"
                                                            }`}
                                                    >
                                                        {/* Primary Contact Selection - Only show when multiple contacts exist */}
                                                        <div className='flex justify-between items-center'>
                                                            {formData.contactPersons.length > 1 && (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        id={`primary-contact-${index}`}
                                                                        name="primary-contact"
                                                                        checked={person.isPrimary}
                                                                        onChange={() => handleSetPrimary(index)}
                                                                        disabled={isLoading}
                                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                    <Label
                                                                        htmlFor={`primary-contact-${index}`}
                                                                        className="text-xs text-gray-700 cursor-pointer"
                                                                    >
                                                                        Primary Contact
                                                                    </Label>
                                                                </div>
                                                            )}

                                                            {/* Remove button - Only show when not the only contact */}
                                                            {formData.contactPersons.length > 1 && (
                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveContactPerson(index)}
                                                                        className={`h-8 w-8 p-0 ${person.isPrimary
                                                                            ? "text-red-600 hover:text-red-800"
                                                                            : "text-red-500 hover:text-red-700"
                                                                            }`}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Contact fields */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {/* Name field */}
                                                            <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-700">
                                                                    Name <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    type="text"
                                                                    required
                                                                    placeholder="Name"
                                                                    value={person.name}
                                                                    onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)}
                                                                    className={`w-full h-8 rounded-sm shadow-none ${formData.contactPersons.length > 1 && person.isPrimary
                                                                        ? "border-blue-300 bg-white"
                                                                        : "border-gray-300"
                                                                        }`}
                                                                    disabled={isLoading}
                                                                />
                                                            </div>

                                                            {/* Email field */}
                                                            <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-700">
                                                                    Email Address <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    type="email"
                                                                    required
                                                                    placeholder="Email Address"
                                                                    value={person.email}
                                                                    onChange={(e) => handleContactPersonChange(index, 'email', e.target.value)}
                                                                    className={`w-full h-8 rounded-sm shadow-none ${formData.contactPersons.length > 1 && person.isPrimary
                                                                        ? "border-blue-300 bg-white"
                                                                        : "border-gray-300"
                                                                        }`}
                                                                    disabled={isLoading}
                                                                />
                                                            </div>

                                                            {/* Phone field */}
                                                            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                                                <Label className="text-xs font-medium text-gray-700">
                                                                    Phone Number <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    type="tel"
                                                                    required
                                                                    placeholder="Enter phone number"
                                                                    value={person.phoneNumber}
                                                                    onChange={(e) => handleContactPersonChange(index, 'phoneNumber', e.target.value)}
                                                                    className={`w-full h-8 rounded-sm shadow-none ${formData.contactPersons.length > 1 && person.isPrimary
                                                                        ? "border-blue-300 bg-white"
                                                                        : "border-gray-300"
                                                                        }`}
                                                                    disabled={isLoading}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Description and Address in same row */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="description" className="text-xs font-medium text-gray-700">
                                                        Description
                                                    </Label>
                                                    <Textarea
                                                        id="description"
                                                        name="description"
                                                        placeholder="Description"
                                                        value={formData.description}
                                                        onChange={handleInputChange}
                                                        rows={4}
                                                        className="w-full rounded-sm shadow-none border-gray-300"
                                                        disabled={isLoading}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="clientAddress" className="text-xs font-medium text-gray-700">
                                                        Address
                                                    </Label>
                                                    <Textarea
                                                        id="clientAddress"
                                                        name="clientAddress"
                                                        placeholder="Address"
                                                        value={formData.clientAddress}
                                                        onChange={handleInputChange}
                                                        rows={4}
                                                        className="w-full rounded-sm shadow-none border-gray-300"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Form Actions */}
                                    <div className="px-3 sm:px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseForm}
                                            disabled={isLoading}
                                            className="w-full sm:w-auto order-2 sm:order-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleSubmit}
                                            className="bg-blue-600 cursor-pointer hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2 flex items-center gap-1"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Send className="h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" />
                                                    {isEditing ? 'Update' : 'Create'}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Delete Confirmation Modal */}
                    <AnimatePresence>
                        {showDeleteConfirm && clientToDelete && (
                            <motion.div
                                className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                >
                                    <div className="text-center">
                                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                            <AlertTriangle className="h-6 w-6 text-red-600" />
                                        </div>
                                        <h3 className="mt-5 text-lg font-medium text-gray-900">Delete Client</h3>
                                        <div className="mt-2 text-sm text-gray-500">
                                            <p>
                                                Are you sure you want to delete {clientToDelete.clientCompany ? (
                                                    <>
                                                        the client <span className="font-semibold text-gray-800">"{clientToDelete.clientCompany}"</span>
                                                    </>
                                                ) : (
                                                    "this client"
                                                )}?
                                            </p>
                                            <p className="font-semibold text-red-500">This action cannot be undone.</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDeleteConfirm(false)}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDeleteConfirm(true)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Delete'
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Contacts Popup Modal */}


                    <AnimatePresence>
                        {showContactsPopup && (
                            <motion.div
                                variants={overlayVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm p-2 sm:p-4"
                            >
                                <motion.div
                                    variants={formVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="relative w-[60vw] rounded-lg bg-white shadow-2xl max-h-[95vh] flex flex-col"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 sm:px-6 sm:py-4 flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-blue-200 rounded flex items-center justify-center">
                                                <Users className="w-4 h-4 " />
                                            </div>
                                            <h2 className="text-sm font-medium text-gray-900">
                                                Contact Persons
                                            </h2>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowContactsPopup(false)}
                                            className="text-gray-500 bg-red-500 hover:bg-red-600 text-white hover:text-white h-6 w-6 cursor-pointer"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Table Container */}
                                    <div className="flex-1 overflow-hidden p-3 ">
                                        <div className="overflow-x-auto overflow-y-auto">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-gray-100 z-10">
                                                    <TableRow className="border-b border-gray-200">
                                                        <TableHead className="px-2 py-2 text-xs font-medium text-gray-600  tracking-wider w-[200px] sm:w-[250px]">
                                                            Name
                                                        </TableHead>
                                                        <TableHead className="px-2 py-2 text-xs font-medium text-gray-600  tracking-wider min-w-[180px] hidden sm:table-cell">
                                                            Email
                                                        </TableHead>
                                                        <TableHead className="px-2 py-2 text-xs font-medium text-gray-600  tracking-wider min-w-[120px] hidden md:table-cell">
                                                            Phone
                                                        </TableHead>

                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {currentContacts.map((contact, index) => (
                                                        <TableRow
                                                            key={index}
                                                            className={`hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 ${contact.isPrimary ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : ''
                                                                }`}
                                                        >
                                                            <TableCell className="px-2 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                                        <span className="text-xs font-medium text-blue-700">
                                                                            {contact.name.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-medium text-gray-900 truncate">
                                                                            {contact.name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate sm:hidden">
                                                                            {contact.email}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 hidden sm:table-cell">
                                                                <div className="flex items-center gap-1 text-xs text-gray-700">
                                                                    <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                    <span className="truncate">{contact.email}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 hidden md:table-cell">
                                                                <div className="flex items-center gap-1 text-xs text-gray-700">
                                                                    <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                    <span className="truncate">{contact.phoneNumber}</span>
                                                                </div>
                                                            </TableCell>


                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>



                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </motion.div>
        </DashboardLayout>
    )
}