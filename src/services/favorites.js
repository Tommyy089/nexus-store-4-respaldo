/** Lista de deseos local al dispositivo: no cambia precios, compras ni permisos del backend. */
const CLAVE = 'nexus_favoritos_v3';
const EVENTO = 'nexus_favoritos_cambio';

function leer() {
  try {
    if (typeof window === 'undefined') return [];
    const valores = JSON.parse(window.localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(valores) ? [...new Set(valores.map(Number).filter(Number.isFinite))] : [];
  } catch { return []; }
}

export const favoritos = {
  listar: leer,
  contiene: (id) => leer().includes(Number(id)),
  alternar(id) {
    const identificador = Number(id);
    if (!Number.isFinite(identificador) || typeof window === 'undefined') return false;
    const actual = leer();
    const existe = actual.includes(identificador);
    const siguiente = existe ? actual.filter(x => x !== identificador) : [...actual, identificador];
    try { window.localStorage.setItem(CLAVE, JSON.stringify(siguiente)); } catch { return existe; }
    window.dispatchEvent(new Event(EVENTO));
    return !existe;
  },
  suscribir(callback) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENTO, callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener(EVENTO, callback);
      window.removeEventListener('storage', callback);
    };
  },
};
