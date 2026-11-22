import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { juegoService } from '../services/juegoService';
import { usuarioService } from '../services/usuarioService';
import { pedidoService } from '../services/pedidoService';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Cargando, ErrorApi } from '../components/Estado';
import { formatoFecha } from '../utils/format';

const UMBRAL_CRITICO = 5;
const FORM_VACIO = { nombre: '', categoria: '', precio: '', descuento: 0, stock: 10, imagen: '', descripcion: '' };

function Kpi({ color, titulo, valor, detalle, testid }) {
  return (
    <div className="col-md-3">
      <div className={`card bg-${color} ${color === 'warning' ? 'text-dark' : 'text-white'} p-4 h-100 shadow rounded-4`}>
        <h6>{titulo}</h6>
        <h1 className="fw-bold my-2" data-testid={testid}>{valor}</h1>
        <small>{detalle}</small>
      </div>
    </div>
  );
}

/** Mensaje de error del backend + detalle por campo (validaciones). */
function mensajeDe(err) {
  const detalles = err.details ? Object.values(err.details).join(' ') : '';
  return `${err.message}${detalles ? ` ${detalles}` : ''}`;
}

function AdminJuegos({ juegos, recargar }) {
  const { notificar } = useToast();
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [soloCriticos, setSoloCriticos] = useState(false);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const categorias = useMemo(() => [...new Set(juegos.map((j) => j.categoria).filter(Boolean))], [juegos]);
  const lista = soloCriticos ? juegos.filter((j) => j.stock <= UMBRAL_CRITICO) : juegos;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      if (editandoId) {
        await juegoService.actualizar(editandoId, form);
        notificar('Juego actualizado correctamente.');
      } else {
        await juegoService.crear(form);
        notificar('Juego creado correctamente.');
      }
      setForm(FORM_VACIO);
      setEditandoId(null);
      recargar();
    } catch (err) {
      setError(err);
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (j) => {
    setEditandoId(j.id);
    setError(null);
    setForm({
      nombre: j.nombre,
      categoria: j.categoria,
      precio: j.precio,
      descuento: j.descuento,
      stock: j.stock,
      imagen: j.imagen,
      descripcion: j.descripcion,
    });
  };

  const cancelar = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setError(null);
  };

  const handleEliminar = async (j) => {
    if (!window.confirm(`¿Eliminar "${j.nombre}" permanentemente?`)) return;
    try {
      await juegoService.eliminar(j.id);
      notificar('Juego eliminado.');
      recargar();
    } catch (err) {
      notificar(err.message, 'danger'); // p. ej. 409: tiene pedidos asociados
    }
  };

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  return (
    <div className="row g-4">
      <div className="col-lg-4">
        <div className="card bg-dark text-light border-secondary border-opacity-25 p-4 rounded-4 shadow">
          <h5 className="fw-bold mb-3">{editandoId ? 'Editar Juego' : 'Registrar Nuevo Juego'}</h5>
          {error && <div className="alert alert-danger py-2 small" role="alert" data-testid="admin-error">{mensajeDe(error)}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small text-secondary">Nombre</label>
              <input type="text" aria-label="Nombre del producto" className="form-control bg-black text-light border-secondary" value={form.nombre} onChange={set('nombre')} required />
            </div>
            <div className="mb-3">
              <label className="form-label small text-secondary">Categoría</label>
              <input type="text" list="lista-categorias" aria-label="Categoría del producto" className="form-control bg-black text-light border-secondary" value={form.categoria} onChange={set('categoria')} required />
              <datalist id="lista-categorias">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-4">
                <label className="form-label small text-secondary">Precio (USD)</label>
                <input type="number" step="0.01" min="0.01" aria-label="Precio del producto" className="form-control bg-black text-light border-secondary" value={form.precio} onChange={set('precio')} required />
              </div>
              <div className="col-4">
                <label className="form-label small text-secondary">Desc. (%)</label>
                <input type="number" min="0" max="100" aria-label="Descuento del producto" className="form-control bg-black text-light border-secondary" value={form.descuento} onChange={set('descuento')} />
              </div>
              <div className="col-4">
                <label className="form-label small text-secondary">Stock</label>
                <input type="number" min="0" aria-label="Stock del producto" className="form-control bg-black text-light border-secondary" value={form.stock} onChange={set('stock')} required />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small text-secondary">URL de la imagen</label>
              <input type="url" aria-label="Imagen del producto" className="form-control bg-black text-light border-secondary" value={form.imagen} onChange={set('imagen')} />
            </div>
            <div className="mb-3">
              <label className="form-label small text-secondary">Descripción</label>
              <textarea rows="3" maxLength="255" aria-label="Descripción del producto" className="form-control bg-black text-light border-secondary" value={form.descripcion} onChange={set('descripcion')} />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" disabled={guardando} className="btn btn-primary fw-bold flex-grow-1">
                {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear juego'}
              </button>
              {editandoId && <button type="button" className="btn btn-outline-secondary" onClick={cancelar}>Cancelar</button>}
            </div>
          </form>
        </div>
      </div>

      <div className="col-lg-8">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold m-0">Inventario</h5>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="solo-criticos" checked={soloCriticos} onChange={(e) => setSoloCriticos(e.target.checked)} />
            <label className="form-check-label small" htmlFor="solo-criticos">Solo stock crítico (≤ {UMBRAL_CRITICO})</label>
          </div>
        </div>
        <div className="table-responsive bg-dark rounded-3 p-3 border border-secondary border-opacity-25 shadow">
          <table className="table table-dark align-middle mb-0">
            <thead><tr className="text-secondary small"><th>Juego</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {lista.map((j) => (
                <tr key={j.id} data-testid="fila-juego">
                  <td className="fw-semibold">{j.nombre}</td>
                  <td className="small text-secondary">{j.categoria}</td>
                  <td>
                    ${j.precioFinal.toFixed(2)}
                    {j.oferta && <span className="badge bg-danger ms-2">-{j.descuento}%</span>}
                  </td>
                  <td>
                    <span className={`badge ${j.stock <= UMBRAL_CRITICO ? 'bg-danger' : 'bg-success'}`}>{j.stock}</span>
                  </td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-outline-info btn-sm me-1" onClick={() => iniciarEdicion(j)} aria-label={`Editar ${j.nombre}`}>Editar</button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleEliminar(j)} aria-label={`Eliminar ${j.nombre}`}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan="5" className="text-center text-secondary py-4">Sin resultados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminUsuarios({ usuarios, recargar }) {
  const { usuario: yo } = useAuth();
  const { notificar } = useToast();

  const guardar = async (u, cambios) => {
    try {
      await usuarioService.actualizar(u.id, {
        nombre: u.nombre,
        alias: u.alias,
        region: u.region,
        rol: u.rol,
        activo: u.activo,
        ...cambios,
      });
      notificar('Usuario actualizado.');
      recargar();
    } catch (err) {
      notificar(err.message, 'danger');
    }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario ${u.email}?`)) return;
    try {
      await usuarioService.eliminar(u.id);
      notificar('Usuario eliminado.');
      recargar();
    } catch (err) {
      notificar(err.message, 'danger');
    }
  };

  return (
    <div className="table-responsive bg-dark rounded-3 p-3 border border-secondary border-opacity-25 shadow">
      <table className="table table-dark align-middle mb-0">
        <thead><tr className="text-secondary small"><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {usuarios.map((u) => {
            const esYo = u.id === yo.id;
            return (
              <tr key={u.id} data-testid="fila-usuario">
                <td>{u.nombre} {esYo && <span className="badge bg-info text-dark ms-1">tú</span>}</td>
                <td className="small text-secondary">{u.email}</td>
                <td>
                  <select className="form-select form-select-sm bg-black text-light border-secondary" style={{ width: '130px' }} value={u.rol} disabled={esYo} aria-label={`Rol de ${u.email}`} onChange={(e) => guardar(u, { rol: e.target.value })}>
                    <option value="VENDEDOR">VENDEDOR</option>
                    <option value="CLIENTE">CLIENTE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" checked={Boolean(u.activo)} disabled={esYo} aria-label={`Activo ${u.email}`} onChange={(e) => guardar(u, { activo: e.target.checked })} />
                  </div>
                </td>
                <td className="text-end">
                  <button type="button" className="btn btn-outline-danger btn-sm" disabled={esYo} onClick={() => eliminar(u)}>Eliminar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdminPedidos({ pedidos, recargar, recargarJuegos }) {
  const { notificar } = useToast();

  const anular = async (p) => {
    if (!window.confirm(`¿Anular el pedido #${p.id}? Se devolverá el stock y se eliminarán sus licencias.`)) return;
    try {
      await pedidoService.anular(p.id);
      notificar(`Pedido #${p.id} anulado.`);
      recargar();
      recargarJuegos();
    } catch (err) {
      notificar(err.message, 'danger');
    }
  };

  return (
    <div className="table-responsive bg-dark rounded-3 p-3 border border-secondary border-opacity-25 shadow">
      <table className="table table-dark align-middle mb-0">
        <thead><tr className="text-secondary small"><th>N°</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p.id} data-testid="fila-pedido-admin">
              <td>#{p.id}</td>
              <td>{p.nombreCliente}<div className="small text-secondary">{p.emailCliente}</div></td>
              <td className="small">{formatoFecha(p.fechaPedido)}</td>
              <td className="fw-bold text-info">${Number(p.total).toFixed(2)}</td>
              <td><span className="badge bg-success">{p.estado}</span></td>
              <td className="text-end text-nowrap">
                <Link to={`/boleta/${p.id}`} className="btn btn-outline-info btn-sm me-1">Boleta</Link>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => anular(p)}>Anular</button>
              </td>
            </tr>
          ))}
          {pedidos.length === 0 && <tr><td colSpan="6" className="text-center text-secondary py-4">Aún no hay pedidos.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('juegos');
  const juegos = useApi(() => juegoService.listar(), []);
  const usuarios = useApi(() => usuarioService.listar(), []);
  const pedidos = useApi(() => pedidoService.todos(), []);

  // Admite tanto respuestas como lista como envoltorios paginados sin inventar stock.
  const listaJuegos = Array.isArray(juegos.data)
    ? juegos.data
    : (Array.isArray(juegos.data?.content) ? juegos.data.content : []);
  const criticos = listaJuegos.filter((j) => j.stock <= UMBRAL_CRITICO).length;
  const usuariosActivos = (usuarios.data ?? []).filter((u) => u.activo).length;
  const cargandoTodo = juegos.cargando && !juegos.data;
  const error = juegos.error || usuarios.error || pedidos.error;

  const TABS = [
    ['juegos', 'Juegos'],
    ['usuarios', 'Usuarios'],
    ['pedidos', 'Pedidos'],
  ];

  return (
    <div className="container-fluid px-lg-5 py-5 text-light">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary border-opacity-25">
        <div>
          <h2 className="fw-bold m-0">Dashboard de Administración</h2>
          <small className="text-secondary">Juegos, usuarios y pedidos (solo rol ADMIN)</small>
        </div>
        <Link to="/" className="btn btn-outline-light btn-sm rounded-pill px-3">Ir a la Tienda</Link>
      </div>

      <ErrorApi error={error} onReintentar={() => { juegos.recargar(); usuarios.recargar(); pedidos.recargar(); }} />

      <div className="row g-4 mb-4">
        <Kpi color="primary" titulo="Compras / Órdenes" valor={(pedidos.data ?? []).length} detalle="Transacciones procesadas" testid="kpi-ordenes" />
        <Kpi color="success" titulo="Juegos en Catálogo" valor={listaJuegos.length} detalle="Inventario total" testid="kpi-juegos" />
        <Kpi color="danger" titulo={`Stock Crítico (≤ ${UMBRAL_CRITICO})`} valor={criticos} detalle="Requieren reposición" testid="kpi-criticos" />
        <Kpi color="warning" titulo="Usuarios Activos" valor={usuariosActivos} detalle="Cuentas habilitadas" testid="kpi-usuarios" />
      </div>

      <ul className="nav nav-pills mb-4 gap-2">
        {TABS.map(([clave, texto]) => (
          <li className="nav-item" key={clave}>
            <button type="button" className={`nav-link ${tab === clave ? 'active' : 'text-light border border-secondary'}`} onClick={() => setTab(clave)}>
              {texto}
            </button>
          </li>
        ))}
      </ul>

      {cargandoTodo && <Cargando texto="Cargando panel..." />}
      {!cargandoTodo && tab === 'juegos' && <AdminJuegos juegos={listaJuegos} recargar={juegos.recargar} />}
      {tab === 'usuarios' && usuarios.data && <AdminUsuarios usuarios={usuarios.data} recargar={usuarios.recargar} />}
      {tab === 'pedidos' && pedidos.data && <AdminPedidos pedidos={pedidos.data} recargar={pedidos.recargar} recargarJuegos={juegos.recargar} />}
    </div>
  );
}
