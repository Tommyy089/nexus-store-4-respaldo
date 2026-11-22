import React from 'react';
import { Link } from 'react-router-dom';
import useFavoritos from '../hooks/useFavoritos';
import Estrellas from './Estrellas';

const heroFallback = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';

/** Tarjeta premium; mantiene los identificadores y la lógica utilizados por las pruebas. */
export default function ProductCard({ producto, onAddToCart, onComparar, comparado = false, valoracion = null }) {
  const { contiene, alternar } = useFavoritos();
  if (!producto) return null;

  const stock = Number(producto.stock);
  const sinStock = stock <= 0;
  const esCritico = stock > 0 && stock <= 5;
  const precioFinal = Number(producto.precioFinal ?? producto.precio);

  return (
    <article className="card game-card-hover nexus-product-card h-100" data-testid="product-card">
      <div className="nexus-product-media">
        <Link to={`/producto/${producto.id}`} className="nexus-product-image-link" aria-label={`Ver detalles de ${producto.nombre}`}>
          <img src={producto.imagen} alt={producto.nombre} loading="lazy" className="nexus-product-image" onError={(e) => {
            const img = e.currentTarget;
            const coincidencia = String(producto.imagen).match(/\/apps\/(\d+)\//);
            if (coincidencia && !img.dataset.steamFallback) {
              img.dataset.steamFallback = '1';
              img.src = `https://cdn.akamai.steamstatic.com/steam/apps/${coincidencia[1]}/header.jpg`;
            } else if (img.src !== heroFallback) {
              img.src = heroFallback;
            }
          }} />
          <span className="nexus-product-image-shine" aria-hidden="true" />
        </Link>
        <button type="button" className={`nexus-wishlist-toggle ${contiene(producto.id) ? 'is-favorite' : ''}`}
          aria-label={contiene(producto.id) ? `Quitar ${producto.nombre} de favoritos` : `Añadir ${producto.nombre} a favoritos`}
          title="Lista de deseos" aria-pressed={contiene(producto.id)}
          onClick={() => alternar(producto.id)}>
          <i className={`bi ${contiene(producto.id) ? 'bi-heart-fill' : 'bi-heart'}`} aria-hidden="true" />
        </button>
        <span className="nexus-media-corner" aria-hidden="true"><i className="bi bi-arrow-up-right" /></span>
        {producto.oferta && (
          <span className="badge bg-danger nexus-sale-badge" data-testid="badge-oferta">-{producto.descuento}% OFERTA</span>
        )}
        {esCritico && (
          <span className="badge bg-warning text-dark nexus-stock-badge" data-testid="badge-critico">¡Últimas {producto.stock} unidades!</span>
        )}
      </div>

      <div className="card-body nexus-product-body d-flex flex-column">
        <span className="nexus-product-category"><i className="bi bi-stars" aria-hidden="true" /> {producto.categoria}</span>
        <h3 className="nexus-product-title" title={producto.nombre}><Link className="nexus-product-title-link" to={`/producto/${producto.id}`}>{producto.nombre}</Link></h3>
        <Link to={`/producto/${producto.id}#opiniones`} className="nexus-product-rating" aria-label={`Ver opiniones de ${producto.nombre}`}>
          {valoracion?.cantidad > 0 ? <><Estrellas compacto valor={valoracion.promedio} /><strong>{Number(valoracion.promedio).toFixed(1)}</strong><span>({valoracion.cantidad})</span></> :
            <><i className="bi bi-star" aria-hidden="true" /><span>Sin valoraciones</span></>}
        </Link>
        <p className="nexus-product-type">Licencia digital · Entrega inmediata</p>
        <div className="nexus-price-row mt-auto">
          <div className="nexus-price-stack">
            {producto.oferta && (
              <small className="nexus-old-price" data-testid="precio-original">${Number(producto.precio).toFixed(2)}</small>
            )}
            <span className="nexus-current-price" data-testid="precio-final">${precioFinal.toFixed(2)}</span>
          </div>
          <span className="nexus-availability" title={sinStock ? 'Sin stock' : 'Disponible'}>
            <span className={`nexus-stock-light ${sinStock ? 'is-out' : ''}`} />{sinStock ? 'Sin existencias' : 'Disponible'}
          </span>
        </div>
        <div className="nexus-product-actions">
          <Link to={`/producto/${producto.id}`} className="nexus-details-btn" title={`Detalle de ${producto.nombre}`}>
            Detalle <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
          {onComparar && <button type="button" className={`nexus-compare-btn ${comparado ? 'is-selected' : ''}`}
            aria-label={`${comparado ? 'Quitar de comparación' : 'Comparar'} ${producto.nombre}`}
            aria-pressed={comparado} title="Comparar juegos" onClick={() => onComparar(producto)}>
            <i className="bi bi-columns-gap" aria-hidden="true" />
          </button>}
          <button type="button" disabled={sinStock} onClick={() => onAddToCart && onAddToCart(producto)}
            className="nexus-add-btn">
            <i className="bi bi-bag-plus" aria-hidden="true" /> {sinStock ? 'Agotado' : 'Añadir al Carrito'}
          </button>
        </div>
      </div>
    </article>
  );
}
