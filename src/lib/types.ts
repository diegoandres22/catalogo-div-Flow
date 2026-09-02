// Tipos del dominio del catálogo. Ver PROMPT original para la estructura exacta requerida.

export interface TallaVariante {
  talla: string;
  disponible: number;
  bcdCode: string;
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
  precio: number;
  // TODO: reemplazar por columna real del SAP cuando se defina.
  // Por ahora todos los productos se venden en bultos de 12 pares.
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
