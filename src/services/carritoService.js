/**
 * Carrito de compras del navegador (localStorage). Solo guarda qué producto y cuántas unidades;
 * el precio real y el total los vuelve a calcular el backend al crear el pedido.
 */
const CLAVE = 'nexus_carrito';
export const MAX_POR_JUEGO = 10;

function leer() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardar(items) {
  localStorage.setItem(CLAVE, JSON.stringify(items));
  window.dispatchEvent(new Event('nexus_sync'));
}

export const carritoService = {
  obtener: leer,

  /** Devuelve { ok, mensaje }. Respeta el stock disponible y el máximo por juego. */
  agregar(producto) {
    const stock = Number(producto.stock ?? 0);
    if (stock <= 0) return { ok: false, mensaje: `"${producto.nombre}" está agotado.` };
    const limite = Math.min(stock, MAX_POR_JUEGO);

    const items = leer();
    const idx = items.findIndex((it) => Number(it.id) === Number(producto.id));
    if (idx !== -1) {
      if ((items[idx].cantidad || 1) >= limite) {
        return { ok: false, mensaje: `Solo puedes llevar ${limite} unidad(es) de "${producto.nombre}".` };
      }
      items[idx].cantidad = (items[idx].cantidad || 1) + 1;
      items[idx].stock = stock;
    } else {
      items.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precioFinal ?? producto.precio),
        imagen: producto.imagen,
        stock,
        cantidad: 1,
      });
    }
    guardar(items);
    return { ok: true, mensaje: `"${producto.nombre}" añadido al carrito.` };
  },

  cambiarCantidad(id, delta) {
    const items = leer();
    const it = items.find((x) => Number(x.id) === Number(id));
    if (!it) return;
    const limite = Math.min(Number(it.stock ?? MAX_POR_JUEGO), MAX_POR_JUEGO);
    it.cantidad = Math.max(1, Math.min(limite, (it.cantidad || 1) + delta));
    guardar(items);
  },

  eliminar(id) {
    guardar(leer().filter((it) => Number(it.id) !== Number(id)));
  },

  vaciar() {
    localStorage.removeItem(CLAVE);
    window.dispatchEvent(new Event('nexus_sync'));
  },

  total(items = leer()) {
    return items.reduce((acc, it) => acc + Number(it.precio) * (it.cantidad || 1), 0);
  },
};
