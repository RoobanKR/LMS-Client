"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Users, Edit, Link, Trash2, ChevronLeft, ChevronRight, Plus, X, Upload, Building, User, Mail, Phone, FileText, MapPin, Image } from 'lucide-react'
import { UserTable } from '@/components/ui/alterationTable'
import { cleanup, createClient, deleteClient, fetchClients, invalidateClientsCache, updateClient } from '@/apiServices/dynamicFields/client'

// Define types for the client data
type Client = {
    _id: string
    contactPerson: string
    clientCompany: string
    email: string
    phoneNumber: string
    description: string
    clientAddress: string
    isActive: boolean
}

// Define types for the form data
type FormData = {
    contactPerson: string
    clientCompany: string
    email: string
    phoneNumber: string
    description: string
    clientAddress: string
}

export default function ClientManagement() {
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [clientList, setClientList] = useState<Client[]>([])
    const [showForm, setShowForm] = useState<boolean>(false)
    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [currentClientId, setCurrentClientId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>({
        contactPerson: '',
        clientCompany: '',
        email: '',
        phoneNumber: '',
        description: '',
        clientAddress: ''
    })
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [token, setToken] = useState<string | null>(null)

    useEffect(() => {
        // Get token from localStorage when component mounts
        const storedToken = localStorage.getItem('smartcliff_token')
        setToken(storedToken)
    }, [])

    const usersPerPage = 5
    const totalUsers = clientList.length
    const totalPages = Math.ceil(totalUsers / usersPerPage)

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
    }, [token])

    const loadClients = async () => {
        if (!token) {
            console.error("Authentication token is missing");
            return;
        }
        setIsLoading(true)
        try {
            const response = await fetchClients(token)
            if (response && response.clients) {
                setClientList(response.clients.map((client: any) => ({
                    ...client
                })))
            }
        } catch (error) {
            console.error("Failed to load clients:", error)
            // Handle error (show toast or error message)
        } finally {
            setIsLoading(false)
        }
    }

    const columns = [
        {
            key: 'contactPerson',
            label: 'Name',
            width: '25%',
            align: 'left' as const,
            renderCell: (client: Client) => (
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs sm:text-sm font-medium">
                            {client.contactPerson?.charAt(0).toUpperCase() || 'C'}
                        </span>
                    </div>
                    <div className="ml-2">
                        <div className="text-xs font-medium text-gray-900">
                            {client.contactPerson || 'N/A'}
                        </div>
                        <div className="text-xxs text-gray-500">ID: {client._id?.slice(0, 8) || 'N/A'}...</div>
                    </div>
                </div>
            )
        },
        {
            key: 'email',
            label: 'Email',
            width: '25%',
            align: 'center' as const,
            renderCell: (client: Client) => (
                <span className="text-xs text-gray-900">
                    {client.email || 'N/A'}
                </span>
            )
        },
        {
            key: 'phoneNumber',
            label: 'Phone',
            width: '15%',
            align: 'center' as const,
            renderCell: (client: Client) => (
                <span className="text-xs text-gray-900">
                    {client.phoneNumber || 'N/A'}
                </span>
            )
        },
        {
            key: 'clientCompany',
            label: 'Company',
            width: '15%',
            align: 'center' as const,
            renderCell: (client: Client) => (
                <Badge className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xxs sm:text-xs">
                    {client.clientCompany || 'N/A'}
                </Badge>
            )
        },
    ];

    const actionButtons = {
        edit: (client: Client) => handleEdit(client._id),
        delete: (client: Client) => handleDelete(client._id)
    }

    const handleEdit = (id: string) => {
        // Find the client in the clientList by id
        const clientToEdit = clientList.find(client => client._id === id);

        if (clientToEdit) {
            setFormData({
                contactPerson: clientToEdit.contactPerson || '',
                clientCompany: clientToEdit.clientCompany || '',
                email: clientToEdit.email || '',
                phoneNumber: clientToEdit.phoneNumber || '',
                description: clientToEdit.description || '',
                clientAddress: clientToEdit.clientAddress || ''
            });
            setCurrentClientId(id);
            setIsEditing(true);
            setShowForm(true);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this client?")) {
            try {
                setIsLoading(true)
                await deleteClient(id, token!)
                setClientList(prev => prev.filter(client => client._id !== id))
            } catch (error) {
                console.error("Failed to delete client:", error)
            } finally {
                setIsLoading(false)
            }
        }
    }

    const handleAddNew = () => {
        setFormData({
            contactPerson: '',
            clientCompany: '',
            email: '',
            phoneNumber: '',
            description: '',
            clientAddress: ''
        })
        setCurrentClientId(null)
        setIsEditing(false)
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            console.error("Authentication token is missing");
            return;
        }
        setIsLoading(true);

        try {
            if (isEditing && currentClientId) {
                // Update existing client
                await updateClient(currentClientId, formData, token);
                // Update the client in the local state
                setClientList(prev => prev.map(client =>
                    client._id === currentClientId ? { ...client, ...formData } : client
                ));
            } else {
                // Create new client
                const newClient = await createClient(formData, token);
                // Add the new client to the local state
                setClientList(prev => [...prev, newClient]);
            }
            invalidateClientsCache() // Force refresh of cache
            await loadClients() // Reload clients
            handleCloseForm();
        } catch (error) {
            console.error("Failed to save client:", error);
            // Handle error (show toast or error message)
        } finally {
            setIsLoading(false);
        }
    };

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
                duration: 0.2
            }
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.2
            }
        }
    }

    const staggerChildren = {
        visible: {
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const childVariants = {
        hidden: {
            opacity: 0,
            y: 20
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3
            }
        }
    }

    return (
        <div className="">
            {/* Header with New Button */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Client Management</h3>
                        <p className="text-xs text-gray-600">
                            {isLoading ? 'Loading clients...' : `Showing ${currentUsers.length} of ${totalUsers} clients`}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleAddNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-auto"
                    disabled={isLoading}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    New Client
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {isLoading && clientList.length === 0 ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : clientList.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        No clients found. Click "New Client" to add one.
                    </div>
                ) : (
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
                )}
            </div>

            {/* Client Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white rounded-lg shadow-xl w-[60vw] max-h-[93vh] flex flex-col"
                        >
                            {/* Form Header */}
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Building className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {isEditing ? 'Edit Client' : 'Add New Client'}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            {isEditing ? 'Update the client details' : 'Fill in the details to add a new client'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCloseForm}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={isLoading}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Form Content */}
                            <div className="overflow-y-auto flex-1">
                                <form onSubmit={handleSubmit} className="px-6 py-4">
                                    <motion.div
                                        variants={staggerChildren}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-6"
                                    >
                                        {/* Client Information */}
                                        <motion.div variants={childVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    Client Name *
                                                </Label>
                                                <Input
                                                    id="contactPerson"
                                                    name="contactPerson"
                                                    type="text"
                                                    required
                                                    placeholder="Enter client name"
                                                    value={formData.contactPerson}
                                                    onChange={handleInputChange}
                                                    className="w-full"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="clientCompany" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                    <Building className="h-4 w-4" />
                                                    Company Name *
                                                </Label>
                                                <Input
                                                    id="clientCompany"
                                                    name="clientCompany"
                                                    type="text"
                                                    required
                                                    placeholder="Enter company name"
                                                    value={formData.clientCompany}
                                                    onChange={handleInputChange}
                                                    className="w-full"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </motion.div>

                                        {/* Contact Information */}
                                        <motion.div variants={childVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                    <Mail className="h-4 w-4" />
                                                    Email Address *
                                                </Label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    required
                                                    placeholder="Enter email address"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    className="w-full"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    Phone Number *
                                                </Label>
                                                <Input
                                                    id="phoneNumber"
                                                    name="phoneNumber"
                                                    type="tel"
                                                    required
                                                    placeholder="Enter phone number"
                                                    value={formData.phoneNumber}
                                                    onChange={handleInputChange}
                                                    className="w-full"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </motion.div>

                                        {/* Description */}
                                        <motion.div variants={childVariants} className="space-y-2">
                                            <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Description
                                            </Label>
                                            <Textarea
                                                id="description"
                                                name="description"
                                                placeholder="Enter client description or notes"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full resize-none"
                                                disabled={isLoading}
                                            />
                                        </motion.div>

                                        {/* Company Address */}
                                        <motion.div variants={childVariants} className="space-y-2">
                                            <Label htmlFor="clientAddress" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Company Address
                                            </Label>
                                            <Textarea
                                                id="clientAddress"
                                                name="clientAddress"
                                                placeholder="Enter complete company address"
                                                value={formData.clientAddress}
                                                onChange={handleInputChange}
                                                rows={2}
                                                className="w-full resize-none"
                                                disabled={isLoading}
                                            />
                                        </motion.div>


                                    </motion.div>
                                </form>
                            </div>
                            {/* Form Actions */}
                            <motion.div
                                variants={childVariants}
                                className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white z-10"
                            >
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span>Processing...</span>
                                        ) : (
                                            <>
                                                {isEditing ? (
                                                    <Edit className="h-4 w-4 mr-2" />
                                                ) : (
                                                    <Plus className="h-4 w-4 mr-2" />
                                                )}
                                                {isEditing ? 'Update Client' : 'Add Client'}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseForm}
                                        className="flex-1 py-2.5"
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}