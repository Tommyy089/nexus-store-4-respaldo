import { useEffect, useState } from 'react';
import { favoritos } from '../services/favorites';

export default function useFavoritos() {
  const [ids, setIds] = useState(() => favoritos.listar());
  useEffect(() => favoritos.suscribir(() => setIds(favoritos.listar())), []);
  return { ids, alternar: favoritos.alternar, contiene: id => ids.includes(Number(id)) };
}
