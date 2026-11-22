export const formatoPrecio = (n) => `$${Number(n || 0).toFixed(2)}`;

export const formatoFecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CL') : '');

/** Desglosa un total con IVA incluido (19% Chile) en neto + IVA. */
export function calcularDesgloseIVA(totalBruto) {
  const total = Number(totalBruto) || 0;
  const neto = Number((total / 1.19).toFixed(2));
  const iva = Number((total - neto).toFixed(2));
  return { neto, iva, total: Number(total.toFixed(2)) };
}
