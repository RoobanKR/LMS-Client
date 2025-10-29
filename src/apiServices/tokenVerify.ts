import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

export const verifyToken = async (token: string) => {
  const response = await axios.post(`${API_BASE_URL}/user/verify-token`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const fetchDashboardData = async (token: string) => {
  const response = await axios.get(`${API_BASE_URL}/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};



export const logoutUser = async (token: string) => {
  const response = await axios.post(`${API_BASE_URL}/logout`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    withCredentials: true // Include cookies
  });
  return response.data;
};