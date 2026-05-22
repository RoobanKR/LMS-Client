// apiServices/progress.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

export interface StudentProgress {
  visitedNodes: string[];
  openedResources: string[];
  completedExercises: string[];
  lastVisitedNode: string;
  lastVisitedAt: Date | null;
}

/**
 * Record a node visit (when user clicks on module/submodule/topic/subtopic)
 */
export const recordNodeVisit = async (
  userId: string,
  courseId: string,
  nodeId: string
): Promise<{ success: boolean }> => {
  try {
    const token = localStorage.getItem('smartcliff_token');
    
    if (!token) {
      console.warn('No auth token found, skipping progress tracking');
      return { success: false };
    }

    const response = await axios.patch(
      `${API_BASE_URL}/progress/${userId}/courses/${courseId}/visit-node`,
      { nodeId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (response.data.success) {
      console.log(`✅ Node visit recorded: ${nodeId}`);
    }
    
    return { success: response.data.success };
  } catch (error) {
    console.error('Failed to record node visit:', error);
    return { success: false };
  }
};

/**
 * Record a resource open (when user opens PDF, video, PPT, ZIP, link, etc.)
 */
export const recordResourceOpen = async (
  userId: string,
  courseId: string,
  resourceId: string
): Promise<{ success: boolean }> => {
  try {
    const token = localStorage.getItem('smartcliff_token');
    
    if (!token) {
      console.warn('No auth token found, skipping progress tracking');
      return { success: false };
    }

    const response = await axios.patch(
      `${API_BASE_URL}/progress/${userId}/courses/${courseId}/open-resource`,
      { resourceId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (response.data.success) {
      console.log(`✅ Resource open recorded: ${resourceId}`);
    }
    
    return { success: response.data.success };
  } catch (error) {
    console.error('Failed to record resource open:', error);
    return { success: false };
  }
};

/**
 * Fetch student progress for a specific course
 */
export const fetchStudentProgress = async (
  userId: string,
  courseId: string
): Promise<StudentProgress | null> => {
  try {
    const token = localStorage.getItem('smartcliff_token');
    
    if (!token) {
      console.warn('No auth token found, cannot fetch progress');
      return null;
    }

    const response = await axios.get(
      `${API_BASE_URL}/progress/${userId}/courses/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data.success && response.data.data?.progress) {
      return response.data.data.progress;
    }
    
    return {
      visitedNodes: [],
      openedResources: [],
      completedExercises: [],
      lastVisitedNode: '',
      lastVisitedAt: null
    };
  } catch (error) {
    console.error('Failed to fetch student progress:', error);
    return null;
  }
};