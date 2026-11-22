import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { juegoService } from '../services/juegoService';
import { carritoService } from '../services/carritoService';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import { Cargando, ErrorApi } from '../components/Estado';
import useValoracionesResumen from '../hooks/useValoracionesResumen';

/** Portada dinámica con productos reales obtenidos desde Spring Boot, sin catálogo simulado. */
export default function Home() {
  const [activoIdx, setActivoIdx] = useState(0);
  const [pausado, setPausado] = useState(false);
  const { notificar } = useToast();
  const resumenes = useValoracionesResumen();
  const { data, cargando, error, recargar } = useApi(() => juegoService.listar(), []);
  const productos = useMemo(() => data ?? [], [data]);
  const destacados = useMemo(
    () => [...productos].filter(p => p.imagen.includes('steamstatic.com') && p.stock > 0).sort((a,b) => b.descuento-a.descuento).slice(0,4).concat(
      [...productos].filter(p => !p.imagen.includes('steamstatic.com')).slice(0,4)
    ).slice(0,4),
    [productos],
  );
  const indiceActivo = activoIdx % Math.max(destacados.length, 1);
  const itemActivo = destacados[indiceActivo];

  useEffect(() => {
    if (destacados.length < 2 || pausado) return undefined;
    const timer = setInterval(() => setActivoIdx((prev) => (prev + 1) % destacados.length), 6500);
    return () => clearInterval(timer);
  }, [destacados.length, pausado]);

  const agregarAlCarrito = (prod) => {
    const r = carritoService.agregar(prod);
    notificar(r.mensaje, r.ok ? 'success' : 'warning');
  };

  const pasarSlide = (paso) => setActivoIdx((i) => (i + paso + destacados.length) % destacados.length);
  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].slice(0, 5);
  const enOferta = productos.filter(p => p.oferta).length;
  const conStock = productos.filter(p => p.stock > 0).length;
  const colecciones = [
    { nombre: 'Acción / RPG', icono: 'bi-lightning-charge', etiqueta: 'ACCIONES ÉPICAS', tono: 'violet' },
    { nombre: 'Aventura', icono: 'bi-compass', etiqueta: 'MUNDOS POR DESCUBRIR', tono: 'blue' },
    { nombre: 'Indie', icono: 'bi-stars', etiqueta: 'JOYAS INDEPENDIENTES', tono: 'pink' },
    { nombre: 'Supervivencia', icono: 'bi-fire', etiqueta: 'SUPERA EL LÍMITE', tono: 'mint' },
  ].filter(c => productos.some(p => p.categoria === c.nombre));

  return (
    <div className="nexus-home">
      <div className="nexus-page-width">
        <div className="nexus-eyebrow-bar">
          <span className="nexus-live-label"><span className="nexus-live-light" /> TU UNIVERSO GAMING EMPIEZA AQUÍ</span>
          <span className="nexus-eyebrow-right"><i className="bi bi-lightning-charge-fill" /> Licencias digitales · Compra segura</span>
        </div>

        {itemActivo && (
          <section className="nexus-hero" data-testid="hero" aria-label="Videojuegos destacados"
            onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}
            onFocusCapture={() => setPausado(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPausado(false); }}>
            <div key={itemActivo.id} className="nexus-hero-background" style={{ backgroundImage: `url(${itemActivo.imagen})` }} aria-hidden="true" />
            <div className="nexus-hero-overlay" aria-hidden="true" />
            <div className="nexus-hero-grid" aria-hidden="true" />
            <div className="nexus-hero-orb nexus-hero-orb--one" aria-hidden="true" />
            <div className="nexus-hero-orb nexus-hero-orb--two" aria-hidden="true" />

            <div className="nexus-hero-copy" key={`copy-${itemActivo.id}`}>
              <span className="nexus-hero-kicker"><span className="nexus-kicker-line" /> {itemActivo.oferta ? 'OFERTA EXCLUSIVA' : 'DESTACADO DE LA SEMANA'} <span className="nexus-hero-index">/ 0{indiceActivo + 1}</span></span>
              <h1><span>ELEVA TU</span><strong>EXPERIENCIA.</strong></h1>
              <p className="nexus-featured-name">{itemActivo.nombre}</p>
              <p className="nexus-featured-description">{itemActivo.descripcion}</p>
              <div className="nexus-hero-actions">
                <button type="button" onClick={() => agregarAlCarrito(itemActivo)} disabled={itemActivo.stock <= 0}
                  className="nexus-hero-cta"><span>{itemActivo.stock > 0 ? 'Comprar Ahora' : 'Sin stock'}</span><i className="bi bi-arrow-up-right" /></button>
                <Link to={`/producto/${itemActivo.id}`} className="nexus-hero-secondary">Explorar juego <i className="bi bi-arrow-right" /></Link>
              </div>
              <div className="nexus-featured-price"><span>DESDE</span><strong>${Number(itemActivo.precioFinal).toFixed(2)}</strong><span>USD</span></div>
            </div>

            <div className="nexus-hero-controls">
              <div className="nexus-slide-dots" role="group" aria-label="Seleccionar juego destacado">
                {destacados.map((item, idx) => (
                  <button key={item.id} type="button" className={`nexus-slide-dot ${idx === indiceActivo ? 'active' : ''}`}
                    aria-label={`Mostrar destacado ${idx + 1}: ${item.nombre}`} aria-current={idx === indiceActivo ? 'true' : undefined}
                    onClick={() => setActivoIdx(idx)}><span /></button>
                ))}
              </div>
              <div className="nexus-slide-arrows">
                <button type="button" onClick={() => pasarSlide(-1)} aria-label="Anterior destacado"><i className="bi bi-arrow-left" /></button>
                <button type="button" onClick={() => pasarSlide(1)} aria-label="Siguiente destacado"><i className="bi bi-arrow-right" /></button>
              </div>
            </div>
            <div className="nexus-hero-side-label" aria-hidden="true">NEXUS / NEXT LEVEL GAMING</div>
          </section>
        )}

        <div className="nexus-live-stats" aria-label="Estadísticas del catálogo">
          <span><strong>{productos.length}</strong> juegos en catálogo</span>
          <i className="bi bi-dot" aria-hidden="true" />
          <span><strong>{enOferta}</strong> promociones disponibles</span>
          <i className="bi bi-dot" aria-hidden="true" />
          <span><strong>{conStock}</strong> con stock</span>
          <Link to="/favoritos"><i className="bi bi-heart" /> Mi lista de deseos <i className="bi bi-arrow-up-right" /></Link>
        </div>

        <div className="nexus-benefits-row" aria-label="Beneficios de la tienda">
          <div><i className="bi bi-lightning-charge" /><span><strong>ENTREGA DIGITAL</strong><small>Tu juego al instante</small></span></div>
          <div><i className="bi bi-shield-check" /><span><strong>COMPRA SEGURA</strong><small>Autenticación protegida</small></span></div>
          <div><i className="bi bi-controller" /><span><strong>CATÁLOGO GAMING</strong><small>Descubre tu próximo juego</small></span></div>
          <div><i className="bi bi-headset" /><span><strong>SOPORTE</strong><small>Estamos para ayudarte</small></span></div>
        </div>

        <section className="nexus-section" aria-labelledby="nexus-catalog-heading">
          <div className="nexus-section-header">
            <div>
              <p className="nexus-section-eyebrow"><span /> EXPLORE THE UNIVERSE</p>
              <h2 id="nexus-catalog-heading">Juegos <em>destacados.</em></h2>
              <p className="nexus-section-subtitle">Tu próximo mundo comienza aquí. Catálogo conectado en vivo a nuestra tienda.</p>
            </div>
            <Link to="/categorias" className="nexus-section-link">Explorar catálogo <i className="bi bi-arrow-up-right" /></Link>
          </div>

          {categorias.length > 0 && (
            <div className="nexus-category-chips" aria-label="Géneros disponibles">
              <Link className="nexus-chip is-selected" to="/categorias">Todos los juegos</Link>
              {categorias.map((categoria) => <Link key={categoria} className="nexus-chip" to={`/categorias?categoria=${encodeURIComponent(categoria)}`}>{categoria}</Link>)}
            </div>
          )}

          {cargando && productos.length === 0 && <Cargando texto="Cargando catálogo..." />}
          <ErrorApi error={error} onReintentar={recargar} />
          <div className="nexus-product-grid" data-testid="home-product-list">
            {productos.slice(0, 10).map((p) => <ProductCard key={p.id} producto={p} onAddToCart={agregarAlCarrito} valoracion={resumenes[p.id]} />)}
          </div>
        </section>

        {productos.length > 10 && <div className="nexus-home-catalog-link"><span>¿Buscas algo diferente? Hay más universos por explorar.</span>
          <Link to="/categorias" className="nexus-section-link">Descubrir los {productos.length} videojuegos <i className="bi bi-arrow-up-right" /></Link></div>}

        {colecciones.length > 0 && <section className="nexus-collections" aria-labelledby="colecciones-titulo">
          <div className="nexus-section-header"><div><p className="nexus-section-eyebrow">ENCUENTRA TU ESTILO DE JUEGO</p>
            <h2 id="colecciones-titulo">EXPLORA POR <em>GÉNERO.</em></h2>
            <p className="nexus-section-subtitle">Desde grandes aventuras hasta historias independientes.</p></div></div>
          <div className="nexus-collections-grid">{colecciones.map(c => <Link key={c.nombre}
            className={`nexus-collection nexus-collection--${c.tono}`} to={`/categorias?categoria=${encodeURIComponent(c.nombre)}`}>
            <i className={`bi ${c.icono} nexus-collection-icon`} aria-hidden="true" />
            <span className="nexus-collection-eyebrow">{c.etiqueta}</span>
            <strong>{c.nombre}</strong>
            <span className="nexus-collection-count">{productos.filter(p => p.categoria === c.nombre).length} videojuegos <i className="bi bi-arrow-up-right" /></span>
          </Link>)}</div>
        </section>}

        <section className="nexus-promo-panel">
          <div className="nexus-promo-glow" aria-hidden="true" />
          <div className="nexus-promo-content">
            <span className="nexus-section-eyebrow">DESCUBRE · JUEGA · REPITE</span>
            <h2>NO SOLO JUEGUES.<br /><strong>VIVE EL SIGUIENTE NIVEL.</strong></h2>
            <p>Explora nuevas historias, encuentra ofertas y lleva tu biblioteca digital más lejos.</p>
            <Link to="/ofertas" className="nexus-hero-cta">Ver ofertas <i className="bi bi-arrow-up-right" /></Link>
          </div>
          <i className="bi bi-controller nexus-promo-controller" aria-hidden="true" />
        </section>
      </div>
    </div>
  );
}
