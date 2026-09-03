// Fuente única de verdad para la guía de columnas que se muestra en el
// panel de admin. Las obligatorias se importan de transform.ts (donde vive
// la validación real) para que la guía nunca quede desincronizada de lo que
// el sistema efectivamente exige.
//
// Estas son las columnas reales del export de SAP (hoja "OITM" de la
// "Lista de Precio al mayor"), no una plantilla simplificada — una fila es
// un Modelo+Color+Rango de tallas, no una fila por talla individual.

import { COLUMNAS_OBLIGATORIAS } from "./transform";

export type TipoColumna = "texto" | "numero" | "curva" | "url";

export interface ColumnaGuia {
  columna: string;
  obligatoria: boolean;
  tipo: TipoColumna;
  ejemplo: string;
  descripcion: string;
  siFalta: string;
}

const ETIQUETA_TIPO: Record<TipoColumna, string> = {
  texto: "Texto",
  numero: "Número",
  curva: "Rango o curva",
  url: "URL",
};

export function etiquetaTipo(tipo: TipoColumna): string {
  return ETIQUETA_TIPO[tipo];
}

export const COLUMNAS_GUIA: ColumnaGuia[] = [
  {
    columna: "ItemCode",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "PI20189901706050",
    descripcion: "Código SAP de esa fila (Modelo+Color+Rango de tallas). Se muestra como \"Código SAP\" en el detalle del producto.",
    siFalta: "La fila se descarta — no se puede identificar el producto.",
  },
  {
    columna: "U_PX_Modelo",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "KZ-1899",
    descripcion: "Agrupa todas las tallas y rangos de un mismo modelo en un solo producto del catálogo.",
    siFalta: "La fila se descarta.",
  },
  {
    columna: "U_PX_Color",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "BEIGE",
    descripcion: "Junto con el modelo, define cada producto individual (mismo modelo + distinto color = productos separados).",
    siFalta: "La fila se descarta.",
  },
  {
    columna: "U_PX_Marca",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "KRIZA",
    descripcion: "Se usa en la tarjeta de producto y en el filtro por marca.",
    siFalta: "La fila se descarta.",
  },
  {
    columna: "U_PX_Rubro",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "CALZADO",
    descripcion:
      "\"CALZADO\" expande U_PX_Serie + U_PX_Curva en tallas individuales. Cualquier otro valor (ej. \"ACCESORIOS\") se importa como producto de talla única (\"Único\"), vendido por unidad.",
    siFalta: "Filas sin rubro se descartan en silencio (relleno vacío típico del export de SAP, no cuenta como error).",
  },
  {
    columna: "PV Fabrica",
    obligatoria: true,
    tipo: "numero",
    ejemplo: "12.99",
    descripcion: "Precio de venta al mayor que se muestra en el catálogo. Si el modelo+color trae más de un precio, se usa el más frecuente del grupo.",
    siFalta: "La fila se descarta si el valor está vacío, no es un número o es negativo.",
  },
  {
    columna: "U_PX_Serie",
    obligatoria: false,
    tipo: "curva",
    ejemplo: "35-40",
    descripcion: "Rango de tallas del producto (solo calzado). Junto con U_PX_Curva se expande en tallas individuales (35, 36, 37…).",
    siFalta: "Si el rubro es CALZADO y falta Serie o Curva, esa fila se rechaza con motivo — el resto del archivo se importa igual.",
  },
  {
    columna: "U_PX_Curva",
    obligatoria: false,
    tipo: "curva",
    ejemplo: "1-2-3-3-2-1",
    descripcion:
      "Pares de cada talla del rango, en el mismo orden — debe traer tantos números como tallas tenga U_PX_Serie. También define \"Venta por bulto de N pares\" (la suma de la curva).",
    siFalta: "Si el rubro es CALZADO y no calza en cantidad con U_PX_Serie, esa fila se rechaza con motivo.",
  },
  {
    columna: "Disponible a Ofertar",
    obligatoria: false,
    tipo: "numero",
    ejemplo: "153",
    descripcion:
      "Stock total del producto (no por talla — el SAP no lo trae desglosado). Se reparte entre las tallas según la proporción de la curva para decidir cuáles se muestran disponibles o agotadas.",
    siFalta: "Se asume 0 — todas las tallas de esa fila se muestran agotadas.",
  },
  {
    columna: "U_PX_Genero",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "DAMA",
    descripcion: "Se usa en el detalle del producto y en el filtro por género.",
    siFalta: "El producto no aparece en ningún filtro de género.",
  },
  {
    columna: "U_PX_Linea",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "LADIES",
    descripcion: "Categoría o estilo del producto (ej. Casual Sport, Colegial, Cartera). Se usa en el filtro por línea.",
    siFalta: "El producto no aparece en ningún filtro de línea.",
  },
  {
    columna: "U_Promocion",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "S",
    descripcion: "\"S\" muestra una etiqueta de \"Promoción\" en la tarjeta del producto. Cualquier otro valor (o vacío) no la muestra.",
    siFalta: "El producto se importa igual, sin la etiqueta de promoción.",
  },
  {
    columna: "U_LinkImagenChasea",
    obligatoria: false,
    tipo: "url",
    ejemplo: "https://cdn.shopify.com/.../1899_beige_0.jpg",
    descripcion: "Foto del producto. Si falta, se intenta con la columna \"Foto\".",
    siFalta:
      "Si el producto (agrupado por modelo+color) queda sin ninguna foto real, se excluye del catálogo publicado — no es un error del archivo, es la regla de negocio.",
  },
  {
    columna: "Status Imagen",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Con Foto",
    descripcion: "Informativo — la regla real de \"sin foto\" se aplica sobre la URL de la foto, no sobre este texto.",
    siFalta: "No afecta el import.",
  },
];

// Chequeo en build/dev de que las obligatorias declaradas acá coinciden 1:1
// con las que exige transform.ts — si alguien agrega/saca una obligatoria
// de un lado y se olvida del otro, esto lo hace evidente (no rompe nada en
// producción, es solo una guarda de consistencia).
const obligatoriasGuia = new Set(COLUMNAS_GUIA.filter((c) => c.obligatoria).map((c) => c.columna));
const obligatoriasReales = new Set<string>(COLUMNAS_OBLIGATORIAS);
if (
  obligatoriasGuia.size !== obligatoriasReales.size ||
  [...obligatoriasReales].some((c) => !obligatoriasGuia.has(c))
) {
  console.warn("columnasGuia.ts desincronizado de COLUMNAS_OBLIGATORIAS en transform.ts");
}
