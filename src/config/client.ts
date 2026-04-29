import axios from 'axios';
import { properties } from './properties';

const client = axios.create({
  baseURL: properties.exchangeRate.apiURL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
