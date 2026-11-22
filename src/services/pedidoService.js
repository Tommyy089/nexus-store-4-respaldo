import { http } from './http';

export const pedidoService = {
  crear: (payload) => http.post('/pedidos', payload),
  misPedidos: () => http.get('/pedidos/mis-pedidos'),
  todos: () => http.get('/pedidos'),
  obtener: (id) => http.get(`/pedidos/${id}`),
  anular: (id) => http.delete(`/pedidos/${id}`),
  misLicencias: () => http.get('/licencias/mis-licencias'),
};
