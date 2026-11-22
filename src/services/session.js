/**
 * Almacenamiento de la sesión (tokens + datos del usuario).
 *
 * - Por defecto se guarda en sessionStorage: sobrevive a las recargas de página (F5) y se borra al cerrar
 *   la pestaña.
 * - Si el usuario marca "Mantener sesión iniciada" se guarda en localStorage (sobrevive al cerrar el navegador).
 * - Nunca se guarda la contraseña.
 *
 * Cada cambio emite el evento "nexus_session_changed" para que React (AuthContext) se mantenga sincronizado.
 */
const CLAVE = 'nexus_session';
const EVENTO = 'nexus_session_changed';

function leer(storage) {
  try {
    const raw = storage.getItem(CLAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function emitir() {
  window.dispatchEvent(new Event(EVENTO));
}

export const sessionStore = {
  /** Devuelve { accessToken, refreshToken, usuario } o null. */
  load() {
    return leer(window.sessionStorage) || leer(window.localStorage);
  },

  /** `recordar` undefined => conserva el almacenamiento donde ya estaba la sesión. */
  save(sesion, recordar) {
    const enLocal = recordar ?? Boolean(leer(window.localStorage));
    const destino = enLocal ? window.localStorage : window.sessionStorage;
    const otro = enLocal ? window.sessionStorage : window.localStorage;
    try {
      destino.setItem(CLAVE, JSON.stringify(sesion));
      otro.removeItem(CLAVE);
    } catch {
      /* almacenamiento no disponible (modo privado estricto): la sesión vivirá solo en memoria de React */
    }
    emitir();
  },

  clear() {
    try {
      window.sessionStorage.removeItem(CLAVE);
      window.localStorage.removeItem(CLAVE);
    } catch {
      /* nada que limpiar */
    }
    emitir();
  },

  subscribe(fn) {
    window.addEventListener(EVENTO, fn);
    window.addEventListener('storage', fn); // cambios hechos desde otra pestaña
    return () => {
      window.removeEventListener(EVENTO, fn);
      window.removeEventListener('storage', fn);
    };
  },
};
