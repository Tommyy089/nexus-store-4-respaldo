import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { juegoService } from '../services/juegoService';
import { carritoService } from '../services/carritoService';
import { resenaService } from '../services/resenaService';
import { useApi } from '../hooks/useApi';
import useFavoritos from '../hooks/useFavoritos';
import Estrellas from '../components/Estrellas';
import ProductCard from '../components/ProductCard';
import { Cargando, ErrorApi } from '../components/Estado';

const fallback = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80';

function calcularResumen(resenas) {
  const cantidad = resenas.length;
  const frecuencias = [1, 2, 3, 4, 5].map(p => resenas.filter(r => r.puntuacion === p).length);
  const promedio = cantidad ? resenas.reduce((acc, r) => acc + r.puntuacion, 0) / cantidad : 0;
  return { cantidad, promedio, frecuencias };
}

function EstrellaEditable({ puntuacion, setPuntuacion }) {
  const [hover, setHover] = useState(0);
  return <div className="nexus-rating-picker" role="group" aria-label="Elegir puntuación de 1 a 5 estrellas">
    {[1, 2, 3, 4, 5].map(valor => <button type="button" key={valor}
      aria-label={`${valor} estrella${valor > 1 ? 's' : ''}`} aria-pressed={puntuacion === valor}
      onMouseEnter={() => setHover(valor)} onMouseLeave={() => setHover(0)} onFocus={() => setHover(valor)} onBlur={() => setHover(0)}
      onClick={() => setPuntuacion(valor)} className={(hover || puntuacion) >= valor ? 'is-active' : ''}>
      <i className={`bi ${(hover || puntuacion) >= valor ? 'bi-star-fill' : 'bi-star'}`} aria-hidden="true" />
    </button>)}
    <span>{puntuacion ? `${puntuacion}/5` : 'Selecciona una nota'}</span>
  </div>;
}

