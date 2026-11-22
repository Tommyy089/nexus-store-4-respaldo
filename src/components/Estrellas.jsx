import React from 'react';

export default function Estrellas({ valor = 0, compacto = false }) {
  const nota = Math.max(0, Math.min(5, Number(valor) || 0));
  return <span className={`nexus-stars ${compacto ? 'nexus-stars--small' : ''}`} aria-label={`${nota.toFixed(1)} de 5 estrellas`}>
    {Array.from({ length: 5 }, (_, i) => <i key={i} className={`bi ${nota >= i + 0.75 ? 'bi-star-fill' : nota > i + 0.25 ? 'bi-star-half' : 'bi-star'}`} aria-hidden="true" />)}
  </span>;
}
