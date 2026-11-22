import { http } from './http';

/** Endpoints de autenticación del backend (/api/auth/*). */
export const authService = {
  login: (email, password) => http.post('/auth/login', { email, password }, { auth: false }),
  registro: (datos) => http.post('/auth/registro', datos, { auth: false }),
  logout: (refreshToken) => http.post('/auth/logout', { refreshToken }, { auth: false }),
  me: () => http.get('/auth/me'),
};
