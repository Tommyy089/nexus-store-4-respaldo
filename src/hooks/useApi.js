import { useCallback, useEffect, useState } from 'react';

/**
 * Ejecuta una función asíncrona (llamada a la API) y expone { data, cargando, error, recargar }.
 * Se vuelve a ejecutar cuando cambian las dependencias o se llama a recargar().
 */
export function useApi(cargador, deps = []) {
  const [estado, setEstado] = useState({ data: null, cargando: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargador()
      .then((data) => activo && setEstado({ data, cargando: false, error: null }))
      .catch((error) => activo && setEstado({ data: null, cargando: false, error }));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, recargar };
}
