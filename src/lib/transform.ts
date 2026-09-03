// Lógica de transformación: filas crudas del export de SAP (hoja "OITM") ->
// catálogo agrupado.
//
// El archivo de origen trae UNA fila por Modelo+Color+Rango de tallas
// ("Serie"), no una fila por talla individual. La cantidad de pares de cada
// talla dentro de ese rango viene codificada en "Curva" (ej. Serie "35-40" +
// Curva "1-2-3-3-2-1" = talla 35 trae 1 par por bulto, 36 trae 2, ... 40
// trae 1 — 12 pares en total). Este módulo:
//  1) valida columnas obligatorias y datos por fila,
//  2) expande Serie+Curva en tallas individuales (calzado) o usa una talla
//     única "Único" para productos sin curva (accesorios),
//  3) agrupa filas por (Modelo + Color) en "productos" de catálogo,
//  4) deja fuera del catálogo (con motivo) los productos que no cumplen el
//     mínimo de datos (p. ej. sin ninguna foto real), sin abortar el resto
//     del import.

import type { Catalogo, ErrorImportacion, Producto, ResumenImportacion, TallaVariante } from "./types";

export const COLUMNAS_OBLIGATORIAS = [
  "ItemCode",
  "U_PX_Modelo",
  "U_PX_Color",
  "U_PX_Marca",
  "U_PX_Rubro",
  "PV Fabrica",
] as const;

export type FilaOrigen = Record<string, unknown>;

interface FilaValidada {
  filaIndice: number; // número de fila "humano" (encabezado = fila 1, primera fila de datos = fila 2)
  itemCode: string;
  modelo: string;
  marca: string;
  genero: string;
  color: string;
  rubro: string;
  linea: string;
  promocion: boolean;
  precio: number;
  fotos: string[];
  tallas: TallaVariante[];
  cantidadPorBulto: number;
}

function textoLimpio(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const t = String(valor).trim();
  if (!t || t.toUpperCase() === "N/A") return "";
  return t;
}

/**
 * Separa una celda de foto que puede traer varias URLs pegadas en un mismo
 * campo, separadas por comas (ej. "url1, url2, url3") — así el producto
 * arma el carrusel con las fotos reales en vez de tratar el campo entero
 * como una única URL inválida. Sigue funcionando igual que antes para el
 * caso normal de una sola URL por celda.
 */
function separarUrls(valor: unknown): string[] {
  const texto = textoLimpio(valor);
  if (!texto) return [];
  return Array.from(new Set(texto.split(",").map((u) => u.trim()).filter(Boolean)));
}

function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

// Acepta undefined/null a propósito: el catálogo publicado puede tener
// productos de una importación previa a este campo (o cualquier dato
// incompleto por otra vía) — sin este resguardo, /producto/[id] tiraba
// "Cannot read properties of undefined (reading 'trim')" y rompía la
// página entera de ese producto en vez de mostrarlo como "venta por unidad".
export function esCalzado(rubro: string | null | undefined): boolean {
  return (rubro ?? "").trim().toUpperCase() === "CALZADO";
}

/** "S" / "SI" / "SÍ" -> true. Cualquier otra cosa (incluido vacío o "N") -> false. */
function aBooleanoSN(valor: unknown): boolean {
  const t = textoLimpio(valor).toUpperCase();
  return t === "S" || t === "SI" || t === "SÍ";
}

/**
 * Expande "Serie" (rango de tallas, ej. "35-40") + "Curva" (pares por talla
 * dentro de ese rango, ej. "1-2-3-3-2-1") en tallas individuales.
 * Devuelve null si el rango y la curva no calzan (misma cantidad de tallas
 * que de números en la curva) — se trata como dato inconsistente.
 */
function expandirCurva(serie: string, curva: string, disponibleTotal: number): TallaVariante[] | null {
  const match = serie.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;
  const desde = Number(match[1]);
  const hasta = Number(match[2]);
  if (!Number.isFinite(desde) || !Number.isFinite(hasta) || hasta < desde) return null;

  const partes = curva
    .split("-")
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n));

  const tallasNums: number[] = [];
  for (let t = desde; t <= hasta; t += 1) tallasNums.push(t);

  if (partes.length !== tallasNums.length || partes.length === 0) return null;

  const sumaCurva = partes.reduce((acc, n) => acc + n, 0);
  if (sumaCurva <= 0) return null;

  // El stock disponible total del producto se reparte entre tallas según la
  // proporción de la curva — es una estimación (el SAP no trae stock por
  // talla individual), pero es más informativa que asumir "todas
  // disponibles por igual" cuando el stock ya empezó a bajar.
  return tallasNums.map((talla, i) => ({
    talla: String(talla),
    porBulto: partes[i],
    disponible: Math.floor((disponibleTotal * partes[i]) / sumaCurva),
  }));
}

