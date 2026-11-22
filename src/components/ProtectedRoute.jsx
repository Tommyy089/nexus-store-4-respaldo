import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cargando } from './Estado';

/**
 * Protege una RUTA completa.
 *  - Sin sesión            -> /login (recuerda a dónde quería ir el usuario).
 *  - Con sesión sin el rol -> /acceso-denegado.
 *  - Mientras se valida la sesión guardada se muestra "Cargando" (evita parpadeos al recargar).
 * IMPORTANTE: esto es comodidad/UX. La seguridad real está en el backend (JWT + roles), que rechaza con
 * 401/403 cualquier petición no autorizada aunque alguien manipule el frontend.
 */
export default function ProtectedRoute({ roles, children }) {
  const { autenticado, usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <Cargando texto="Verificando sesión..." />;
  if (!autenticado) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/acceso-denegado" replace />;
  return children;
}
