import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { sessionStore } from '../services/session';

const AuthContext = createContext(null);

/** Sesión React + persistencia entre recargas. Nunca se almacena la contraseña. */
export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => sessionStore.load());
  const [cargando, setCargando] = useState(() => Boolean(sessionStore.load()));

  // Incluye renovaciones automáticas efectuadas por services/http.js y otras pestañas.
  useEffect(() => sessionStore.subscribe(() => {
    const actual = sessionStore.load();
    setSesion(actual);
    if (!actual) setCargando(false);
  }), []);

  useEffect(() => {
    let activo = true;
    const inicial = sessionStore.load();
    if (!inicial) {
      setSesion(null);
      setCargando(false);
      return undefined;
    }

    const validarSesion = async () => {
      try {
        const usuario = await authService.me();
        if (!activo) return;
        const actual = sessionStore.load();
        // Si el usuario cerró la sesión durante la petición, no volver a crearla.
        if (actual) {
          const siguiente = { ...actual, usuario };
          sessionStore.save(siguiente);
          setSesion(siguiente);
        } else {
          setSesion(null);
        }
      } catch (error) {
        if (!activo) return;
        // Los errores de red (status 0) no invalidan la sesión guardada.
        // Un 401/403 u otro rechazo del servidor elimina la sesión de forma explícita.
        if (error?.status !== 0) {
          sessionStore.clear();
          setSesion(null);
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    void validarSesion();
    return () => { activo = false; };
  }, []);

  const login = useCallback(async (email, password, recordar = false) => {
    const datos = await authService.login(email, password);
    const siguiente = {
      accessToken: datos.accessToken,
      refreshToken: datos.refreshToken,
      usuario: datos.usuario,
    };
    sessionStore.save(siguiente, recordar);
    setSesion(siguiente);
    setCargando(false);
    return datos.usuario;
  }, []);

  const registro = useCallback(async (formulario) => {
    const datos = await authService.registro(formulario);
    const siguiente = {
      accessToken: datos.accessToken,
      refreshToken: datos.refreshToken,
      usuario: datos.usuario,
    };
    sessionStore.save(siguiente, false);
    setSesion(siguiente);
    setCargando(false);
    return datos.usuario;
  }, []);

  const logout = useCallback(async () => {
    const actual = sessionStore.load();
    // Se borra inmediatamente la sesión local; la revocación no bloquea la salida.
    sessionStore.clear();
    setSesion(null);
    setCargando(false);
    try {
      if (actual?.refreshToken) await authService.logout(actual.refreshToken);
    } catch {
      // Sin conexión, la revocación remota queda pendiente hasta recuperar el servidor.
    }
  }, []);

  const value = useMemo(() => {
    const usuario = sesion?.usuario ?? null;
    return {
      usuario,
      autenticado: Boolean(sesion?.accessToken && usuario),
      esAdmin: usuario?.rol === 'ADMIN',
      cargando: cargando && Boolean(sesion),
      login,
      registro,
      logout,
    };
  }, [sesion, cargando, login, registro, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
