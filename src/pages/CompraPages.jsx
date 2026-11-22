import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { carritoService } from '../services/carritoService';
import { pedidoService } from '../services/pedidoService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { Cargando, ErrorApi } from '../components/Estado';
import { formatoFecha } from '../utils/format';

function useCarrito() {
  const [items, setItems] = useState(() => carritoService.obtener());
  useEffect(() => {
    const sync = () => setItems(carritoService.obtener());
    window.addEventListener('nexus_sync', sync);
    return () => window.removeEventListener('nexus_sync', sync);
  }, []);
  return items;
}

export function Carrito() {
  const carrito = useCarrito();
  const { autenticado } = useAuth();
  const total = carritoService.total(carrito);

  const eliminar = (id) => {
    if (window.confirm('¿Deseas eliminar este producto del carrito?')) carritoService.eliminar(id);
  };

  return (
    <div className="container py-5 text-light" style={{ maxWidth: '850px' }}>
      <h3 className="fw-bold mb-4 pb-2 border-bottom border-secondary border-opacity-25">Carrito de Compras</h3>
      {carrito.length === 0 ? (
        <div className="text-center py-5">
          <h5>El carrito está vacío</h5>
          <Link to="/" className="btn btn-primary mt-3 px-4 rounded-pill">Ver Tienda</Link>
        </div>
      ) : (
        <>
          <div className="table-responsive bg-dark rounded-3 p-3 mb-4 border border-secondary border-opacity-25 shadow">
            <table className="table table-dark align-middle mb-0">
              <thead>
                <tr className="text-secondary small">
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((it) => (
                  <tr key={it.id} data-testid="cart-row">
                    <td className="fw-semibold">{it.nombre}</td>
                    <td>${Number(it.precio).toFixed(2)}</td>
                    <td>
                      <div className="btn-group btn-group-sm" role="group" aria-label="Cantidad">
                        <button type="button" className="btn btn-outline-secondary" aria-label="Quitar una unidad" onClick={() => carritoService.cambiarCantidad(it.id, -1)}>−</button>
                        <span className="btn btn-dark disabled" data-testid="cart-cantidad">{it.cantidad || 1}</span>
                        <button type="button" className="btn btn-outline-secondary" aria-label="Agregar una unidad" onClick={() => carritoService.cambiarCantidad(it.id, 1)}>+</button>
                      </div>
                    </td>
                    <td className="fw-bold text-info">${(Number(it.precio) * (it.cantidad || 1)).toFixed(2)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        onClick={() => eliminar(it.id)}
                        className="btn btn-outline-danger btn-sm border-0"
                        aria-label="Eliminar del carrito"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!autenticado && (
            <div className="alert alert-info py-2 small">Para pagar necesitas iniciar sesión; te llevaremos al login al continuar.</div>
          )}
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="fw-bold m-0" data-testid="cart-total">Total: ${total.toFixed(2)}</h4>
            <Link to="/checkout" className="btn btn-success btn-lg px-4 fw-bold">Proceder al Checkout</Link>
          </div>
        </>
      )}
    </div>
  );
}

export function Checkout() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { notificar } = useToast();
  const carrito = useCarrito();
  const total = carritoService.total(carrito);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const [cliente, setCliente] = useState({
    nombre: usuario?.nombre ?? '',
    apellidos: '',
    correo: usuario?.email ?? '',
    calle: '',
    departamento: '',
    region: 'Región Metropolitana de Santiago',
    comuna: 'Cerrillos',
    indicaciones: '',
    metodoPago: 'TARJETA',
    tipoTarjeta: 'CREDITO',
  });

  const handleChange = (e) => setCliente({ ...cliente, [e.target.name]: e.target.value });

  const pagar = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) {
      setError({ message: 'Tu carrito está vacío.' });
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      // Solo se envían ids y cantidades: el servidor calcula precios, descuentos y total.
      const pedido = await pedidoService.crear({
        nombreCliente: `${cliente.nombre} ${cliente.apellidos}`.trim(),
        metodoPago: cliente.metodoPago,
        tipoTarjeta: cliente.metodoPago === 'TARJETA' ? cliente.tipoTarjeta : null,
        direccionEnvio: [cliente.calle, cliente.departamento, cliente.comuna, cliente.region, cliente.indicaciones]
          .filter(Boolean)
          .join(', '),
        items: carrito.map((it) => ({ juegoId: it.id, cantidad: it.cantidad || 1 })),
      });
      carritoService.vaciar();
      navigate('/pago-correcto', { state: { pedido }, replace: true });
    } catch (err) {
      if (err.status === 409 || err.status === 404) {
        navigate('/pago-error', { state: { mensaje: err.message }, replace: true });
      } else {
        setError(err);
        notificar(err.message, 'danger');
      }
    } finally {
      setEnviando(false);
    }
  };

  const simularFallo = () =>
    navigate('/pago-error', { state: { mensaje: 'La transacción fue rechazada por el medio de pago (simulación).' } });

  return (
    <div className="container py-5 text-light" style={{ maxWidth: '850px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary border-opacity-25">
        <h3 className="fw-bold m-0">Finalizar Compra (Checkout)</h3>
        <span className="badge bg-primary fs-6">Total: ${total.toFixed(2)}</span>
      </div>

      <ErrorApi error={error} />

      <form onSubmit={pagar}>
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label small text-secondary">Nombre *</label>
            <input type="text" name="nombre" value={cliente.nombre} onChange={handleChange} className="form-control bg-dark text-light border-secondary" required />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-secondary">Apellidos</label>
            <input type="text" name="apellidos" value={cliente.apellidos} onChange={handleChange} className="form-control bg-dark text-light border-secondary" />
          </div>
          <div className="col-12">
            <label className="form-label small text-secondary">Correo Electrónico (de tu cuenta)</label>
            <input type="email" name="correo" value={cliente.correo} readOnly className="form-control bg-dark text-light border-secondary" />
          </div>
          <div className="col-md-8">
            <label className="form-label small text-secondary">Calle y Número *</label>
            <input type="text" name="calle" value={cliente.calle} onChange={handleChange} className="form-control bg-dark text-light border-secondary" required />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-secondary">Departamento (opcional)</label>
            <input type="text" name="departamento" value={cliente.departamento} onChange={handleChange} className="form-control bg-dark text-light border-secondary" />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-secondary">Región</label>
            <select name="region" value={cliente.region} onChange={handleChange} className="form-select bg-dark text-light border-secondary">
              <option value="Región Metropolitana de Santiago">Región Metropolitana de Santiago</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small text-secondary">Comuna</label>
            <select name="comuna" value={cliente.comuna} onChange={handleChange} className="form-select bg-dark text-light border-secondary">
              <option value="Cerrillos">Cerrillos</option>
              <option value="La Granja">La Granja</option>
              <option value="La Pintana">La Pintana</option>
              <option value="Santiago Centro">Santiago Centro</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label small text-secondary">Indicaciones (opcional)</label>
            <input type="text" name="indicaciones" value={cliente.indicaciones} onChange={handleChange} className="form-control bg-dark text-light border-secondary" />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-secondary">Método de pago</label>
            <select name="metodoPago" value={cliente.metodoPago} onChange={handleChange} className="form-select bg-dark text-light border-secondary">
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>
          {cliente.metodoPago === 'TARJETA' && (
            <div className="col-md-6">
              <label className="form-label small text-secondary">Tipo de tarjeta</label>
              <select name="tipoTarjeta" value={cliente.tipoTarjeta} onChange={handleChange} className="form-select bg-dark text-light border-secondary">
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
              </select>
            </div>
          )}
        </div>

        <div className="d-flex justify-content-end gap-3 pt-3 border-top border-secondary border-opacity-25">
          <button type="button" onClick={simularFallo} className="btn btn-outline-danger px-4">Simular Fallo</button>
          <button type="submit" disabled={enviando || carrito.length === 0} className="btn btn-success fw-bold px-4">
            {enviando ? 'Procesando...' : `Pagar ahora $${total.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PagoCorrecto() {
  const { state } = useLocation();
  const pedido = state?.pedido;

  if (!pedido) {
    return (
      <div className="container py-5 text-light text-center">
        <h4>No hay una compra reciente para mostrar.</h4>
        <Link to="/mi-cuenta" className="btn btn-primary mt-3">Ver mis pedidos</Link>
      </div>
    );
  }

  return (
    <div className="container py-5 text-light text-center" style={{ maxWidth: '650px' }}>
      <div className="p-5 bg-dark rounded-4 border border-success border-opacity-50 shadow-lg">
        <h2 className="fw-bold mt-3 mb-2">¡Compra Realizada con Éxito!</h2>
        <span className="badge bg-secondary fs-6 mb-3" data-testid="pago-orden">Orden: #{pedido.id}</span>
        <h4 className="fw-bold text-success mb-4">Total Pagado: ${Number(pedido.total).toFixed(2)}</h4>

        {pedido.licencias?.length > 0 && (
          <div className="text-start bg-black rounded-3 p-3 mb-4 border border-secondary border-opacity-25">
            <div className="small text-secondary mb-2">Tus claves de activación:</div>
            {pedido.licencias.map((l) => (
              <div key={l.id} className="d-flex justify-content-between small py-1">
                <span>{l.juegoTitulo}</span>
                <code className="text-info">{l.claveActivacion}</code>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-center gap-3">
          <Link to={`/boleta/${pedido.id}`} className="btn btn-outline-info px-4 fw-bold rounded-pill">
            Ver Boleta Digital
          </Link>
          <Link to="/" className="btn btn-primary px-4 fw-bold rounded-pill">Volver al Inicio</Link>
        </div>
      </div>
    </div>
  );
}

export function PagoError() {
  const navigate = useNavigate();
  const { state } = useLocation();
  return (
    <div className="container py-5 text-light text-center" style={{ maxWidth: '650px' }}>
      <div className="p-5 bg-dark rounded-4 border border-danger border-opacity-50 shadow-lg">
        <h2 className="fw-bold mt-3 mb-2">No se pudo realizar el pago</h2>
        <p className="text-secondary mb-4" data-testid="pago-error-mensaje">
          {state?.mensaje || 'La transacción fue rechazada o falló la verificación de seguridad.'}
        </p>
        <button type="button" onClick={() => navigate('/checkout')} className="btn btn-danger fw-bold px-4 rounded-pill me-2">VOLVER A INTENTAR</button>
        <Link to="/carrito" className="btn btn-outline-secondary px-4 rounded-pill">Ir al Carrito</Link>
      </div>
    </div>
  );
}

export function MostrarBoleta() {
  const { id } = useParams();
  const { data: pedido, cargando, error, recargar } = useApi(() => pedidoService.obtener(id), [id]);

  if (cargando && !pedido) return <Cargando texto="Cargando boleta..." />;
  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: '750px' }}>
        <ErrorApi error={error} onReintentar={error.status === 403 || error.status === 404 ? undefined : recargar} />
        <Link to="/mi-cuenta" className="btn btn-primary">Volver a mi cuenta</Link>
      </div>
    );
  }

  return (
    <div className="container py-5 text-light" style={{ maxWidth: '750px' }}>
      <div className="p-4 p-md-5 bg-dark rounded-4 border border-secondary border-opacity-25 shadow-lg">
        <div className="d-flex justify-content-between align-items-start border-bottom border-secondary border-opacity-25 pb-3 mb-4">
          <div>
            <h3 className="fw-bold m-0 text-primary">Nexus Store SpA</h3>
            <small className="text-secondary">R.U.T.: 76.845.190-2 • Facturación Electrónica</small>
          </div>
          <div className="text-end">
            <span className="badge bg-danger fs-6 px-3 py-2">BOLETA ELECTRÓNICA</span>
            <div className="fw-bold mt-2 text-warning fs-5" data-testid="boleta-orden">#{pedido.id}</div>
          </div>
        </div>

        <div className="small text-secondary mb-3">
          <div>Cliente: <span className="text-light">{pedido.nombreCliente}</span> ({pedido.emailCliente})</div>
          <div>Fecha: <span className="text-light">{formatoFecha(pedido.fechaPedido)}</span></div>
          <div>Despacho: <span className="text-light">{pedido.direccionEnvio || '—'}</span></div>
        </div>

        <div className="table-responsive mb-4">
          <table className="table table-dark align-middle mb-0">
            <thead>
              <tr className="text-secondary small"><th>Producto</th><th>P. Unit.</th><th>Cant.</th><th className="text-end">Subtotal</th></tr>
            </thead>
            <tbody>
              {pedido.detalles.map((d) => (
                <tr key={`${d.juegoId}-${d.titulo}`}>
                  <td>{d.titulo}</td>
                  <td>${Number(d.precioUnitario).toFixed(2)}</td>
                  <td>{d.cantidad}</td>
                  <td className="text-end">${Number(d.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-end mb-2">
          <div style={{ width: '260px' }}>
            <div className="d-flex justify-content-between small text-secondary py-1">
              <span>Monto Neto:</span>
              <span data-testid="boleta-neto">${Number(pedido.neto).toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between small text-secondary py-1 border-bottom border-secondary border-opacity-25">
              <span>I.V.A. (19%):</span>
              <span data-testid="boleta-iva">${Number(pedido.iva).toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold fs-5 text-success py-2">
              <span>Total Pagado:</span>
              <span data-testid="boleta-total">${Number(pedido.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {pedido.licencias?.length > 0 && (
          <div className="bg-black rounded-3 p-3 border border-secondary border-opacity-25">
            <div className="small text-secondary mb-2">Claves de activación</div>
            {pedido.licencias.map((l) => (
              <div key={l.id} className="d-flex justify-content-between small py-1">
                <span>{l.juegoTitulo}</span>
                <code className="text-info">{l.claveActivacion}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
