import React, { useState } from 'react';
import { juegoService } from '../services/juegoService';
import { pedidoService } from '../services/pedidoService';
import { useApi } from '../hooks/useApi';

/** El vendedor solo puede leer inventario y órdenes, sin carrito, edición ni claves. */
export default function VendedorDashboard() {
  const juegos = useApi(() => juegoService.listar(), []);
  const pedidos = useApi(() => pedidoService.todos(), []);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const verPedido = async (id) => {
    setErrorDetalle('');
    setDetalle(null);
    setCargandoDetalle(true);
    try {
      const datos = await pedidoService.obtener(id);
      setDetalle(datos);
    } catch (error) {
      setErrorDetalle(error?.message || 'No se pudo obtener el pedido.');
    } finally {
      setCargandoDetalle(false);
    }
  };

  return (
    <div className="container py-5 text-light">
      <h1 className="h2 mb-3">Panel de vendedor</h1>
      <p className="text-secondary">Consulta de productos y pedidos. Sin permisos para modificar datos.</p>
      <section className="mb-5">
        <h2 className="h4">Productos</h2>
        {juegos.cargando && <p>Cargando productos...</p>}
        {juegos.error && <p role="alert" className="text-danger">{juegos.error.message}</p>}
        {!juegos.cargando && !juegos.error && (
          <div className="table-responsive">
            <table className="table table-dark table-striped">
              <thead><tr><th>Juego</th><th>Categoría</th><th>Descripción</th><th>Precio (USD)</th><th>Stock</th><th>Detalle</th></tr></thead>
              <tbody>
                {(juegos.data ?? []).map((j) => (
                  <tr key={j.id}><td>{j.nombre}</td><td>{j.categoria}</td>
                    <td>{j.descripcion}</td><td>${Number(j.precioFinal).toFixed(2)}</td><td>{j.stock}</td>
                    <td><button type="button" className="btn btn-outline-info btn-sm"
                      onClick={() => setProductoSeleccionado(j)}>Ver detalle</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {productoSeleccionado && <div className="card bg-dark text-light p-3 border-secondary mt-3">
          <h3 className="h5">{productoSeleccionado.nombre}</h3>
          <p>{productoSeleccionado.descripcion}</p>
          <p>Tipo: {productoSeleccionado.tipoJuego} · Categoría: {productoSeleccionado.categoria} · Stock: {productoSeleccionado.stock}</p>
          <p>Precio: ${Number(productoSeleccionado.precioFinal).toFixed(2)} USD</p>
        </div>}
      </section>
      <section className="mb-4">
        <h2 className="h4">Órdenes</h2>
        {pedidos.cargando && <p>Cargando pedidos...</p>}
        {pedidos.error && <p role="alert" className="text-danger">{pedidos.error.message}</p>}
        {!pedidos.cargando && !pedidos.error && (
          <div className="table-responsive">
            <table className="table table-dark table-striped">
              <thead><tr><th>N.º</th><th>Cliente</th><th>Estado</th><th>Total (USD)</th><th>Acción</th></tr></thead>
              <tbody>
                {(pedidos.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td><td>{p.nombreCliente}</td><td>{p.estado}</td>
                    <td>${Number(p.total).toFixed(2)}</td>
                    <td><button type="button" className="btn btn-outline-info btn-sm"
                      onClick={() => verPedido(p.id)}>Ver detalle</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {cargandoDetalle && <p>Cargando detalle...</p>}
      {errorDetalle && <p className="text-danger" role="alert">{errorDetalle}</p>}
      {detalle && <section className="card bg-dark text-light p-3 border-secondary">
        <h2 className="h5">Pedido #{detalle.id}</h2>
        <p>Cliente: {detalle.nombreCliente} · Estado: {detalle.estado} · Total: ${Number(detalle.total).toFixed(2)}</p>
        <ul>{(detalle.detalles ?? []).map((d, idx) =>
          <li key={`${d.juegoId ?? idx}-${idx}`}>{d.titulo}: {d.cantidad} unidad(es)</li>)}</ul>
      </section>}
    </div>
  );
}
