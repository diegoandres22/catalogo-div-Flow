// Tipos del dominio del catálogo. Fuente real: export crudo de SAP (hoja
// "OITM"), una fila por Modelo+Color+Rango de tallas — ver transform.ts.
//
// Un producto del catálogo es un MODELO (ej. "AIKE") — no un modelo+color.
// Cada color en el que existe ese modelo (ej. "BLANCO", "NEGRO") es una
// variante dentro de "colores". Y dentro de cada color, cada rango de
// tallas distinto que trae el SAP (ej. "33-38" y "39-44" del mismo
// modelo+color, dos bultos distintos) es una "curva" separada — no se
// fusionan entre sí, porque cada una es un bulto comprable aparte.

export interface TallaVariante {
  talla: string;
  // Stock total ofertado (físico + en tránsito desde China) — lo que
  // decide si la talla se muestra agotada o no. Igual que antes.
  disponible: number;
  // Solo la porción de "disponible" que ya está físicamente en el almacén
  // (columna "OnHand" del SAP, repartida proporcionalmente entre tallas de
  // la misma forma que "disponible" reparte "Disponible a Ofertar"). Sirve
  // para distinguir "hay ya" de "viene en camino" sin dejar de ofertar lo
  // que está en tránsito.
  disponibleFisico: number;
  // Cuántos pares de esta talla exacta vienen en un bulto — viene de la
  // columna "Curva" del SAP (ej. "1-2-3-3-2-1" repartido sobre "Serie"
  // "35-40"). No aplica a productos sin curva de tallas (accesorios).
  porBulto?: number;
}

// Una curva = un rango de tallas con su propio patrón de pares por bulto.
// El mismo modelo+color puede tener más de una (ej. "33-38" y "39-44"):
// son dos bultos distintos y comprables por separado, no una sola mezcla.
export interface Curva {
  id: string; // slug estable del rango (ej. "35-40", "unico")
  rango: string; // etiqueta legible: "35-40" o "Único" (accesorios/sin curva)
  codigoSap: string; // ItemCode de SAP para esta fila exacta (color+curva)
  cantidadPorBulto: number; // suma de pares de esta curva (1 para accesorios)
  tallas: TallaVariante[];
}

export interface VarianteColor {
  color: string;
  precio: number;
  promocion: boolean;
  fotos: string[];
  curvas: Curva[]; // 1 o más
}

export interface Materiales {
  exterior?: string;
  interior?: string;
  suela?: string;
  tipoCalzado?: string;
}

export interface Producto {
  id: string; // slug estable derivado del modelo (sin el color)
  modelo: string;
  marca: string;
  genero: string;
  rubro: string; // "CALZADO" | "ACCESORIOS" | lo que traiga U_PX_Rubro
  linea?: string; // U_PX_Linea — categoría/estilo (ej. "CASUAL SPORT", "LADIES")
  codigoModelo?: string; // "#Modelo" — código corto interno (ej. "2103"), igual para todos los colores de este modelo
  materiales?: Materiales;
  colores: VarianteColor[]; // 1 o más
}

// La guía de tallas NO es un dato por producto: son 1-2 imágenes fijas
// (instrucciones de cómo medir + tabla de equivalencias) que el admin sube
// una sola vez desde el panel y se aplican a todo el calzado del catálogo.
// Se guarda y se lee aparte del catálogo — ver lib/blob.ts.
export interface GuiaTallas {
  instrucciones: string | null;
  tabla: string | null;
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

// Comparación entre el catálogo publicado y el que resulta de una carga
// nueva, ANTES de confirmar el reemplazo — ver lib/diffCatalogo.ts. Se
// compara por "modelo" (no por id), porque es el identificador estable que
// el admin reconoce; el id interno puede variar si cambia el orden de filas.
export interface ProductoDiff {
  modelo: string;
  marca: string;
}

export interface CambioPrecioDiff extends ProductoDiff {
  precioAntes: number;
  precioDespues: number;
}

export interface DiffCatalogo {
  nuevos: ProductoDiff[];
  bajas: ProductoDiff[];
  cambiosPrecio: CambioPrecioDiff[];
}

// Un registro por cada carga CONFIRMADA (no cada análisis) — historial de
// reemplazos del catálogo publicado, incluyendo reversiones al respaldo.
// Ver lib/blob.ts (agregarEntradaHistorial/leerHistorial).
export interface EntradaHistorial {
  id: string; // string numérico (Date.now() al confirmar) — también el orden cronológico
  fecha: string; // ISO 8601
  origen: "archivo" | "google_sheets" | "revertir";
  nombreArchivo: string | null;
  totalProductos: number;
  totalVariantes: number;
  totalErrores: number;
  totalSinFoto: number; // subconjunto de errores cuyo motivo es "sin foto" — productos excluidos por esa razón puntual
}

// Configuración operativa del sitio que antes solo se podía cambiar desde
// Vercel (variables de entorno) o estaba fija en el código — ver
// lib/blob.ts (leerConfigSitio/guardarConfigSitio) y /admin/configuracion.
// Todos los campos son opcionales: si no están configurados acá, se usa el
// valor por defecto (variable de entorno o texto fijo, según el campo).
export interface ConfigSitio {
  whatsappVentas: string | null; // solo dígitos, formato internacional (ej. "584121234567")
  descripcionEmpresa: string | null;
  rif: string | null;
}
