// Límites y validación de ConfigSitio (Propuesta 10) — un solo lugar para
// que el formulario del panel (ConfiguracionForm) y la API
// (/api/admin/config) validen exactamente lo mismo, sin que se desincronicen
// si alguno de los dos cambia a futuro.

export const WHATSAPP_VENTAS_MAX = 20; // dígitos + separadores que el admin haya tipeado, con margen
export const DESCRIPCION_EMPRESA_MAX = 300;
export const RIF_MAX = 20;

export interface ErroresConfigSitio {
  whatsappVentas?: string;
  descripcionEmpresa?: string;
  rif?: string;
}

// Los 3 campos ya recortados (trim) — vacío = "no configurado", no dispara
// validación de formato, solo de longitud (que ni recortado puede superar).
export interface CamposConfigSitio {
  whatsappVentas: string;
  descripcionEmpresa: string;
  rif: string;
}

export function validarConfigSitio(campos: CamposConfigSitio): ErroresConfigSitio {
  const errores: ErroresConfigSitio = {};

  if (campos.whatsappVentas.length > WHATSAPP_VENTAS_MAX) {
    errores.whatsappVentas = `Máximo ${WHATSAPP_VENTAS_MAX} caracteres.`;
  } else if (campos.whatsappVentas && campos.whatsappVentas.replace(/\D/g, "").length < 10) {
    errores.whatsappVentas = "Debe tener al menos 10 dígitos (formato internacional, sin “+” ni espacios).";
  }

  if (campos.descripcionEmpresa.length > DESCRIPCION_EMPRESA_MAX) {
    errores.descripcionEmpresa = `Máximo ${DESCRIPCION_EMPRESA_MAX} caracteres.`;
  }

  if (campos.rif.length > RIF_MAX) {
    errores.rif = `Máximo ${RIF_MAX} caracteres.`;
  }

  return errores;
}
