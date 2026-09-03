// Tipos del dominio del catálogo. Fuente real: export crudo de SAP (hoja
// "OITM"), una fila por Modelo+Color+Rango de tallas — ver transform.ts.

export interface TallaVariante {
  talla: string;
  disponible: number;
  // Cuántos pares de esta talla exacta vienen en un bulto — viene de la
  // columna "Curva" del SAP (ej. "1-2-3-3-2-1" repartido sobre "Serie"
  // "35-40"). No aplica a productos sin curva de tallas (accesorios).
  porBulto?: number;
}

export interface Materiales {
  exterior?: string;
  interior?: string;
  suela?: string;
  tipoCalzado?: string;
}

export interface Producto {
  id: string; // slug estable derivado de modelo + color
  modelo: string;
  marca: string;
  genero: string;
  color: string;
  rubro: string; // "CALZADO" | "ACCESORIOS" | lo que traiga U_PX_Rubro
  linea?: string; // U_PX_Linea — categoría/estilo (ej. "CASUAL SPORT", "LADIES")
  precio: number;
  promocion: boolean;
  codigoSap: string; // ItemCode representativo del producto (SAP)
  // Suma de la curva de tallas (pares por bulto). 1 para productos sin curva
  // (accesorios: se venden por unidad, no por bulto).
  cantidadPorBulto: number;
  fotos: string[];
  guiaTallas: string[];
  tallas: TallaVariante[];
  materiales?: Materiales;
}

export interface Catalogo {
  productos: Producto[];
  generadoEn: string; // ISO 8601
  totalProductos: number;
  totalVariantes: number;
}

export interface ErrorImportacion {
  fila: number | null; // null cuando el error es a nivel de producto agrupado, no de una fila puntual
  modelo?: string;
  color?: string;
  motivo: string;
}

export interface ResumenImportacion {
  ok: boolean;
  totalFilasOrigen: number;
  totalProductos: number;
  totalVariantes: number;
  errores: ErrorImportacion[];
  columnasFaltantes?: string[];
  mensaje?: string;
}