/** Valida columnas obligatorias contra el encabezado detectado. */
export function validarColumnas(encabezados: string[]): string[] {
  const set = new Set(encabezados.map((h) => h.trim()));
  return COLUMNAS_OBLIGATORIAS.filter((col) => !set.has(col));
}

/** Valida y normaliza cada fila cruda. Filas inválidas se devuelven aparte con su motivo. */
function validarFilas(filas: FilaOrigen[]): { validas: FilaValidada[]; errores: ErrorImportacion[] } {
  const validas: FilaValidada[] = [];
  const errores: ErrorImportacion[] = [];

  filas.forEach((fila, i) => {
    const filaIndice = i + 2; // +1 por encabezado, +1 por índice base 1
    const itemCode = textoLimpio(fila["ItemCode"]);
    const modelo = textoLimpio(fila["U_PX_Modelo"]);
    const color = textoLimpio(fila["U_PX_Color"]);
    const rubro = textoLimpio(fila["U_PX_Rubro"]);
    const precio = aNumero(fila["PV Fabrica"]);

    if (!itemCode) {
      errores.push({ fila: filaIndice, motivo: "Falta 'ItemCode'" });
      return;
    }
    if (!modelo) {
      errores.push({ fila: filaIndice, motivo: "Falta 'U_PX_Modelo'" });
      return;
    }
    if (!color) {
      errores.push({ fila: filaIndice, modelo, motivo: "Falta 'U_PX_Color'" });
      return;
    }
    if (!rubro) {
      // Filas de relleno/vacías del export de SAP (celdas en blanco al final
      // de la hoja) — se descartan en silencio, no son un error del usuario.
      return;
    }
    if (precio === null || precio < 0) {
      errores.push({ fila: filaIndice, modelo, color, motivo: "Falta 'PV Fabrica' (precio) o no es numérico" });
      return;
    }

    const disponibleRaw = aNumero(fila["Disponible a Ofertar"]);
    const disponibleTotal = disponibleRaw !== null && disponibleRaw > 0 ? Math.floor(disponibleRaw) : 0;

    let tallas: TallaVariante[];
    let cantidadPorBulto: number;

    if (esCalzado(rubro)) {
      const serie = textoLimpio(fila["U_PX_Serie"]);
      const curva = textoLimpio(fila["U_PX_Curva"]);
      if (!serie || !curva) {
        errores.push({ fila: filaIndice, modelo, color, motivo: "Calzado sin 'U_PX_Serie'/'U_PX_Curva' (rango y curva de tallas)" });
        return;
      }
      const expandidas = expandirCurva(serie, curva, disponibleTotal);
      if (!expandidas) {
        errores.push({
          fila: filaIndice,
          modelo,
          color,
          motivo: `Curva de tallas inconsistente con el rango ('Serie'=${serie}, 'Curva'=${curva})`,
        });
        return;
      }
      tallas = expandidas;
      cantidadPorBulto = expandidas.reduce((acc, t) => acc + (t.porBulto ?? 0), 0);
    } else {
      // Accesorios y demás rubros sin curva de tallas: una única variante,
      // se venden por unidad.
      tallas = [{ talla: "Único", disponible: disponibleTotal }];
      cantidadPorBulto = 1;
    }

    const fotosDeChasea = separarUrls(fila["U_LinkImagenChasea"]);
    const fotos = fotosDeChasea.length > 0 ? fotosDeChasea : separarUrls(fila["Foto"]);

    validas.push({
      filaIndice,
      itemCode,
      modelo,
      marca: textoLimpio(fila["U_PX_Marca"]),
      genero: textoLimpio(fila["U_PX_Genero"]),
      color,
      rubro,
      linea: textoLimpio(fila["U_PX_Linea"]),
      promocion: aBooleanoSN(fila["U_Promocion"]),
      precio,
      fotos,
      tallas,
      cantidadPorBulto,
    });
  });

  return { validas, errores };
}

