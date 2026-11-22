import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import { Categorias, DetalleProducto, Ofertas, Blog, Nosotros, Contacto } from './pages/CatalogoPages';
import { Carrito, Checkout, PagoCorrecto, PagoError, MostrarBoleta } from './pages/CompraPages';
import { Login, Registro, AccesoDenegado, NoEncontrado } from './pages/AuthPages';
import { MiCuenta } from './pages/CuentaPages';
import AdminDashboard from './pages/AdminDashboard';
import VendedorDashboard from './pages/VendedorDashboard';
import NoVendedor from './components/NoVendedor';
import FavoritosPage from './pages/FavoritosPage';

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 650);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  if (!visible) return null;
  return <button type="button" className="nexus-back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Volver arriba">
    <i className="bi bi-arrow-up" aria-hidden="true" />
  </button>;
}

function Footer() {
  const { usuario, autenticado } = useAuth();
  const vendedor = autenticado && usuario?.rol === 'VENDEDOR';
  return (
    <footer className="nexus-footer mt-auto">
      <div className="nexus-page-width">
        <div className="nexus-footer-inner">
          <div className="nexus-footer-intro">
            <Link to="/" className="nexus-brand" aria-label="Nexus Store, inicio">
              <span className="nexus-brand-icon"><i className="bi bi-controller" aria-hidden="true" /></span>
              <span className="nexus-brand-name">NEXUS<span className="nexus-brand-accent">STORE</span></span>
            </Link>
            <p>Un universo de videojuegos a un clic. Descubre, compra y disfruta tus licencias digitales desde una sola plataforma.</p>
          </div>
          <div className="nexus-footer-group">
            <h3>EXPLORAR</h3>
            <Link to="/categorias">Catálogo completo</Link>
            <Link to="/ofertas">Ofertas especiales</Link>
            <Link to="/favoritos">Mis favoritos</Link>
            <Link to="/blog">Novedades gaming</Link>
          </div>
          <div className="nexus-footer-group">
            <h3>MI EXPERIENCIA</h3>
            {vendedor ? (
              <Link to="/vendedor">Panel de consultas</Link>
            ) : (
              <>
                <Link to="/mi-cuenta">Mi cuenta y pedidos</Link>
                <Link to="/carrito">Mi carrito</Link>
              </>
            )}
            <Link to="/contacto">Soporte</Link>
          </div>
          <div className="nexus-footer-group">
            <h3>NEXUS STORE</h3>
            <Link to="/nosotros">Sobre el proyecto</Link>
            {!vendedor && <Link to="/registro">Crear cuenta</Link>}
            <Link to="/contacto">Contacto</Link>
          </div>
        </div>
        <div className="nexus-footer-bottom">
          <span>© 2026 Nexus Store. Proyecto académico · Desarrollo Fullstack II · Duoc UC.</span>
          <span>HECHO PARA EL <strong>SIGUIENTE NIVEL</strong> <i className="bi bi-lightning-charge-fill" aria-hidden="true" /></span>
        </div>
      </div>
    </footer>
  );
}

/** Mantiene todas las rutas, los roles y los proveedores de la versión validada. */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="nexus-shell min-vh-100 d-flex flex-column">
            <Navbar />
            <main className="nexus-main-content flex-grow-1">
              <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<NoVendedor><Home /></NoVendedor>} />
                <Route path="/categorias" element={<NoVendedor><Categorias /></NoVendedor>} />
                <Route path="/producto/:id" element={<NoVendedor><DetalleProducto /></NoVendedor>} />
                <Route path="/ofertas" element={<NoVendedor><Ofertas /></NoVendedor>} />
                <Route path="/favoritos" element={<NoVendedor><FavoritosPage /></NoVendedor>} />
                <Route path="/carrito" element={<NoVendedor><Carrito /></NoVendedor>} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/nosotros" element={<Nosotros />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/acceso-denegado" element={<AccesoDenegado />} />

                {/* Rutas con sesión: CLIENTE y ADMIN */}
                <Route path="/checkout" element={<ProtectedRoute roles={['CLIENTE', 'ADMIN']}><Checkout /></ProtectedRoute>} />
                <Route path="/pago-correcto" element={<ProtectedRoute roles={['CLIENTE', 'ADMIN']}><PagoCorrecto /></ProtectedRoute>} />
                <Route path="/pago-error" element={<ProtectedRoute roles={['CLIENTE', 'ADMIN']}><PagoError /></ProtectedRoute>} />
                <Route path="/boleta/:id" element={<ProtectedRoute roles={['CLIENTE', 'ADMIN']}><MostrarBoleta /></ProtectedRoute>} />
                <Route path="/mi-cuenta" element={<ProtectedRoute roles={['CLIENTE', 'ADMIN']}><MiCuenta /></ProtectedRoute>} />

                {/* VENDEDOR: solo consultas (ADMIN también puede inspeccionar). */}
                <Route path="/vendedor" element={<ProtectedRoute roles={['VENDEDOR', 'ADMIN']}><VendedorDashboard /></ProtectedRoute>} />
                {/* ADMIN: operaciones de administración. */}
                <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

                <Route path="*" element={<NoEncontrado />} />
              </Routes>
            </main>
            <Footer />
            <BackToTop />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
