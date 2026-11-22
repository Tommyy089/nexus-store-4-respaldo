import React from 'react';

export function Cargando({ texto = 'Cargando...' }) {
  return (
    <div className="text-center text-secondary py-5" data-testid="cargando" role="status">
      <div className="spinner-border spinner-border-sm me-2" aria-hidden="true"></div>
      {texto}
    </div>
  );
}

export function ErrorApi({ error, onReintentar }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert" data-testid="error-api">
      <span>{error.message || 'Ocurrió un error inesperado.'}</span>
      {onReintentar && (
        <button type="button" className="btn btn-sm btn-outline-light" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
