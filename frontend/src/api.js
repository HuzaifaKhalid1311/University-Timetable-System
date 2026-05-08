import axios from 'axios';
export const API = 'http://localhost:3000';
export const api = axios.create({ baseURL: API });