/** Precio "representativo" del grupo: el más frecuente; en empate, el menor. */
function precioDelGrupo(filas: FilaValidada[]): number {
  const conteo = new Map<number, number>();
  for (const f of filas) conteo.set(f.precio, (conteo.get(f.precio) ?? 0) + 1);
  let mejor = filas[0].precio;
  let mejorConteo = 0;
  for (const [precio, veces] of conteo) {
    if (veces > mejorConteo || (veces === mejorConteo && precio < mejor)) {
      mejor = precio;
      mejorConteo = veces;
    }
  }
  return mejor;
}

function tallasDelGrupo(filas: FilaValidada[]): TallaVariante[] {
  const porTalla = new Map<string, TallaVariante>();
  for (const f of filas) {
    for (const t of f.tallas) {
      const actual = porTalla.get(t.talla);
      // Si la talla se repite (el mismo modelo+color trae más de un rango
      // que se solapa), nos quedamos con la variante más informativa para
      // el mayorista: mayor disponibilidad.
      if (!actual || t.disponible > actual.disponible) {
        porTalla.set(t.talla, t);
      }
    }
  }
  return Array.from(porTalla.values()).sort((a, b) => {
    const na = Number(a.talla);
    const nb = Number(b.talla);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.talla.localeCompare(b.talla);
  });
}

function idsUnicos() {
  const usados = new Set<string>();
  return (base: string) => {
    let id = base || "producto";
    let n = 2;
    while (usados.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    usados.add(id);
    return id;
  };
}

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos (tildes) tras normalizar
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function dedupPreservandoOrden(items: string[]): string[] {
  return Array.from(new Set(items));
}

export interface ResultadoTransformacion {
  catalogo: Catalogo | null;
  resumen: ResumenImportacion;
}

export function transformarFilas(filas: FilaOrigen[], totalFilasOrigen: number): ResultadoTransformacion {
  const { validas, errores } = validarFilas(filas);

  const grupos = new Map<string, FilaValidada[]>();
  for (const f of validas) {
    const clave = `${f.modelo} ${f.color}`;
    const arr = grupos.get(clave);
    if (arr) arr.push(f);
    else grupos.set(clave, [f]);
  }

  const generarId = idsUnicos();
  const productos: Producto[] = [];

  for (const [, filasGrupo] of grupos) {
    const { modelo, color } = filasGrupo[0];
    const fotos = dedupPreservandoOrden(filasGrupo.flatMap((f) => f.fotos));

    if (fotos.length === 0) {
      errores.push({
        fila: null,
        modelo,
        color,
        motivo: "Producto sin foto (Status Imagen distinto de 'Con Foto') — excluido del catálogo",
      });
      continue;
    }

    const primeraConMarca = filasGrupo.find((f) => f.marca) ?? filasGrupo[0];
    const primeraConGenero = filasGrupo.find((f) => f.genero) ?? filasGrupo[0];
    const primeraConLinea = filasGrupo.find((f) => f.linea) ?? filasGrupo[0];

    productos.push({
      id: generarId(slugify(`${modelo}-${color}`)),
      modelo,
      marca: primeraConMarca.marca,
      genero: primeraConGenero.genero,
      color,
      rubro: filasGrupo[0].rubro,
      linea: primeraConLinea.linea || undefined,
      precio: precioDelGrupo(filasGrupo),
      promocion: filasGrupo.some((f) => f.promocion),
      codigoSap: filasGrupo[0].itemCode,
      cantidadPorBulto: filasGrupo[0].cantidadPorBulto,
      fotos,
      guiaTallas: [],
      tallas: tallasDelGrupo(filasGrupo),
    });
  }

  const totalVariantes = productos.reduce((acc, p) => acc + p.tallas.length, 0);

  const resumen: ResumenImportacion = {
    ok: productos.length > 0,
    totalFilasOrigen,
    totalProductos: productos.length,
    totalVariantes,
    errores,
    mensaje: productos.length === 0 ? "No se encontró ningún producto válido en el archivo." : undefined,
  };

  if (productos.length === 0) {
    return { catalogo: null, resumen };
  }

  const catalogo: Catalogo = {
    productos,
    generadoEn: new Date().toISOString(),
    totalProductos: productos.length,
    totalVariantes,
  };

  return { catalogo, resumen };
}
