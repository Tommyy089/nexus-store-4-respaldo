import { http } from './http';

const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';

/** API (titulo, imagenUrl...) -> modelo que usa la interfaz (nombre, imagen, oferta...). */
export function aJuegoUi(j) {
  const descuento = Number(j.descuento ?? 0);
  return {
    id: j.id,
    nombre: j.titulo,
    tipoJuego: j.tipoJuego,
    categoria: j.categoria,
    precio: Number(j.precio),
    precioFinal: Number(j.precioFinal ?? j.precio),
    descuento,
    oferta: descuento > 0,
    stock: Number(j.stock ?? 0),
    imagen: j.imagenUrl || IMAGEN_POR_DEFECTO,
    descripcion: j.descripcion || '',
  };
}

/** Formulario del admin -> cuerpo que espera la API. */
export function aJuegoApi(f) {
  return {
    titulo: String(f.nombre ?? '').trim(),
    tipoJuego: f.tipoJuego || 'Licencia digital',
    categoria: String(f.categoria ?? '').trim(),
    precio: Number(f.precio),
    descuento: Number(f.descuento || 0),
    stock: Number(f.stock),
    imagenUrl: f.imagen ? String(f.imagen).trim() : null,
    descripcion: f.descripcion ? String(f.descripcion).trim() : null,
  };
}

export const juegoService = {
  async listar({ q, categoria } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoria && categoria !== 'Todas') params.set('categoria', categoria);
    const qs = params.toString();
    const datos = await http.get(`/juegos${qs ? `?${qs}` : ''}`, { auth: false });
    return datos.map(aJuegoUi);
  },
  async obtener(id) {
    return aJuegoUi(await http.get(`/juegos/${id}`, { auth: false }));
  },
  categorias: () => http.get('/juegos/categorias', { auth: false }),
  async crear(form) {
    return aJuegoUi(await http.post('/juegos', aJuegoApi(form)));
  },
  async actualizar(id, form) {
    return aJuegoUi(await http.put(`/juegos/${id}`, aJuegoApi(form)));
  },
  eliminar: (id) => http.delete(`/juegos/${id}`),
};
