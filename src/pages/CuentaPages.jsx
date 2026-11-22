import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { pedidoService } from '../services/pedidoService';
import { Cargando, ErrorApi } from '../components/Estado';
import { formatoFecha } from '../utils/format';

/** Perfil, historial de pedidos y licencias del usuario autenticado (cualquier rol). */
export function MiCuenta() {
  const { usuario } = useAuth();
  const pedidos = useApi(() => pedidoService.misPedidos(), []);
  const licencias = useApi(() => pedidoService.misLicencias(), []);

  return (
    <div className="container py-5 text-light" style={{ maxWidth: '950px' }}>
      <h3 className="fw-bold mb-4 pb-2 border-bottom border-secondary border-opacity-25">Mi cuenta</h3>

      <div className="bg-dark rounded-4 p-4 mb-4 border border-secondary border-opacity-25" data-testid="perfil">
        <div className="d-flex flex-wrap justify-content-between gap-2">
          <div>
            <h5 className="fw-bold mb-1">{usuario.nombre}</h5>
            <div className="text-secondary small">{usuario.email}</div>
          </div>
          <span className={`badge align-self-start ${usuario.rol === 'ADMIN' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{usuario.rol}</span>
        </div>
      </div>

      <h5 className="fw-bold mb-3">Mis pedidos</h5>
      <ErrorApi error={pedidos.error} onReintentar={pedidos.recargar} />
      {pedidos.cargando && !pedidos.data && <Cargando />}
      {pedidos.data && pedidos.data.length === 0 && <div className="text-secondary mb-4">Aún no has realizado compras.</div>}
      {pedidos.data && pedidos.data.length > 0 && (
        <div className="table-responsive bg-dark rounded-3 p-3 mb-4 border border-secondary border-opacity-25">
          <table className="table table-dark align-middle mb-0">
            <thead><tr className="text-secondary small"><th>N°</th><th>Fecha</th><th>Estado</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {pedidos.data.map((p) => (
                <tr key={p.id} data-testid="fila-pedido">
                  <td>#{p.id}</td>
                  <td>{formatoFecha(p.fechaPedido)}</td>
                  <td><span className="badge bg-success">{p.estado}</span></td>
                  <td className="fw-bold text-info">${Number(p.total).toFixed(2)}</td>
                  <td className="text-end"><Link to={`/boleta/${p.id}`} className="btn btn-outline-info btn-sm">Ver boleta</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h5 className="fw-bold mb-3">Mis licencias</h5>
      <ErrorApi error={licencias.error} onReintentar={licencias.recargar} />
      {licencias.data && licencias.data.length === 0 && <div className="text-secondary">Tus claves de activación aparecerán aquí.</div>}
      {licencias.data && licencias.data.length > 0 && (
        <div className="table-responsive bg-dark rounded-3 p-3 border border-secondary border-opacity-25">
          <table className="table table-dark align-middle mb-0">
            <thead><tr className="text-secondary small"><th>Juego</th><th>Clave de activación</th><th>Emitida</th></tr></thead>
            <tbody>
              {licencias.data.map((l) => (
                <tr key={l.id}>
                  <td>{l.juegoTitulo}</td>
                  <td><code className="text-info">{l.claveActivacion}</code></td>
                  <td className="small text-secondary">{formatoFecha(l.fechaEmision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
