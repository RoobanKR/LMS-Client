
import axios from 'axios';

const API_BASE_URL = 'https://lms-client-jade-three.vercel.app';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

let usersCache: any = null;
let cacheTimestamp: number = 0;
let cacheVersion: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Store for tracking data changes
let lastDataHash: string = '';
let backgroundRefreshTimer: NodeJS.Timeout | null = null;

// Helper function to create a simple hash of data
const createDataHash = (data: any): string => {
  return JSON.stringify(data).length.toString() + data.length.toString();
};

// Start background refresh for live updates
const startBackgroundRefresh = (institutionId: string, token: string,basedOn:string) => {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
  }

  backgroundRefreshTimer = setInterval(async () => {
    try {
      // Only do background refresh if we have cached data
      if (usersCache) {
        const response = await apiClient.get(`/getAll/userAccess/${institutionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const newUsers = response.data.Users;
        const newHash = createDataHash(newUsers);

        // If data changed, update cache and increment version
        if (newHash !== lastDataHash) {
          usersCache = newUsers;
          cacheTimestamp = Date.now();
          cacheVersion++;
          lastDataHash = newHash;

          // Trigger a custom event to notify components
          window.dispatchEvent(new CustomEvent('usersDataUpdated', {
            detail: { users: newUsers, version: cacheVersion }
          }));
        }
      }
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }, BACKGROUND_REFRESH_INTERVAL);
};

// Stop background refresh
const stopBackgroundRefresh = () => {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
    backgroundRefreshTimer = null;
  }
};

// Enhanced fetchUsers function
export const fetchUsers = async (institutionId: string, token: string,basedOn:string, forceRefresh = false) => {
  const now = Date.now();

  // Return cached data if it's still valid and not forcing refresh
  if (!forceRefresh && usersCache && (now - cacheTimestamp) < CACHE_DURATION) {
    // Start background refresh if not already running
    if (!backgroundRefreshTimer) {
      startBackgroundRefresh(institutionId, token,basedOn);
    }
    return { users: usersCache, version: cacheVersion, fromCache: true };
  }

  try {
    const response = await apiClient.get(`/getAll/userAccess/${institutionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const users = response.data.Users;
    const newHash = createDataHash(users);

    // Update cache
    usersCache = users;
    cacheTimestamp = now;
    lastDataHash = newHash;

    // If this is initial load or force refresh, increment version
    if (forceRefresh || !cacheVersion) {
      cacheVersion++;
    }

    // Start background refresh
    startBackgroundRefresh(institutionId, token, basedOn);

    return { users, version: cacheVersion, fromCache: false };
  } catch (error) {
    // If we have cached data and the request fails, return cached data
    if (usersCache) {
      console.warn('Using cached data due to API error:', error);
      return { users: usersCache, version: cacheVersion, fromCache: true };
    }
    throw error;
  }
};

// Function to invalidate users cache
export const invalidateUsersCache = () => {
  usersCache = null;
  cacheTimestamp = 0;
  cacheVersion = 0;
  lastDataHash = '';
  stopBackgroundRefresh();
};

// Enhanced addUser function
export const addUser = async (userData: any, token: string) => {
  const formattedUserData = {
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phone: userData.phone,
    role: userData.role, // This should be the ObjectId
    gender: userData.gender,
    degree: userData.degree,
    department: userData.department,
    batch: userData.batch,
    semester: userData.semester,
    year: userData.year,
    status: userData.status || "active",
    ...(userData.password && { password: userData.password }),
    // Include default permissions structure that matches your backend
    permission: {
      courseManagement: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
      userManagement: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
      testAccess: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
    }
  };

  try {
    const response = await apiClient.post(
      '/add/users',
      formattedUserData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: any, token: string) => {
  try {
    const response = await apiClient.put(
      `/update/users/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string, token: string) => {
  try {
    const response = await apiClient.delete(
      `/delete/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const toggleUserStatus = async (userId: string, status?: 'active' | 'inactive', token?: string) => {
  try {
    const authToken = token;
    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    const response = await apiClient.put(
      `/user/status/${userId}`,
      status ? { status } : {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }
};

// CORRECTED Bulk Upload API
export const bulkUploadUsers = async (formData: FormData, token: string) => {
  try {
    // Use fetch instead of axios for FormData to properly handle file uploads
    const response = await fetch(`${API_BASE_URL}/user/bulk-upload-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message?.[0]?.value || 'Bulk upload failed');
    }

    const data = await response.json();

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return data;
  } catch (error) {
    console.error('Error in bulk upload:', error);
    throw error;
  }
};

// Alternative bulk upload using axios (if you prefer)
export const bulkUploadUsersAxios = async (formData: FormData, token: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/user/bulk-upload-users`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for large files
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error: any) {
    console.error('Error in bulk upload:', error);
    
    // Enhanced error handling
    if (error.response?.data?.message) {
      const errorMessages = error.response.data.message;
      if (Array.isArray(errorMessages)) {
        const errorMessage = errorMessages.map((msg: { value: string }) => msg.value).join(', ');
        throw new Error(errorMessage);
      } else {
        throw new Error(errorMessages);
      }
    }
    
    throw new Error(error.message || 'Bulk upload failed');
  }
};



// Cleanup function for component unmount
export const cleanup = () => {
  stopBackgroundRefresh();
};

// Get cache info
export const getCacheInfo = () => ({
  hasCache: !!usersCache,
  cacheAge: usersCache ? Date.now() - cacheTimestamp : 0,
  version: cacheVersion
});


export const addParticipantsToCourse = async (courseId: string, participantIds: string[], institutionId: string, token: string, enrollmentData: any = {}) => {
  try {
    const response = await fetch(`https://lms-client-jade-three.vercel.app/add-participants/${courseId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify({
        participantIds,
        enrollmentData: {
          status: enrollmentData.status || 'active',
          enableEnrolmentDates: enrollmentData.enableEnrolmentDates || false,
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add participants');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding participants:', error);
    throw error;
  }
};

export const updateParticipantEnrollment = async (courseId: string, userId: string, enrollmentData: any, institutionId: string, token: string) => {
  try {
    const response = await fetch(`https://lms-client-jade-three.vercel.app/update-enrollment/${courseId}/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify(enrollmentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update enrollment');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating enrollment:', error);
    throw error;
  }
};

export const removeParticipantFromCourse = async (
  courseId: string,
  userId: string,
  institutionId: string,
  token: string
) => {
  try {
    const response = await fetch(
      `https://lms-client-jade-three.vercel.app/delete/participant/${courseId}/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove participant');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
};

export const removeMultipleParticipantsFromCourse = async (
  courseId: string,
  participantIds: string[],
  institutionId: string,
  token: string
) => {
  try {
    console.log('Attempting to remove participants:', {
      courseId,
      participantIds,
      participantIdsCount: participantIds.length
    });

    // First, debug the course structure
    const debugResponse = await fetch(
      `https://lms-client-jade-three.vercel.app/api/debug/course/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
      }
    );

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('Course debug info:', debugData.data);
    }

    // Now attempt to delete
    const response = await fetch(
      `https://lms-client-jade-three.vercel.app/delete-participants/multiple/${courseId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
        body: JSON.stringify({ 
          participantIds: participantIds.map(id => id.toString())
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Delete error response:', errorData);
      throw new Error(errorData.message || 'Failed to remove participants');
    }

    const data = await response.json();
    console.log('Delete successful:', data);
    return data;
  } catch (error) {
    console.error('Error removing participants:', error);
    throw error;
  }
};


export const createGroup = async (courseId: string, groupName: string, groupDescription: string, institutionId: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify({
        courseId,
        groupName,
        groupDescription,
        institution: institutionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create group');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

// Get groups for a course
export const getGroupsByCourse = async (courseId: string, institutionId: string, token: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/course/${courseId}/institution/${institutionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch groups');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

// Add users to group
export const addUsersToGroup = async (groupId: string, participantIds: string[], institutionId: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${groupId}/add-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify({ participantIds, institution: institutionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add users to group');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding users to group:', error);
    throw error;
  }
};

// Remove users from group
export const removeUsersFromGroup = async (groupId: string, participantIds: string[], institutionId: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${groupId}/remove-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify({ participantIds, institution: institutionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove users from group');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing users from group:', error);
    throw error;
  }
};

// Delete group
export const deleteGroup = async (groupId: string, institutionId: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${groupId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify({ institution: institutionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete group');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

// Set group leader
export const setGroupLeader = async (groupId: string, userId: string, institutionId: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${groupId}/set-leader`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'institution': institutionId,
      },
      body: JSON.stringify({ userId, institution: institutionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to set group leader');
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting group leader:', error);
    throw error;
  }
};

// Get group details
export const getGroupDetails = async (groupId: any, institutionId: any, token: any) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/${groupId}/institution/${institutionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch group details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching group details:', error);
    throw error;
  }
};


// Fetch course data with singleParticipants
export const fetchGroupsCourseData = async (courseId: string, institutionId: string, token: string) => {
  try {
    const response = await fetch(
      `https://lms-client-jade-three.vercel.app/getAll/groups/courses-data/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch course data');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid course data response');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching course data:', error);
    throw error;
  }
};


interface RemoveGroupLeaderResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const removeGroupLeader = async (
  groupId: string,
  institution: string,
  token: string
): Promise<RemoveGroupLeaderResponse> => {
  const response = await fetch(
    `https://lms-client-jade-three.vercel.app/remove-group-leader/${groupId}/${institution}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.json();
};