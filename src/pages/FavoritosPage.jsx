import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useFavoritos from '../hooks/useFavoritos';
import { juegoService } from '../services/juegoService';
import { carritoService } from '../services/carritoService';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import { Cargando, ErrorApi } from '../components/Estado';
import useValoracionesResumen from '../hooks/useValoracionesResumen';

export default function FavoritosPage() {
  const { ids } = useFavoritos();
  const resumenes = useValoracionesResumen();
  const { notificar } = useToast();
  const { data, cargando, error, recargar } = useApi(() => juegoService.listar(), []);
  const juegos = useMemo(() => (data ?? []).filter(p => ids.includes(Number(p.id))), [data, ids]);
  const agregar = p => {
    const resultado = carritoService.agregar(p);
    notificar(resultado.mensaje, resultado.ok ? 'success' : 'warning');
  };

  return <div className="nexus-page-width nexus-favorites-page">
    <div className="nexus-catalog-head">
      <span className="nexus-section-eyebrow">TU COLECCIÓN PERSONAL</span>
      <h1>MI <strong>LISTA DE DESEOS</strong></h1>
      <p>Guarda títulos para revisarlos más adelante. Tus favoritos se conservan en este navegador.</p>
      <div className="nexus-results-meta"><i className="bi bi-heart-fill" /> {juegos.length} juegos favoritos</div>
    </div>
    <ErrorApi error={error} onReintentar={recargar} />
    {cargando && !data && <Cargando texto="Buscando tus juegos favoritos..." />}
    {!cargando && !error && juegos.length === 0 && <div className="nexus-empty-state">
      <i className="bi bi-heart" aria-hidden="true" />
      <h2>Aún no tienes juegos guardados</h2>
      <p>Presiona el corazón en la carátula de cualquier videojuego para añadirlo aquí.</p>
      <Link to="/categorias" className="nexus-hero-cta">Explorar el catálogo <i className="bi bi-arrow-up-right" /></Link>
    </div>}
    <div className="nexus-product-grid nexus-favorites-grid">
      {juegos.map(j => <ProductCard key={j.id} producto={j} onAddToCart={agregar} valoracion={resumenes[j.id]} />)}
    </div>
  </div>;
}
