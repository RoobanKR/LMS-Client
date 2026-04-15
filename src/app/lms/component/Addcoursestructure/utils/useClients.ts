// AddCourseSettingsPopup/hooks/useClients.ts
import { useState, useCallback } from 'react';
import { cleanup, fetchClients } from '@/apiServices/dynamicFields/client';
import { Client } from '../types';

interface UseClientsProps {
    isOpen: boolean;
}

export const useClients = ({ isOpen }: UseClientsProps) => {
    const [clientList, setClientList] = useState<Client[]>([]);
    const [isClientsLoading, setIsClientsLoading] = useState(true);

    const loadClients = useCallback(async () => {
        const token = localStorage.getItem('smartcliff_token');
        if (!token) {
            console.error("Authentication token is missing");
            setIsClientsLoading(false);
            return;
        }
        
        setIsClientsLoading(true);
        try {
            const response = await fetchClients(token);
            if (response?.clients) {
                setClientList(response.clients.map((client: any) => ({ ...client })));
            }
        } catch (error) {
            console.error("Failed to load clients:", error);
        } finally {
            setIsClientsLoading(false);
        }
    }, []);

    return {
        clientList,
        isClientsLoading,
        loadClients,
        cleanup
    };
};