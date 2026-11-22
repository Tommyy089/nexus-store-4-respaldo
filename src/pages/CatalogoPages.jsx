import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { juegoService } from '../services/juegoService';
import { carritoService } from '../services/carritoService';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import useFavoritos from '../hooks/useFavoritos';
import { Cargando, ErrorApi } from '../components/Estado';
import useValoracionesResumen from '../hooks/useValoracionesResumen';

/** Hook compartido: añade al carrito y avisa con una notificación (reemplaza a window.alert). */
function useAgregarAlCarrito() {
  const { notificar } = useToast();
  return (producto) => {
    const r = carritoService.agregar(producto);
    notificar(r.mensaje, r.ok ? 'success' : 'warning');
  };
}

export function Categorias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoria, setCategoria] = useState(() => searchParams.get('categoria') || 'Todas');
  const [orden, setOrden] = useState('recomendados');
  const [soloOfertas, setSoloOfertas] = useState(false);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [precioMaximo, setPrecioMaximo] = useState(120);
  const [comparados, setComparados] = useState([]);
  const [comparacionAbierta, setComparacionAbierta] = useState(false);
  const [limite, setLimite] = useState(12);
  const [vista, setVista] = useState('grid');
  const { ids: idsFavoritos } = useFavoritos();
  const resumenes = useValoracionesResumen();
  const agregar = useAgregarAlCarrito();
  const terminoBusqueda = searchParams.get('buscar') || '';

  useEffect(() => { setCategoria(searchParams.get('categoria') || 'Todas'); }, [searchParams]);
  useEffect(() => { setLimite(12); }, [terminoBusqueda, categoria, orden, soloOfertas, soloDisponibles, soloFavoritos, precioMaximo]);

  const elegirCategoria = valor => {
    setCategoria(valor);
    setSearchParams(prev => {
      const nuevos = new URLSearchParams(prev);
      if (valor === 'Todas') nuevos.delete('categoria');
      else nuevos.set('categoria', valor);
      return nuevos;
    });
  };

  const categorias = useApi(() => juegoService.categorias(), []);
  const productos = useApi(() => juegoService.listar({ q: terminoBusqueda, categoria }), [terminoBusqueda, categoria]);
  const lista = useMemo(() => {
    const juegos = (productos.data ?? []).filter(p =>
      (!soloOfertas || p.oferta) &&
      (!soloDisponibles || p.stock > 0) &&
      (!soloFavoritos || idsFavoritos.includes(Number(p.id))) &&
      (precioMaximo >= 120 || p.precioFinal <= precioMaximo)
    );
    const criterios = {
      precioAsc: (a,b) => a.precioFinal - b.precioFinal,
      precioDesc: (a,b) => b.precioFinal - a.precioFinal,
      descuento: (a,b) => b.descuento - a.descuento,
      nombre: (a,b) => a.nombre.localeCompare(b.nombre, 'es'),
      recomendados: (a,b) => Number(b.oferta) - Number(a.oferta) || b.stock - a.stock,
    };
    return [...juegos].sort(criterios[orden] || criterios.recomendados);
  }, [productos.data, soloOfertas, soloDisponibles, soloFavoritos, idsFavoritos, precioMaximo, orden]);

  const comparar = juego => setComparados(prev => prev.some(p => p.id === juego.id)
    ? prev.filter(p => p.id !== juego.id)
    : prev.length >= 3 ? prev : [...prev, juego]);
  const reiniciar = () => {
    setOrden('recomendados'); setSoloOfertas(false); setSoloDisponibles(false);
    setSoloFavoritos(false); setPrecioMaximo(120); elegirCategoria('Todas');
    setSearchParams({});
  };

  return <div className="nexus-page-width nexus-catalog-page">
    <div className="nexus-catalog-head">
      <span className="nexus-section-eyebrow">ELIGE TU PRÓXIMA AVENTURA</span>
      <h1>UN UNIVERSO DE <strong>VIDEOJUEGOS</strong></h1>
      <p>Explora títulos reales cargados desde Spring Boot. Refina tu búsqueda, compara y crea tu lista de deseos.</p>
      <div className="nexus-catalog-insights">
        <span><i className="bi bi-grid-3x3-gap" /> {(productos.data ?? []).length} juegos encontrados</span>
        <span><i className="bi bi-lightning-charge" /> Licencias digitales de demostración</span>
        <span><i className="bi bi-shield-check" /> Compra protegida con JWT</span>
      </div>
    </div>

    <div className="nexus-catalog-layout">
      <aside className="nexus-filter-panel" aria-label="Filtros del catálogo">
        <div className="nexus-filter-top"><h2><i className="bi bi-sliders2" /> FILTROS</h2><button type="button" onClick={reiniciar}>Limpiar</button></div>
        <div className="nexus-filter-section">
          <h3>GÉNEROS</h3>
          <div className="nexus-filter-options">
            {['Todas', ...(categorias.data ?? [])].map(c => <button type="button" key={c}
              className={`nexus-filter-category ${categoria === c ? 'is-active' : ''}`}
              onClick={() => elegirCategoria(c)}>
              <span>{c === 'Todas' ? 'Todo el catálogo' : c}</span>{categoria === c && <i className="bi bi-check2" />}
            </button>)}
          </div>
        </div>
        <div className="nexus-filter-section">
          <h3>PRECIO MÁXIMO</h3>
          <div className="nexus-range-label"><span>Hasta</span><strong>${precioMaximo >= 120 ? '120+' : precioMaximo} USD</strong></div>
          <input type="range" className="nexus-price-range" min="10" max="120" step="5" value={precioMaximo}
            onChange={e => setPrecioMaximo(Number(e.target.value))} aria-label="Precio máximo" />
          <div className="nexus-range-label"><small>$10</small><small>$120+</small></div>
        </div>
        <div className="nexus-filter-section nexus-filter-toggles">
          <label><input type="checkbox" checked={soloOfertas} onChange={e => setSoloOfertas(e.target.checked)} /> Solo ofertas <i className="bi bi-percent" /></label>
          <label><input type="checkbox" checked={soloDisponibles} onChange={e => setSoloDisponibles(e.target.checked)} /> Con stock <i className="bi bi-check-circle" /></label>
          <label><input type="checkbox" checked={soloFavoritos} onChange={e => setSoloFavoritos(e.target.checked)} /> Mis favoritos <i className="bi bi-heart" /></label>
        </div>
        <div className="nexus-filter-note"><i className="bi bi-controller" /><span>Más juegos. Más mundos.<br />Una sola tienda.</span></div>
      </aside>

      <div className="nexus-catalog-results">
        <div className="nexus-catalog-toolbar">
          <div className="nexus-results-meta">{lista.length} resultado{lista.length === 1 ? '' : 's'}
            {terminoBusqueda && <span> para «{terminoBusqueda}»</span>}
          </div>
          <div className="nexus-toolbar-actions">
            <label className="nexus-order-label">Ordenar
              <select value={orden} onChange={e => setOrden(e.target.value)} aria-label="Ordenar juegos">
                <option value="recomendados">Destacados</option>
                <option value="precioAsc">Precio: menor a mayor</option>
                <option value="precioDesc">Precio: mayor a menor</option>
                <option value="descuento">Más descuentos</option>
                <option value="nombre">Nombre A-Z</option>
              </select>
            </label>
            <div className="nexus-view-switch" role="group" aria-label="Vista del catálogo">
              <button className={vista === 'grid' ? 'is-active' : ''} type="button" aria-label="Vista en cuadrícula" onClick={() => setVista('grid')}><i className="bi bi-grid-3x3-gap" /></button>
              <button className={vista === 'list' ? 'is-active' : ''} type="button" aria-label="Vista en lista" onClick={() => setVista('list')}><i className="bi bi-list-ul" /></button>
            </div>
          </div>
        </div>
        <ErrorApi error={productos.error} onReintentar={productos.recargar} />
        {productos.cargando && !productos.data && <Cargando texto="Cargando mundos..." />}
        {!productos.cargando && !productos.error && lista.length === 0 &&
          <div className="nexus-empty-state"><i className="bi bi-search" /><h2>No encontramos juegos con esos filtros</h2>
            <p>Prueba otro género, precio o criterio de búsqueda.</p><button type="button" onClick={reiniciar} className="nexus-hero-cta">Restablecer filtros</button></div>}
        <div className={`nexus-product-grid nexus-catalog-grid ${vista === 'list' ? 'nexus-list-view' : ''}`}>
          {lista.slice(0, limite).map(p => <ProductCard key={p.id} producto={p} onAddToCart={agregar}
            onComparar={comparar} comparado={comparados.some(c => c.id === p.id)} valoracion={resumenes[p.id]} />)}
        </div>
        {lista.length > limite && <div className="nexus-load-more">
          <p>Mostrando {Math.min(limite, lista.length)} de {lista.length} videojuegos</p>
          <button type="button" className="nexus-section-link" onClick={() => setLimite(x => x + 12)}>Cargar más juegos <i className="bi bi-arrow-down" /></button>
        </div>}
      </div>
    </div>

    {comparados.length > 0 && <div className="nexus-compare-dock" role="region" aria-label="Comparador de juegos">
      <span><i className="bi bi-columns-gap" /> Comparar <strong>{comparados.length}/3</strong></span>
      <div className="nexus-compare-pills">{comparados.map(p => <button type="button" key={p.id} onClick={() => comparar(p)} title="Quitar de comparación">
        {p.nombre} <i className="bi bi-x" /></button>)}</div>
      <button type="button" className="nexus-compare-open" disabled={comparados.length < 2} onClick={() => setComparacionAbierta(true)}>Comparar ahora</button>
      <button type="button" className="nexus-compare-close" aria-label="Limpiar comparación" onClick={() => setComparados([])}><i className="bi bi-x-lg" /></button>
    </div>}

    {comparacionAbierta && <div className="nexus-compare-backdrop" role="presentation" onClick={() => setComparacionAbierta(false)}>
      <section role="dialog" aria-modal="true" aria-label="Comparación de videojuegos" className="nexus-compare-dialog" onClick={e => e.stopPropagation()}>
        <div className="nexus-compare-dialog-top"><h2>COMPARA TUS <strong>JUEGOS</strong></h2>
          <button type="button" aria-label="Cerrar comparación" onClick={() => setComparacionAbierta(false)}><i className="bi bi-x-lg" /></button></div>
        <div className="nexus-compare-table">
          {comparados.map(p => <div key={p.id} className="nexus-compare-column">
            <img src={p.imagen} alt="" loading="lazy" /><h3>{p.nombre}</h3>
            <p>{p.categoria}</p><strong>${p.precioFinal.toFixed(2)} USD</strong>
            <span>{p.descuento ? `${p.descuento}% de descuento` : 'Precio regular'}</span>
            <span>{p.stock > 0 ? `${p.stock} unidades disponibles` : 'Sin stock'}</span>
            <Link className="nexus-section-link" to={`/producto/${p.id}`} onClick={() => setComparacionAbierta(false)}>Ver detalles <i className="bi bi-arrow-up-right" /></Link>
          </div>)}
        </div>
      </section>
    </div>}
  </div>;
}

