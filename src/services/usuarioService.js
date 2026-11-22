import { http } from './http';

/** Administración de usuarios (requiere rol ADMIN en el backend). */
export const usuarioService = {
  listar: () => http.get('/usuarios'),
  actualizar: (id, datos) => http.put(`/usuarios/${id}`, datos),
  eliminar: (id) => http.delete(`/usuarios/${id}`),
};
