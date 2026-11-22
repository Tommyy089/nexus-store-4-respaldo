import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cargando } from './Estado';

/** Impide acceso vendedor a la experiencia de compra, que es exclusiva de tienda. */
export default function NoVendedor({ children }) {
  const { usuario, autenticado, cargando } = useAuth();
  if (cargando) return <Cargando texto="Verificando sesión..." />;
  if (autenticado && usuario?.rol === 'VENDEDOR') return <Navigate to="/vendedor" replace />;
  return children;
}