export { default as DetalleProducto } from './DetalleProducto';

export function Ofertas() {
  const agregar = useAgregarAlCarrito();
  const resumenes = useValoracionesResumen();
  const { data, cargando, error, recargar } = useApi(() => juegoService.listar(), []);
  const ofertas = (data ?? []).filter((p) => p.oferta);

  return (
    <div className="container-fluid px-lg-5 py-5 text-light">
      <h2 className="fw-bold mb-4">Títulos en Oferta Especial</h2>
      <ErrorApi error={error} onReintentar={recargar} />
      {cargando && !data && <Cargando texto="Cargando ofertas..." />}
      {!cargando && !error && ofertas.length === 0 && (
        <div className="alert alert-warning bg-dark text-warning border-warning">Por ahora no hay ofertas activas.</div>
      )}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-4">
        {ofertas.map((p) => (
          <div key={p.id} className="col">
            <ProductCard producto={p} onAddToCart={agregar} valoracion={resumenes[p.id]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Blog() {
  const articulos = [
    {
      id: 1,
      titulo: 'Los lanzamientos más esperados de la temporada 2026',
      fecha: '12 de Octubre, 2026',
      categoria: 'Lanzamientos',
      imagen: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      resumen: 'Analizamos los títulos de nueva generación que revolucionan el trazado de rayos en PC y consolas.',
    },
    {
      id: 2,
      titulo: 'Guía de optimización para motores gráficos de última generación',
      fecha: '08 de Octubre, 2026',
      categoria: 'Tecnología',
      imagen: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      resumen: 'Consejos clave para exprimir cada frame por segundo en monitores competitivos.',
    },
  ];

  return (
    <div className="container py-5 text-light">
      <h2 className="fw-bold mb-4">Nexus Gaming Blog</h2>
      <div className="row g-4">
        {articulos.map((art) => (
          <div key={art.id} className="col-md-6">
            <div className="card h-100 bg-dark text-light border-secondary border-opacity-25 rounded-4 overflow-hidden shadow">
              <img src={art.imagen} className="card-img-top object-fit-cover" alt={art.titulo} style={{ height: '220px' }} />
              <div className="card-body p-4">
                <span className="badge bg-primary mb-2">{art.categoria}</span>
                <h4 className="fw-bold">{art.titulo}</h4>
                <p className="text-secondary small">{art.resumen}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Nosotros() {
  return (
    <div className="container py-5 text-light" style={{ maxWidth: '800px' }}>
      <h2 className="fw-bold mb-3">Sobre Nexus Store</h2>
      <p className="text-secondary fs-5">
        Somos la tienda líder en distribución de licencias digitales de videojuegos en Chile. Nexus Store es una
        aplicación full stack: frontend SPA con React y Bootstrap 5, y backend con Spring Boot, Oracle y
        autenticación JWT, desarrollada para Duoc UC.
      </p>
    </div>
  );
}

export function Contacto() {
  const [enviado, setEnviado] = useState(false);
  return (
    <div className="container py-5 text-light" style={{ maxWidth: '650px' }}>
      <h2 className="fw-bold mb-4">Contacto y Soporte</h2>
      {enviado && <div className="alert alert-success">Mensaje enviado correctamente.</div>}
      <form onSubmit={(e) => { e.preventDefault(); setEnviado(true); }}>
        <div className="mb-3">
          <label className="form-label small text-secondary">Nombre</label>
          <input type="text" className="form-control bg-dark text-light border-secondary" required />
        </div>
        <div className="mb-3">
          <label className="form-label small text-secondary">Correo</label>
          <input type="email" className="form-control bg-dark text-light border-secondary" required />
        </div>
        <div className="mb-3">
          <label className="form-label small text-secondary">Mensaje</label>
          <textarea rows="4" className="form-control bg-dark text-light border-secondary" required></textarea>
        </div>
        <button type="submit" className="btn btn-primary px-4 fw-bold">Enviar Mensaje</button>
      </form>
    </div>
  );
}
