import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Building, Search, Edit, Eye, Trash2, ChevronLeft, ChevronRight, X, Loader2, AlertTriangle, HelpCircle, Send } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useCreateServiceModal,
  useUpdateServiceModal,
  useDeleteServiceModal
} from '@/apiServices/dynamicFields/servicemodel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ServiceModal {
  id: string;
  name: string;
  description: string;
}

interface Service {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  description: string;
  serviceModals: ServiceModal[];
}

interface ServiceFormData {
  name: string;
  description: string;
}

interface ModelFormData {
  name: string;
  description: string;
}

const ITEMS_PER_PAGE = 5;

export default function ServiceManagementComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceModalsPopup, setShowServiceModalsPopup] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingModel, setEditingModel] = useState<ServiceModal | null>(null);
  const [serviceFormData, setServiceFormData] = useState<ServiceFormData>({ name: '', description: '' });
  const [modelFormData, setModelFormData] = useState<ModelFormData>({ name: '', description: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [modelCurrentPage, setModelCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [showModelDeleteConfirm, setShowModelDeleteConfirm] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<ServiceModal | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const institutionId = typeof window !== 'undefined' ? localStorage.getItem('smartcliff_institution') || '' : '';

  useEffect(() => {
    const storedToken = localStorage.getItem('smartcliff_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // React Query hooks
  const {
    data: services = [],
    isLoading: isLoadingServices,
    isFetching: isFetchingServices,
  } = useServices(institutionId, token || '');

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const createServiceModalMutation = useCreateServiceModal();
  const updateServiceModalMutation = useUpdateServiceModal();
  const deleteServiceModalMutation = useDeleteServiceModal();

  // Filter services based on search
  const filteredServices = services.filter((service: Service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalModelPages = selectedService ? Math.ceil(selectedService.serviceModals.length / ITEMS_PER_PAGE) : 0;
  const paginatedModels = selectedService ? selectedService.serviceModals.slice(
    (modelCurrentPage - 1) * ITEMS_PER_PAGE,
    modelCurrentPage * ITEMS_PER_PAGE
  ) : [];

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewServiceModals = (service: Service) => {
    setSelectedService(service);
    setShowServiceModalsPopup(true);
    setModelCurrentPage(1);
  };

  const handleAddNewService = () => {
    setEditingService(null);
    setServiceFormData({ name: '', description: '' });
    setShowServiceForm(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceFormData({ name: service.name, description: service.description });
    setShowServiceForm(true);
  };

  const handleDeleteService = (service: Service) => {
    setServiceToDelete(service);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      if (!token) throw new Error("Authentication token not found.");
      await deleteServiceMutation.mutateAsync({ id: serviceToDelete.id, token });
      toast.success('Service deleted successfully');
      setShowDeleteConfirm(false);
      if (paginatedServices.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error: any) {
      console.error('Error deleting service:', error);
      toast.error(error.message || 'Error deleting service');
    } finally {
      setServiceToDelete(null);
    }
  };

  const handleDeleteModel = (model: ServiceModal) => {
    setModelToDelete(model);
    setShowModelDeleteConfirm(true);
  };

  const confirmDeleteModel = async () => {
    if (!modelToDelete || !selectedService) return;
    try {
      if (!token) throw new Error("Authentication token not found.");
      await deleteServiceModalMutation.mutateAsync({
        serviceId: selectedService.id,
        modalId: modelToDelete.id,
        institutionId: institutionId,
        token
      });
      toast.success('Model deleted successfully');
      setShowModelDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error deleting model:', error);
      toast.error(error.message || 'Error deleting model');
    } finally {
      setModelToDelete(null);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const serviceData = {
        name: serviceFormData.name,
        title: serviceFormData.name,
        description: serviceFormData.description
      };

      if (editingService) {
        if (!token) throw new Error("Authentication token not found.");
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          data: serviceData,
          token
        });
        toast.success('Service updated successfully');
      } else {
        if (!token) throw new Error("Authentication token not found.");
        await createServiceMutation.mutateAsync({ serviceData, token });
        toast.success('Service created successfully');
        setCurrentPage(1);
      }
      setShowServiceForm(false);
    } catch (error: any) {
      console.error('Error submitting service:', error);
      toast.error(error.message || 'Error submitting service');
    }
  };

  const handleAddNewModel = () => {
    setEditingModel(null);
    setModelFormData({ name: '', description: '' });
    setShowModelForm(true);
  };

  const handleEditModel = (model: ServiceModal) => {
    setEditingModel(model);
    setModelFormData({
      name: model.name,
      description: model.description
    });
    setShowModelForm(true);
  };

  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      const modalData = {
        title: modelFormData.name,
        description: modelFormData.description,
        serviceId: selectedService.id,
        institutionId: institutionId
      };

      if (editingModel) {
        if (!token) throw new Error("Authentication token not found.");
        await updateServiceModalMutation.mutateAsync({
          serviceId: selectedService.id,
          modalId: editingModel.id,
          data: {
            title: modelFormData.name,
            description: modelFormData.description
          },
          institutionId,
          token
        });
        toast.success('Model updated successfully');
      } else {
        if (!token) throw new Error("Authentication token not found.");
        await createServiceModalMutation.mutateAsync({ modalData, token });
        toast.success('Model added successfully');
      }
      setShowModelForm(false);
    } catch (error: any) {
      console.error('Error submitting model:', error);
      toast.error(error.message || 'Error submitting model');
    }
  };

  const renderSinoCell = (index: number) => (
    <div className="flex items-center justify-center">
      <span className="text-xs font-medium text-gray-700">
        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
      </span>
    </div>
  );

  const renderServiceTypeCell = (service: Service) => (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
        <Building className="h-3 w-3 text-blue-600" />
      </div>
      <div>
        <div className="font-medium text-gray-900 text-xs">{service.name}</div>
        <div className="text-xs text-gray-400">Service ID: #{service.id.slice(-6)}</div>
      </div>
    </div>
  );

  const renderDescriptionCell = (service: Service) => (
    <p className="text-xs text-gray-600 truncate max-w-xs" title={service.description}>
      {service.description}
    </p>
  );

  const renderActionButtons = (service: Service) => (
    <div className="flex justify-center space-x-1">
      <motion.button
        className="text-green-600 hover:text-green-900 hover:bg-green-50 h-6 w-6 p-1 rounded"
        onClick={() => handleEditService(service)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Edit Service"
      >
        <Edit className="h-4 w-4" />
      </motion.button>
      <motion.button
        className="text-red-600 hover:text-red-900 hover:bg-red-50 h-6 w-6 p-1 rounded"
        onClick={() => handleDeleteService(service)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Delete Service"
      >
        <Trash2 className="h-4 w-4" />
      </motion.button>
    </div>
  );

  const renderServiceModalCell = (service: Service) => (
    <div
      className="text-center text-xs text-blue-600 font-semibold cursor-pointer hover:underline"
      onClick={() => handleViewServiceModals(service)}
    >
      {service.serviceModals.length > 0 ? ` ${service.serviceModals.length} Click to view` : "0 Click to add"}
    </div>
  );

  const columns = [
    { key: 'sino', label: 'S.No', align: 'center', width: '5%', renderCell: (_: Service, index: number) => renderSinoCell(index) },
    { key: 'serviceType', label: 'Service Type', align: 'left', width: '30%', renderCell: renderServiceTypeCell },
    { key: 'description', label: 'Description', align: 'left', width: '40%', renderCell: renderDescriptionCell },
    { key: 'serviceModals', label: 'Service Modals', align: 'center', width: '15%', renderCell: renderServiceModalCell },
  ];

  const isLoading =
    createServiceMutation.isPending ||
    updateServiceMutation.isPending ||
    deleteServiceMutation.isPending ||
    createServiceModalMutation.isPending ||
    updateServiceModalMutation.isPending ||
    deleteServiceModalMutation.isPending;

  const SkeletonRow = () => (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <TableCell className="px-2 py-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
      <TableCell className="px-2 py-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-2 py-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
      <TableCell className="px-2 py-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
      <TableCell className="px-2 py-4">
        <div className="flex justify-center space-x-1">
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </TableCell>
    </motion.tr>
  );

  return (
    <>
      <motion.div
        className="bg-white shadow-sm rounded-lg border flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building className="h-3 w-3 text-blue-600" />
            <div>
              <h3 className="text-xs font-medium text-gray-900">Service Management</h3>
              <p className="text-xs text-gray-500">Manage service types and models</p>
            </div>
          </div>
          <Button
            onClick={handleAddNewService}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-6"
            disabled={isLoadingServices}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Service
          </Button>
        </div>

        {/* Filters */}
        <div className="px-3 py-2 border-b bg-gray-25 flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Total Services:</span>
            <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              {filteredServices.length}
            </span>
          </div>
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-6 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent w-full"
              disabled={isLoadingServices}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto" style={{ height: '300px' }}>
          <Table className="min-w-full divide-y divide-gray-200">
            <TableHeader className="bg-gray-100 sticky top-0 z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`px-2 py-2 text-xs font-medium text-gray-700 tracking-wider whitespace-nowrap ${column.width || ''}`}
                    style={{
                      textAlign: (column.align as 'left' | 'right' | 'center' | 'justify' | 'start' | 'end' | undefined) || 'center',
                      width: column.width || 'auto'
                    }}
                  >
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="px-2 py-2 text-xs font-medium text-gray-700 tracking-wider whitespace-nowrap w-[10%] text-center sticky right-0 bg-gray-100">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody
              className="bg-white divide-y divide-gray-200"
              initial="initial"
              animate="animate"
              variants={{
                animate: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {isLoadingServices ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => <SkeletonRow key={index} />)
              ) : isFetchingServices ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-500">Refreshing data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredServices.length > 0 ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => {
                  const service = paginatedServices[index];
                  return service ? (
                    <motion.tr
                      key={service.id}
                      className="hover:bg-gray-50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={`${service.id}-${column.key}`}
                          className={`px-2 py-2 whitespace-nowrap text-xs ${column.align === 'left' ? 'text-left' :
                            column.align === 'right' ? 'text-right' : 'text-center'
                            }`}
                        >
                          {column.renderCell(service, index)}
                        </TableCell>
                      ))}
                      <TableCell className="px-2 py-2 whitespace-nowrap text-center text-xs sticky right-0 bg-white hover:bg-gray-50">
                        {renderActionButtons(service)}
                      </TableCell>
                    </motion.tr>
                  ) : (
                    <TableRow key={`empty-${index}`} className="h-[45px]">
                      <TableCell colSpan={columns.length + 1} />
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="px-4 py-10 text-center text-sm text-gray-500">
                    No services found {searchTerm ? 'matching your search' : ''}
                  </TableCell>
                </TableRow>
              )}
            </motion.tbody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-600">
            Showing {paginatedServices.length} of {filteredServices.length} services
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoadingServices}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isLoadingServices || totalPages === 0}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Service Models Popup */}
      <AnimatePresence>
        {showServiceModalsPopup && selectedService && (
          <motion.div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowServiceModalsPopup(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popup Header */}
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Service Models</h3>
                    <p className="text-xs text-gray-500">{selectedService.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-6"
                    onClick={handleAddNewModel}
                    disabled={isLoading}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Model
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowServiceModalsPopup(false)}
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Popup Content */}
              <div className="overflow-y-auto flex-grow">
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-100 sticky top-0">
                    <TableRow>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-[15%]">S.No</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-left w-[35%]">Model Name</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-left w-[40%]">Description</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-[10%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {selectedService.serviceModals.length > 0 ? (
                      Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => {
                        const model = paginatedModels[index];
                        const modelIndex = (modelCurrentPage - 1) * ITEMS_PER_PAGE + index;
                        return model ? (
                          <motion.tr
                            key={model.id}
                            className="hover:bg-gray-50"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <TableCell className="px-3 py-2 text-center text-xs">
                              <span className="font-medium text-gray-700">{modelIndex + 1}</span>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs">
                              <div className="font-medium text-gray-900">{model.name}</div>
                              <div className="text-xs text-gray-400">ID: #{model.id.slice(-6)}</div>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs text-gray-700">
                              {model.description}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-center text-xs">
                              <div className="flex justify-center space-x-2">
                                <motion.button
                                  className="text-green-600 hover:text-green-900 hover:bg-green-50 h-7 w-7 p-1 rounded flex items-center justify-center"
                                  onClick={() => handleEditModel(model)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  title="Edit Model"
                                  disabled={isLoading}
                                >
                                  <Edit className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                  className="text-red-600 hover:text-red-900 hover:bg-red-50 h-7 w-7 p-1 rounded flex items-center justify-center"
                                  onClick={() => handleDeleteModel(model)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  title="Delete Model"
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ) : (
                          <TableRow key={`empty-model-${index}`} className="h-[53px]">
                            <TableCell colSpan={4} />
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                          No models found for this service
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Popup Footer */}
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
                <div className="text-xs text-gray-600">
                  Showing {paginatedModels.length} of {selectedService.serviceModals.length} models
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => setModelCurrentPage(p => Math.max(1, p - 1))}
                    disabled={modelCurrentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-gray-600">
                    Page {modelCurrentPage} of {totalModelPages}
                  </span>
                  <Button
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => setModelCurrentPage(p => Math.min(totalModelPages, p + 1))}
                    disabled={modelCurrentPage === totalModelPages || isLoading || totalModelPages === 0}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Form Popup */}
      <AnimatePresence>
        {showServiceForm && (
          <motion.div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowServiceForm(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ ease: "easeInOut", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {editingService ? 'Edit Service' : 'Add New Service'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {editingService ? 'Update the details of the existing service.' : 'Create a new service for your institution.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-200/50"
                    onClick={() => setShowServiceForm(false)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <form onSubmit={handleServiceSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Service Name
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">The official name of the service.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={serviceFormData.name}
                      onChange={(e) => setServiceFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., 'Software Development'"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">A brief summary of what this service includes.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <textarea
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Describe the service..."
                    rows={4}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowServiceForm(false)}
                    className="px-6 py-2 text-sm rounded-full transition-all"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm rounded-full shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Send className="h-4 w-4 animate-spin" />
                        {editingService ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {editingService ? 'Update Service' : 'Create Service'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Form Popup */}
      <AnimatePresence>
        {showModelForm && (
          <motion.div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModelForm(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ ease: "easeInOut", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {editingModel ? 'Edit Model' : 'Add New Model'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {editingModel ? 'Update the details of this model.' : `Add a new model to the "${selectedService?.name}" service.`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-200/50"
                    onClick={() => setShowModelForm(false)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <form onSubmit={handleModelSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Model Name
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">A specific variation or type of the service.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={modelFormData.name}
                      onChange={(e) => setModelFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., 'Frontend Development'"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Describe what this specific model entails.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <textarea
                    value={modelFormData.description}
                    onChange={(e) => setModelFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Describe the model..."
                    rows={4}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModelForm(false)}
                    className="px-6 py-2 text-sm rounded-full transition-all"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm rounded-full shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Send className="h-4 w-4 animate-spin" />
                        {editingService ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {editingService ? 'Update Modal' : 'Create Modal'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Popup */}
      <AnimatePresence>
        {showDeleteConfirm && serviceToDelete && (
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
                <h3 className="mt-5 text-lg font-medium text-gray-900">Delete Service</h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>Are you sure you want to delete the service "{serviceToDelete.name}"?</p>
                  <p className="font-semibold text-red-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteServiceMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteService}
                  disabled={deleteServiceMutation.isPending}
                >
                  {deleteServiceMutation.isPending ? (
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

      {/* Model Delete Confirmation Popup */}
      <AnimatePresence>
        {showModelDeleteConfirm && modelToDelete && (
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
                <h3 className="mt-5 text-lg font-medium text-gray-900">Delete Model</h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>Are you sure you want to delete the model "{modelToDelete.name}"?</p>
                  <p className="font-semibold text-red-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowModelDeleteConfirm(false)}
                  disabled={deleteServiceModalMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteModel}
                  disabled={deleteServiceModalMutation.isPending}
                >
                  {deleteServiceModalMutation.isPending ? (
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
    </>
  );
}
