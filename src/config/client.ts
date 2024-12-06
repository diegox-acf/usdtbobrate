import axios from 'axios';
import { properties } from './properties';

const client = axios.create({
  baseURL: properties.exchangeRate.apiURL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// // Optional: Request Interceptor
// axiosClient.interceptors.request.use(
//   (config) => {
//     // Modify config before the request is sent
//     // For example, add an Authorization header
//     const token = 'your-auth-token'; // Get your token from somewhere (e.g., env variables)
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Optional: Response Interceptor
// axiosClient.interceptors.response.use(
//   (response) => {
//     // Do something with the response data
//     return response.data;
//   },
//   (error) => {
//     // Handle errors globally
//     return Promise.reject(error);
//   }
// );

export default client;
