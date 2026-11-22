import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { carritoService } from '../services/carritoService';
import SoloRol from './SoloRol';
import useFavoritos from '../hooks/useFavoritos';

/** Navegación de Nexus Store: se conservan los flujos, las rutas y las restricciones por rol. */
export default function Navbar() {
  const { usuario, autenticado, logout } = useAuth();
  const [totalCarrito, setTotalCarrito] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [menuMovil, setMenuMovil] = useState(false);
  const navigate = useNavigate();
  const inputBusqueda = useRef(null);
  const { ids: idsFavoritos } = useFavoritos();

  useEffect(() => {
    const sync = () => setTotalCarrito(carritoService.total());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('nexus_sync', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('nexus_sync', sync);
    };
  }, []);

  useEffect(() => {
    const atajo = e => {
      const etiqueta = e.target?.tagName;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(etiqueta)) {
        e.preventDefault();
        inputBusqueda.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputBusqueda.current) inputBusqueda.current?.blur();
    };
    window.addEventListener('keydown', atajo);
    return () => window.removeEventListener('keydown', atajo);
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    setMenuMovil(false);
    navigate(`/categorias?buscar=${encodeURIComponent(busqueda.trim())}`);
  };

  const handleCerrarSesion = async () => {
    await logout();
    setMenuMovil(false);
    navigate('/');
  };

  if (autenticado && usuario?.rol === 'VENDEDOR') {
    return (
      <header className="nexus-header nexus-header--vendor sticky-top">
        <div className="nexus-header-inner">
          <Link to="/vendedor" className="nexus-brand" aria-label="Nexus Store, panel vendedor">
            <span className="nexus-brand-icon"><i className="bi bi-controller" aria-hidden="true" /></span>
            <span className="nexus-brand-name">NEXUS<span className="nexus-brand-accent">STORE</span></span>
          </Link>
          <div className="nexus-vendor-actions">
            <span className="nexus-live-label"><span className="status-dot" /> PANEL VENDEDOR</span>
            <Link to="/vendedor" className="btn btn-outline-info btn-sm">Productos y órdenes</Link>
            <span className="badge bg-secondary">VENDEDOR</span>
            <button type="button" onClick={handleCerrarSesion} className="btn btn-outline-danger btn-sm">Cerrar sesión</button>
          </div>
        </div>
      </header>
    );
  }

  const enlaces = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/categorias', label: 'Categorías' },
    { to: '/ofertas', label: 'Ofertas' },
    { to: '/blog', label: 'Novedades' },
    { to: '/nosotros', label: 'Nosotros' },
    { to: '/contacto', label: 'Soporte' },
  ];

  return (
    <header className="nexus-header sticky-top">
      <div className="nexus-header-inner">
        <Link to="/" className="nexus-brand" aria-label="Nexus Store, inicio">
          <span className="nexus-brand-icon"><i className="bi bi-controller" aria-hidden="true" /></span>
          <span className="nexus-brand-name">NEXUS<span className="nexus-brand-accent">STORE</span></span>
        </Link>

        <nav className={`nexus-main-nav ${menuMovil ? 'is-open' : ''}`} aria-label="Navegación principal">
          {enlaces.map((enlace) => (
            <NavLink key={enlace.to} to={enlace.to} end={enlace.end} onClick={() => setMenuMovil(false)}
              className={({ isActive }) => `nexus-nav-link ${isActive ? 'is-active' : ''}`}>
              {enlace.label}
            </NavLink>
          ))}
        </nav>

        <div className="nexus-header-tools">
          <form className="nexus-search" role="search" onSubmit={handleBuscar}>
            <input ref={inputBusqueda} type="search" aria-label="Buscar juego" placeholder="Buscar videojuegos...  /" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
            <button type="submit" aria-label="Buscar" title="Buscar"><i className="bi bi-search" aria-hidden="true" /></button>
          </form>

          <Link to="/favoritos" className="nexus-nav-favorites" title="Mi lista de deseos" aria-label={`Ver favoritos (${idsFavoritos.length})`}>
            <i className="bi bi-heart" aria-hidden="true" />
            {idsFavoritos.length > 0 && <span className="nexus-favorites-count">{idsFavoritos.length}</span>}
          </Link>

          <Link to="/carrito" className="nexus-cart" aria-label="Ir al carrito">
            <i className="bi bi-bag" aria-hidden="true" />
            <span data-testid="navbar-cart-total">${totalCarrito.toFixed(2)}</span>
          </Link>

          <SoloRol roles={['ADMIN']}>
            <Link to="/admin" className="nexus-admin-pill" data-testid="enlace-admin" title="Panel de administración">
              <i className="bi bi-shield-lock-fill" aria-hidden="true" /> <span>Admin</span>
            </Link>
          </SoloRol>

          {autenticado ? (
            <div className="dropdown nexus-account-menu">
              <button type="button" className="nexus-user-button dropdown-toggle" data-bs-toggle="dropdown"
                aria-label="Menú de usuario" aria-expanded="false">
                <span className="status-dot" />
                <span className="nexus-user-name" data-testid="navbar-usuario">{usuario.alias || usuario.nombre}</span>
                <span className="nexus-role-chip">{usuario.rol}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow">
                <li><Link className="dropdown-item small" to="/mi-cuenta">Mi cuenta</Link></li>
                <SoloRol roles={['ADMIN']}>
                  <li><Link className="dropdown-item small" to="/admin">Panel Admin</Link></li>
                </SoloRol>
                <li><hr className="dropdown-divider" /></li>
                <li><button type="button" className="dropdown-item small text-danger" onClick={handleCerrarSesion}>Cerrar Sesión</button></li>
              </ul>
            </div>
          ) : (
            <div className="nexus-auth-actions">
              <Link to="/login" className="nexus-sign-in" title="Ingresar"><i className="bi bi-person" aria-hidden="true" /><span>Ingresar</span></Link>
              <Link to="/registro" className="nexus-sign-up">Registrarme</Link>
            </div>
          )}

          <button type="button" className="nexus-mobile-toggle" aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuMovil} onClick={() => setMenuMovil((v) => !v)}>
            <i className={`bi ${menuMovil ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
