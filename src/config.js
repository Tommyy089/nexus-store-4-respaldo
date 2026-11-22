// URL base de la API (backend Spring Boot). Se configura con la variable VITE_API_URL (ver .env.example).
export const API_URL = String(import.meta.env?.VITE_API_URL || 'http://localhost:8080/api/v1').replace(/\/+$/, '');
