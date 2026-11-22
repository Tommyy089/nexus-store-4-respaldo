import { API_URL } from '../config';
import { sessionStore } from './session';

const MENSAJE_RED = 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';

/** Error de la API con el código HTTP, el mensaje del backend y el detalle por campo (si existe). */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function leerCuerpo(resp) {
  if (resp.status === 204) return null;
  const texto = await resp.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

// Si varias peticiones reciben 401 a la vez, todas esperan la MISMA renovación
// (el refresh token es de un solo uso: renovar dos veces lo invalidaría).
let renovacionEnCurso = null;

async function renovarSesion() {
  if (renovacionEnCurso) return renovacionEnCurso;

  renovacionEnCurso = (async () => {
    const sesion = sessionStore.load();
    if (!sesion?.refreshToken) throw new ApiError(401, 'Tu sesión expiró. Inicia sesión nuevamente.');

    let resp;
    try {
      resp = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: sesion.refreshToken }),
      });
    } catch {
      throw new ApiError(0, MENSAJE_RED); // servidor caído: NO se cierra la sesión
    }

    const datos = await leerCuerpo(resp);
    if (!resp.ok) {
      sessionStore.clear(); // refresh rechazado: la sesión ya no es válida
      throw new ApiError(resp.status, datos?.message || 'Tu sesión expiró. Inicia sesión nuevamente.');
    }
    sessionStore.save({
      accessToken: datos.accessToken,
      refreshToken: datos.refreshToken,
      usuario: datos.usuario,
    });
    return datos.accessToken;
  })();

  try {
    return await renovacionEnCurso;
  } finally {
    renovacionEnCurso = null;
  }
}

/**
 * Petición a la API. Adjunta el access token (Authorization: Bearer ...) y, si el servidor responde 401,
 * intenta renovar la sesión UNA vez con el refresh token y repite la petición.
 */
export async function request(path, { method = 'GET', body, auth = true } = {}, reintento = true) {
  const sesion = auth ? sessionStore.load() : null;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sesion?.accessToken) headers.Authorization = `Bearer ${sesion.accessToken}`;

  let resp;
  try {
    resp = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, MENSAJE_RED);
  }

  if (resp.status === 401 && auth && sesion?.refreshToken && reintento) {
    await renovarSesion(); // lanza ApiError si no se pudo renovar
    return request(path, { method, body, auth }, false);
  }

  const datos = await leerCuerpo(resp);
  if (!resp.ok) {
    throw new ApiError(resp.status, datos?.message || `Error ${resp.status} al comunicarse con el servidor.`, datos?.details || null);
  }
  return datos;
}

export const http = {
  get: (path, opts) => request(path, { ...opts }),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  put: (path, body, opts) => request(path, { method: 'PUT', body, ...opts }),
  delete: (path, opts) => request(path, { method: 'DELETE', ...opts }),
};
