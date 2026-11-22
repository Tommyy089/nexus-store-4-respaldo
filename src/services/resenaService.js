import { http } from './http';

/** Las valoraciones son persistentes en Oracle; ningún promedio se inventa en el cliente. */
export const resenaService = {
  listar: (juegoId) => http.get(`/juegos/${encodeURIComponent(juegoId)}/resenas`, { auth: false }),
  resumen: () => http.get('/resenas/resumen', { auth: false }),
  guardar: (juegoId, form) => http.put(`/juegos/${encodeURIComponent(juegoId)}/resenas/mia`, {
    puntuacion: Number(form.puntuacion),
    titulo: String(form.titulo ?? '').trim(),
    comentario: String(form.comentario ?? '').trim(),
  }),
  eliminar: (juegoId) => http.delete(`/juegos/${encodeURIComponent(juegoId)}/resenas/mia`),
};
