import React from 'react';
import { useAuth } from '../context/AuthContext';

/** Muestra su contenido (botones, secciones, acciones) únicamente a usuarios con alguno de los roles indicados. */
export default function SoloRol({ roles, children, fallback = null }) {
  const { autenticado, usuario } = useAuth();
  if (!autenticado || !roles.includes(usuario.rol)) return fallback;
  return children;
}
