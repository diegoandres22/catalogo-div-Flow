// Fuente única de verdad para la guía de columnas que se muestra en el
// panel de admin. Las obligatorias se importan de transform.ts (donde vive
// la validación real) para que la guía nunca quede desincronizada de lo que
// el sistema efectivamente exige.

import { COLUMNAS_OBLIGATORIAS } from "./transform";

export type TipoColumna = "texto" | "numero" | "urls";

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
  urls: "URLs separadas por coma",
};

export function etiquetaTipo(tipo: TipoColumna): string {
  return ETIQUETA_TIPO[tipo];
}

export const COLUMNAS_GUIA: ColumnaGuia[] = [
  {
    columna: "Nombre modelo",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "Bota Urbana 220",
    descripcion: "Agrupa todas las tallas y colores de un mismo modelo en un solo producto del catálogo.",
    siFalta: "La fila se descarta — no se puede armar un producto sin modelo.",
  },
  {
    columna: "Color",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "Negro",
    descripcion: "Junto con el modelo, define cada producto individual del catálogo (mismo modelo + distinto color = productos separados).",
    siFalta: "La fila se descarta.",
  },
  {
    columna: "Talla",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "38",
    descripcion: "Identifica cada variante dentro del producto (el selector de talla en el detalle).",
    siFalta: "La fila se descarta.",
  },
  {
    columna: "Price",
    obligatoria: true,
    tipo: "numero",
    ejemplo: "24.90",
    descripcion: "Precio en USD. Si las tallas de un mismo modelo+color traen precios distintos, se usa el más frecuente del grupo.",
    siFalta: "La fila se descarta si el valor está vacío, no es un número o es negativo.",
  },
  {
    columna: "BcdCode",
    obligatoria: true,
    tipo: "texto",
    ejemplo: "VLP-220-NEG-38",
    descripcion: "Identificador SAP de esa variante puntual. Se muestra en el detalle del producto (talla · SKU) para cruzar contra Excel.",
    siFalta: "La fila se descarta.",
  },
  {
    columna: "Marca",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Volpe",
    descripcion: "Se usa en la tarjeta de producto y en el filtro por marca.",
    siFalta: "El producto queda sin marca visible y no aparece en ningún filtro de marca.",
  },
  {
    columna: "U_PX_Genero",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Dama",
    descripcion: "Se usa en el detalle del producto y en el filtro por género.",
    siFalta: "El producto no aparece en ningún filtro de género.",
  },
  {
    columna: "Disponible",
    obligatoria: false,
    tipo: "numero",
    ejemplo: "12",
    descripcion: "Stock de esa talla puntual. Cualquier valor mayor a 0 se considera disponible.",
    siFalta: "La talla se muestra como agotada (se asume 0).",
  },
  {
    columna: "Todas las fotos y guia de tallas",
    obligatoria: false,
    tipo: "urls",
    ejemplo: "https://cdn.../foto1.jpg, https://cdn.../guiaTallasMesvol.jpg",
    descripcion:
      "URLs separadas por coma. Las que contienen \"guiaTallasMesvol\" se guardan aparte como guía de tallas; el resto son fotos reales del producto.",
    siFalta:
      "Si el producto (agrupado por modelo+color) queda sin ninguna foto real, se excluye del catálogo publicado — no es un error del archivo, es la regla de negocio.",
  },
  {
    columna: "Materiales del exterior",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Cuero sintético",
    descripcion: "Ficha técnica del detalle de producto.",
    siFalta: "Ese campo simplemente no aparece en la ficha técnica.",
  },
  {
    columna: "Materiales del interior",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Textil",
    descripcion: "Ficha técnica del detalle de producto.",
    siFalta: "Ese campo simplemente no aparece en la ficha técnica.",
  },
  {
    columna: "Materiales de la suela",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Goma",
    descripcion: "Ficha técnica del detalle de producto.",
    siFalta: "Ese campo simplemente no aparece en la ficha técnica.",
  },
  {
    columna: "Tipo de calzado",
    obligatoria: false,
    tipo: "texto",
    ejemplo: "Bota",
    descripcion: "Ficha técnica del detalle de producto.",
    siFalta: "Ese campo simplemente no aparece en la ficha técnica.",
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
