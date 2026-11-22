import { useApi } from './useApi';
import { resenaService } from '../services/resenaService';

/** Consulta agregada: una sola petición para las calificaciones de todo el catálogo. */
export default function useValoracionesResumen() {
  const { data } = useApi(() => resenaService.resumen(), []);
  return data || {};
}