/** Detalle independiente accesible por un enlace permanente /producto/:id. */
export default function DetalleProducto() {
  const { id } = useParams();
  const location = useLocation();
  const { usuario, autenticado } = useAuth();
  const { notificar } = useToast();
  const { contiene, alternar } = useFavoritos();
  const [orden, setOrden] = useState('recientes');
  const [soloVerificadas, setSoloVerificadas] = useState(false);
  const [mostrar, setMostrar] = useState(5);
  const [puntuacion, setPuntuacion] = useState(0);
  const [titulo, setTitulo] = useState('');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [accionError, setAccionError] = useState('');
  const [imagenFallida, setImagenFallida] = useState(false);
  const [copiando, setCopiando] = useState(false);

  const { data: producto, cargando, error, recargar: reintentarProducto } = useApi(() => juegoService.obtener(id), [id]);
  const { data: resenas, cargando: cargandoResenas, error: errorResenas, recargar: recargarResenas } = useApi(() => resenaService.listar(id), [id]);
  const { data: similares } = useApi(() => juegoService.listar(), []);
  const lista = useMemo(() => resenas ?? [], [resenas]);
  const resumen = useMemo(() => calcularResumen(lista), [lista]);
  const propias = lista.find(r => Number(r.usuarioId) === Number(usuario?.id));
  const puedeOpinar = autenticado && ['CLIENTE', 'ADMIN'].includes(usuario?.rol);
  const similaresFiltrados = useMemo(() => (similares ?? [])
    .filter(p => String(p.id) !== String(id) && p.categoria === producto?.categoria).slice(0, 4), [similares, producto, id]);

  useEffect(() => {
    setOrden('recientes'); setSoloVerificadas(false); setMostrar(5); setImagenFallida(false); setAccionError('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  useEffect(() => {
    if (location.hash === '#opiniones' && producto) {
      document.getElementById('opiniones')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, producto]);

  useEffect(() => {
    const tituloPrevio = document.title;
    if (producto?.nombre) document.title = `${producto.nombre} | Nexus Store`;
    return () => { document.title = tituloPrevio; };
  }, [producto?.nombre]);

  useEffect(() => {
    if (propias) {
      setPuntuacion(propias.puntuacion);
      setTitulo(propias.titulo);
      setComentario(propias.comentario);
    } else {
      setPuntuacion(0); setTitulo(''); setComentario('');
    }
  }, [propias?.id, propias?.fechaActualizacion, id]);

  const ordenadas = useMemo(() => [...lista].sort((a,b) => {
    if (orden === 'mejores') return b.puntuacion - a.puntuacion;
    if (orden === 'criticas') return a.puntuacion - b.puntuacion;
    return new Date(b.fechaActualizacion || b.fechaCreacion) - new Date(a.fechaActualizacion || a.fechaCreacion);
  }), [lista, orden]);

  const visibles = useMemo(() => soloVerificadas ? ordenadas.filter(r => r.compraVerificada) : ordenadas, [ordenadas, soloVerificadas]);

  const comprar = () => {
    const resultado = carritoService.agregar(producto);
    notificar(resultado.mensaje, resultado.ok ? 'success' : 'warning');
  };

  const enviarResena = async (evento) => {
    evento.preventDefault();
    if (!puedeOpinar || guardando) return;
    setAccionError('');
    if (!puntuacion || titulo.trim().length < 3 || comentario.trim().length < 10) {
      setAccionError('Selecciona entre 1 y 5 estrellas, escribe un título de al menos 3 caracteres y una reseña de al menos 10.');
      return;
    }
    setGuardando(true);
    try {
      await resenaService.guardar(id, { puntuacion, titulo, comentario });
      notificar(propias ? 'Tu reseña se actualizó correctamente.' : 'Gracias por valorar este videojuego.');
      recargarResenas();
    } catch (e) {
      setAccionError(e.message || 'No se pudo guardar tu reseña.');
    } finally { setGuardando(false); }
  };

  const eliminarResena = async () => {
    if (!propias || !window.confirm('¿Eliminar tu reseña de este juego?')) return;
    setGuardando(true); setAccionError('');
    try {
      await resenaService.eliminar(id);
      notificar('Se eliminó tu reseña.');
      setPuntuacion(0); setTitulo(''); setComentario('');
      recargarResenas();
    } catch (e) { setAccionError(e.message || 'No fue posible eliminar tu reseña.'); }
    finally { setGuardando(false); }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiando(true);
      notificar('Enlace del videojuego copiado.');
    } catch { notificar('No se pudo copiar automáticamente. Copia la URL del navegador.', 'warning'); }
  };

  if (cargando && !producto) return <Cargando texto="Cargando ficha del videojuego..." />;
  if (error || !producto) return <div className="nexus-page-width nexus-detail-error">
    <i className="bi bi-controller" />
    <h1>{error?.status === 404 ? 'Videojuego no encontrado' : 'No pudimos cargar este videojuego'}</h1>
    <p>{error?.message || 'El título solicitado no está disponible en el catálogo.'}</p>
    <button type="button" className="nexus-hero-cta" onClick={reintentarProducto}>Reintentar</button>
    <Link to="/categorias" className="nexus-detail-alt-link">Explorar catálogo</Link>
  </div>;

  const agotado = Number(producto.stock) <= 0;
  const imagen = imagenFallida ? fallback : producto.imagen;

  return <div className="nexus-detail-page">
    <div className="nexus-detail-backdrop" style={{ backgroundImage: `linear-gradient(90deg,#090911dd,#090911eb),url(${imagen})` }} aria-hidden="true" />
    <div className="nexus-page-width nexus-detail-content">
      <nav className="nexus-breadcrumb" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link><i className="bi bi-chevron-right" /><Link to="/categorias">Catálogo</Link>
        <i className="bi bi-chevron-right" /><span aria-current="page">{producto.nombre}</span>
      </nav>
      <div className="nexus-detail-layout">
        <div className="nexus-detail-visual">
          <div className="nexus-detail-visual-frame">
            <img src={imagen} alt={`Carátula de ${producto.nombre}`} onError={() => setImagenFallida(true)} />
            {producto.oferta && <span className="nexus-detail-discount">-{producto.descuento}%</span>}
          </div>
          <div className="nexus-detail-thumb-caption"><i className="bi bi-shield-check" /> Imagen referencial · Producto digital de demostración académica</div>
        </div>
        <div className="nexus-detail-summary">
          <span className="nexus-detail-eyebrow"><span /> NEXUS SELECT · VIDEOJUEGOS</span>
          <div className="nexus-detail-category">{producto.categoria}</div>
          <h1>{producto.nombre}</h1>
          <div className="nexus-detail-rating-line">
            {resumen.cantidad > 0 ? <><Estrellas valor={resumen.promedio} /><strong>{resumen.promedio.toFixed(1)}</strong>
              <a href="#opiniones">{resumen.cantidad} reseña{resumen.cantidad === 1 ? '' : 's'} de usuarios</a></> :
              <a href="#opiniones" className="nexus-detail-no-reviews"><i className="bi bi-star" /> Sé el primero en valorar este juego</a>}
          </div>
          <p className="nexus-detail-lead">{producto.descripcion || 'Explora este videojuego y descubre la próxima aventura de tu colección.'}</p>
          <div className="nexus-detail-facts">
            <span><i className="bi bi-controller" /> {producto.tipoJuego || 'Licencia digital'}</span>
            <span><i className="bi bi-cloud-arrow-down" /> Entrega digital de demostración</span>
            <span><i className="bi bi-shield-lock" /> Acceso protegido con JWT</span>
          </div>
          <div className="nexus-detail-buy-panel">
            <div className="nexus-detail-price-caption">PRECIO EN NEXUS STORE · USD (DEMO)</div>
            <div className="nexus-detail-price-row"><strong>${producto.precioFinal.toFixed(2)}</strong>
              {producto.oferta && <span className="nexus-detail-strike">${producto.precio.toFixed(2)}</span>}
              <span className={`nexus-detail-stock ${agotado ? 'is-out' : ''}`}><i className="bi bi-circle-fill" /> {agotado ? 'Agotado' : `${producto.stock} disponibles`}</span>
            </div>
            <div className="nexus-detail-actions">
              <button type="button" className="nexus-detail-buy-button" disabled={agotado} onClick={comprar}>
                <i className="bi bi-bag-plus" /> {agotado ? 'Sin existencias' : 'Agregar al carrito'}
              </button>
              <button type="button" className={`nexus-detail-icon-button ${contiene(producto.id) ? 'is-active' : ''}`} onClick={() => alternar(producto.id)}
                aria-label={contiene(producto.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'} title="Favoritos">
                <i className={`bi ${contiene(producto.id) ? 'bi-heart-fill' : 'bi-heart'}`} />
              </button>
              <button type="button" className="nexus-detail-icon-button" onClick={copiarLink} aria-label="Copiar enlace del juego" title="Compartir">
                <i className={`bi ${copiando ? 'bi-check2' : 'bi-share'}`} />
              </button>
            </div>
            <p className="nexus-detail-demo-note"><i className="bi bi-info-circle" /> Proyecto académico: precios, stock y licencias son simulados. No hay cobros reales.</p>
          </div>
        </div>
      </div>

      <div className="nexus-detail-info-grid">
        <section className="nexus-detail-section" id="descripcion" aria-labelledby="titulo-descripcion">
          <span className="nexus-detail-eyebrow">ACERCA DEL PRODUCTO</span>
          <h2 id="titulo-descripcion">Descubre <em>la experiencia.</em></h2>
          <p>{producto.descripcion || 'La información detallada todavía no está disponible.'}</p>
          <div className="nexus-detail-spec-grid">
            <div><small>Nombre del videojuego</small><strong>{producto.nombre}</strong></div>
            <div><small>Género</small><strong>{producto.categoria || 'No especificado'}</strong></div>
            <div><small>Formato</small><strong>{producto.tipoJuego || 'Licencia digital'}</strong></div>
            <div><small>Disponibilidad</small><strong>{agotado ? 'Sin stock' : `${producto.stock} unidades (demo)`}</strong></div>
          </div>
          <div className="nexus-detail-legal"><i className="bi bi-info-circle" /> Las carátulas son referenciales y sus derechos pertenecen a sus titulares. Consulta los requisitos oficiales del juego antes de adquirirlo.</div>
        </section>
        <aside className="nexus-detail-highlights" aria-label="Cómo funciona Nexus Store">
          <h3>Una compra simple, de principio a fin.</h3>
          <div><i className="bi bi-search" /><span><strong>Explora la ficha</strong><small>Lee información, opiniones y disponibilidad del catálogo.</small></span></div>
          <div><i className="bi bi-cart-check" /><span><strong>Gestiona tu carrito</strong><small>Realiza una compra simulada mediante la plataforma.</small></span></div>
          <div><i className="bi bi-receipt" /><span><strong>Consulta tu pedido</strong><small>Accede a tus licencias de prueba y boleta interna.</small></span></div>
          <Link to="/categorias">Seguir explorando <i className="bi bi-arrow-right" /></Link>
        </aside>
      </div>

      <section className="nexus-detail-reviews" id="opiniones" aria-labelledby="titulo-resenas">
        <div className="nexus-detail-section-header">
          <div><span className="nexus-detail-eyebrow">LA COMUNIDAD OPINA</span><h2 id="titulo-resenas">Calificaciones <em>y reseñas.</em></h2>
            <p>Opiniones publicadas por usuarios identificados. Las compras verificadas se distinguen automáticamente.</p></div>
          <span className="nexus-detail-community-badge"><i className="bi bi-people" /> Comunidad Nexus</span>
        </div>
        <div className="nexus-detail-review-grid">
          <div className="nexus-detail-review-side">
            <div className="nexus-rating-summary">
              {cargandoResenas && !resenas ? <span>Consultando valoraciones...</span> : <>
                <strong className="nexus-rating-large">{resumen.cantidad ? resumen.promedio.toFixed(1) : '—'}<span>/5</span></strong>
                <Estrellas valor={resumen.promedio} />
                <p>{resumen.cantidad ? `${resumen.cantidad} reseña${resumen.cantidad === 1 ? '' : 's'} publicada${resumen.cantidad === 1 ? '' : 's'}` : 'Todavía no hay reseñas reales'}</p>
                {[5, 4, 3, 2, 1].map(nota => {
                  const count = resumen.frecuencias[nota - 1];
                  return <div className="nexus-rating-bar" key={nota} title={`${count} reseñas con ${nota} estrellas`}>
                    <span>{nota} <i className="bi bi-star-fill" /></span>
                    <div className="nexus-rating-track"><span style={{ width: `${resumen.cantidad ? (count / resumen.cantidad) * 100 : 0}%` }} /></div>
                    <small>{count}</small>
                  </div>;
                })}
              </>}
            </div>
            <div className="nexus-review-form-shell">
              <h3>{propias ? 'Edita tu valoración' : 'Valora este videojuego'}</h3>
              {!autenticado ? <p>Inicia sesión como cliente para dejar tu opinión. <Link to="/login">Iniciar sesión <i className="bi bi-arrow-up-right" /></Link></p> :
                !puedeOpinar ? <p>El rol VENDEDOR puede consultar reseñas, pero no publicarlas.</p> :
                <form onSubmit={enviarResena}>
                  <label className="nexus-review-label">Tu puntuación</label>
                  <EstrellaEditable puntuacion={puntuacion} setPuntuacion={setPuntuacion} />
                  <label htmlFor="review-title" className="nexus-review-label">Título de la reseña</label>
                  <input id="review-title" className="nexus-review-input" maxLength={100} minLength={3} required placeholder="Resume tu experiencia" value={titulo} onChange={e => setTitulo(e.target.value)} />
                  <label htmlFor="review-comment" className="nexus-review-label">Tu opinión</label>
                  <textarea id="review-comment" className="nexus-review-input" minLength={10} maxLength={1200} required rows={5} placeholder="¿Qué destacarías del videojuego?" value={comentario} onChange={e => setComentario(e.target.value)} />
                  <div className="nexus-review-character-count">{comentario.length}/1200 caracteres</div>
                  {accionError && <p role="alert" className="nexus-review-error">{accionError}</p>}
                  <button className="nexus-review-submit" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : propias ? 'Actualizar reseña' : 'Publicar reseña'}</button>
                  {propias && <button className="nexus-review-delete" type="button" onClick={eliminarResena} disabled={guardando}>Eliminar mi reseña</button>}
                  <p className="nexus-review-form-info">Solo se permite una reseña por usuario y juego. Se guarda en Oracle.</p>
                </form>}
            </div>
          </div>
          <div className="nexus-detail-review-feed">
            <div className="nexus-detail-review-toolbar"><h3>Opiniones de jugadores <span>({resumen.cantidad})</span></h3>
              <div className="nexus-review-toolbar-controls">
                <label className="nexus-review-verified-filter"><input type="checkbox" checked={soloVerificadas}
                  onChange={e => { setSoloVerificadas(e.target.checked); setMostrar(5); }} /> Solo compras verificadas</label>
                <select aria-label="Ordenar reseñas" value={orden} onChange={e => setOrden(e.target.value)}>
                  <option value="recientes">Más recientes</option><option value="mejores">Mejor valoradas</option><option value="criticas">Más críticas</option>
                </select>
              </div>
            </div>
            <ErrorApi error={errorResenas} onReintentar={recargarResenas} />
            {cargandoResenas && !resenas && <Cargando texto="Cargando reseñas..." />}
            {!cargandoResenas && !errorResenas && lista.length === 0 && <div className="nexus-review-empty"><i className="bi bi-chat-quote" /><h3>Aún no hay opiniones</h3>
              <p>Las calificaciones se mostrarán cuando los usuarios publiquen una reseña. Aquí nunca se inventan reseñas ni puntuaciones.</p></div>}
            {!cargandoResenas && !errorResenas && lista.length > 0 && visibles.length === 0 &&
              <div className="nexus-review-empty"><i className="bi bi-patch-check" /><h3>Sin compras verificadas todavía</h3>
                <p>Puedes desactivar el filtro para leer todas las opiniones.</p></div>}
            <div className="nexus-review-list">{visibles.slice(0, mostrar).map(r => <article className="nexus-review-item" key={r.id}>
              <div className="nexus-review-item-head"><span className="nexus-review-avatar" aria-hidden="true">{(r.autor || '?').charAt(0).toUpperCase()}</span>
                <div className="nexus-review-author"><strong>{r.autor}</strong><span>{new Date(r.fechaActualizacion || r.fechaCreacion).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                {r.compraVerificada && <span className="nexus-review-verified"><i className="bi bi-patch-check-fill" /> Compra verificada</span>}</div>
              <div className="nexus-review-title-row"><Estrellas valor={r.puntuacion} compacto /><h4>{r.titulo}</h4></div>
              <p>{r.comentario}</p></article>)}</div>
            {visibles.length > mostrar && <button type="button" className="nexus-review-more" onClick={() => setMostrar(prev => prev + 5)}>Ver más opiniones <i className="bi bi-arrow-down" /></button>}
          </div>
        </div>
      </section>
      {similaresFiltrados.length > 0 && <section className="nexus-detail-related" aria-labelledby="relacionados-titulo">
        <div className="nexus-section-header"><div><span className="nexus-detail-eyebrow">SIGUE EXPLORANDO</span><h2 id="relacionados-titulo">También te <em>podría gustar.</em></h2></div>
          <Link to="/categorias" className="nexus-section-link">Catálogo completo <i className="bi bi-arrow-right" /></Link></div>
        <div className="nexus-product-grid">{similaresFiltrados.map(p => <ProductCard key={p.id} producto={p} onAddToCart={j => {
          const resultado = carritoService.agregar(j);
          notificar(resultado.mensaje, resultado.ok ? 'success' : 'warning');
        }} />)}</div>
      </section>}
    </div>
  </div>;
}
