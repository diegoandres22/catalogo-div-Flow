// Lógica de transformación: filas crudas del export de SAP (hoja "OITM") ->
// catálogo agrupado.
//
// El archivo de origen trae UNA fila por Modelo+Color+Rango de tallas
// ("Serie"), no una fila por talla individual. La cantidad de pares de cada
// talla dentro de ese rango viene codificada en "Curva" (ej. Serie "35-40" +
// Curva "1-2-3-3-2-1" = talla 35 trae 1 par por bulto, 36 trae 2, ... 40
// trae 1 — 12 pares en total). Este módulo agrupa en TRES niveles, no uno
// solo:
//  1) valida columnas obligatorias y datos por fila,
//  2) expande Serie+Curva en tallas individuales (calzado) o usa una talla
//     única "Único" para productos sin curva (accesorios), calculando tanto
//     el stock total ofertado como la porción que ya está físicamente en el
//     almacén (ver "OnHand" más abajo),
//  3) agrupa filas por (Modelo + Color + Serie) en "curvas" — un mismo
//     modelo+color puede traer más de un rango de tallas (ej. "33-38" y
//     "39-44"), y cada uno es un bulto comprable aparte, no se fusionan,
//  4) agrupa esas curvas por (Modelo + Color) en "colores",
//  5) agrupa esos colores por Modelo en el "producto" final del catálogo —
//     un mismo modelo en dos colores ya no aparece como dos tarjetas
//     duplicadas,
//  6) deja fuera del catálogo (con motivo) los colores que no cumplen el
//     mínimo de datos (p. ej. sin ninguna foto real), sin abortar el resto
//     del import; si un modelo se queda sin ningún color válido, desaparece
//     solo (nunca llega a construirse).

import type { Catalogo, Curva, ErrorImportacion, Producto, ResumenImportacion, TallaVariante, VarianteColor } from "./types";

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
  codigoModelo: string;
  modelo: string;
  marca: string;
  genero: string;
  color: string;
  rubro: string;
  linea: string;
  serie: string; // "" en no-calzado — identifica la curva dentro de modelo+color
  promocion: boolean;
  precio: number;
  fotos: string[];
  tallas: TallaVariante[];
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
 * dentro de ese rango, ej. "1-2-3-3-2-1") en tallas individuales, repartiendo
 * tanto el stock total ofertado ("Disponible a Ofertar") como el stock ya
 * físico en almacén ("OnHand") en la misma proporción de la curva.
 * Devuelve null si el rango y la curva no calzan (misma cantidad de tallas
 * que de números en la curva) — se trata como dato inconsistente.
 */
function expandirCurva(serie: string, curva: string, disponibleTotal: number, onHandTotal: number): TallaVariante[] | null {
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

  // El stock se reparte entre tallas según la proporción de la curva — es
  // una estimación (el SAP no trae stock por talla individual), pero es más
  // informativa que asumir "todas disponibles por igual" cuando el stock ya
  // empezó a bajar. disponibleFisico nunca supera a disponible (el físico no
  // puede ser mayor que lo ofertado, aunque el dato crudo lo sugiera).
  return tallasNums.map((talla, i) => {
    const disponible = Math.floor((disponibleTotal * partes[i]) / sumaCurva);
    const disponibleFisico = Math.min(disponible, Math.floor((onHandTotal * partes[i]) / sumaCurva));
    return { talla: String(talla), porBulto: partes[i], disponible, disponibleFisico };
  });
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

    // "OnHand": stock físico ya en almacén (columna opcional). Si la columna
    // no viene en el archivo (import previo a este campo, o plantilla
    // vieja), no hay forma de distinguir físico de en tránsito — se asume
    // que todo lo ofertado ya está físico, igual que el comportamiento antes
    // de este campo. Si la columna SÍ viene pero la celda de esta fila está
    // vacía, se asume 0 físico (mismo criterio que "Disponible a Ofertar").
    const onHandPresente = "OnHand" in fila;
    const onHandRaw = aNumero(fila["OnHand"]);
    const onHandTotal = onHandPresente
      ? onHandRaw !== null && onHandRaw > 0
        ? Math.floor(onHandRaw)
        : 0
      : disponibleTotal;

    let tallas: TallaVariante[];
    let serieNormalizada = "";

    if (esCalzado(rubro)) {
      const serie = textoLimpio(fila["U_PX_Serie"]);
      const curva = textoLimpio(fila["U_PX_Curva"]);
      if (!serie || !curva) {
        errores.push({ fila: filaIndice, modelo, color, motivo: "Calzado sin 'U_PX_Serie'/'U_PX_Curva' (rango y curva de tallas)" });
        return;
      }
      const expandidas = expandirCurva(serie, curva, disponibleTotal, onHandTotal);
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
      serieNormalizada = serie;
    } else {
      // Accesorios y demás rubros sin curva de tallas: una única variante,
      // se venden por unidad.
      tallas = [{ talla: "Único", disponible: disponibleTotal, disponibleFisico: Math.min(disponibleTotal, onHandTotal) }];
    }

    const fotosDeChasea = separarUrls(fila["U_LinkImagenChasea"]);
    const fotos = fotosDeChasea.length > 0 ? fotosDeChasea : separarUrls(fila["Foto"]);

    validas.push({
      filaIndice,
      itemCode,
      codigoModelo: textoLimpio(fila["#Modelo"]),
      modelo,
      marca: textoLimpio(fila["U_PX_Marca"]),
      genero: textoLimpio(fila["U_PX_Genero"]),
      color,
      rubro,
      linea: textoLimpio(fila["U_PX_Linea"]),
      serie: serieNormalizada,
      promocion: aBooleanoSN(fila["U_Promocion"]),
      precio,
      fotos,
      tallas,
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

/**
 * Combina las filas de UNA MISMA curva (mismo modelo+color+serie) en su
 * lista final de tallas. Normalmente es una sola fila (el SAP trae una fila
 * por curva), pero si el archivo trae dos filas idénticas en esa curva
 * (duplicado real de datos), se combinan quedándose con la variante más
 * informativa por talla (mayor disponibilidad) en vez de sumarlas o
 * descartar una arbitrariamente.
 */
function tallasDelGrupo(filas: FilaValidada[]): TallaVariante[] {
  const porTalla = new Map<string, TallaVariante>();
  for (const f of filas) {
    for (const t of f.tallas) {
      const actual = porTalla.get(t.talla);
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

  // Nivel 1 — modelo+color+serie: cada fila validada YA es una curva (una
  // fila del SAP = un rango de tallas de un color). Se agrupa igual por si
  // el archivo trae dos filas para exactamente el mismo rango (duplicado de
  // datos) — en ese caso se combinan con tallasDelGrupo en vez de crear dos
  // curvas idénticas.
  const gruposCurva = new Map<string, FilaValidada[]>();
  for (const f of validas) {
    const clave = `${f.modelo} ${f.color} ${f.serie}`;
    const arr = gruposCurva.get(clave);
    if (arr) arr.push(f);
    else gruposCurva.set(clave, [f]);
  }

  interface CurvaConstruida {
    modelo: string;
    color: string;
    curva: Curva;
    filas: FilaValidada[];
  }

  const curvasConstruidas: CurvaConstruida[] = [];
  for (const [, filasCurva] of gruposCurva) {
    const { modelo, color, rubro, serie } = filasCurva[0];
    const tallas = tallasDelGrupo(filasCurva);
    const cantidadPorBulto = esCalzado(rubro) ? tallas.reduce((acc, t) => acc + (t.porBulto ?? 0), 0) : 1;

    curvasConstruidas.push({
      modelo,
      color,
      filas: filasCurva,
      curva: {
        id: slugify(serie) || "unico",
        rango: esCalzado(rubro) ? serie : "Único",
        codigoSap: filasCurva[0].itemCode,
        cantidadPorBulto,
        tallas,
      },
    });
  }

  // Nivel 2 — modelo+color: junta todas las curvas de un mismo color. Si el
  // color se queda sin ninguna foto real entre todas sus curvas, se excluye
  // acá (no todo el modelo — otro color del mismo modelo puede sí tener
  // foto y seguir viéndose en el catálogo).
  const gruposColor = new Map<string, CurvaConstruida[]>();
  for (const c of curvasConstruidas) {
    const clave = `${c.modelo} ${c.color}`;
    const arr = gruposColor.get(clave);
    if (arr) arr.push(c);
    else gruposColor.set(clave, [c]);
  }

  interface ColorConstruido {
    modelo: string;
    variante: VarianteColor;
    filas: FilaValidada[];
  }

  const coloresConstruidos: ColorConstruido[] = [];
  for (const [, gruposDeColor] of gruposColor) {
    const { modelo, color } = gruposDeColor[0];
    const filasColor = gruposDeColor.flatMap((g) => g.filas);
    const fotos = dedupPreservandoOrden(filasColor.flatMap((f) => f.fotos));

    if (fotos.length === 0) {
      errores.push({
        fila: null,
        modelo,
        color,
        motivo: "Color sin foto (Status Imagen distinto de 'Con Foto') — excluido del catálogo",
      });
      continue;
    }

    // Curvas ordenadas por inicio de rango (35-40 antes que 41-44); "Único"
    // (accesorios) no necesita orden, siempre es una sola.
    const curvas = gruposDeColor
      .map((g) => g.curva)
      .sort((a, b) => {
        const na = Number(a.rango.split("-")[0]);
        const nb = Number(b.rango.split("-")[0]);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.rango.localeCompare(b.rango, "es");
      });

    coloresConstruidos.push({
      modelo,
      filas: filasColor,
      variante: {
        color,
        precio: precioDelGrupo(filasColor),
        promocion: filasColor.some((f) => f.promocion),
        fotos,
        curvas,
      },
    });
  }

  // Nivel 3 — modelo: un producto del catálogo por modelo, con todos sus
  // colores adentro (ya no una tarjeta duplicada por cada color).
  const gruposModelo = new Map<string, ColorConstruido[]>();
  for (const c of coloresConstruidos) {
    const arr = gruposModelo.get(c.modelo);
    if (arr) arr.push(c);
    else gruposModelo.set(c.modelo, [c]);
  }

  const generarId = idsUnicos();
  const productos: Producto[] = [];

  for (const [modelo, gruposDeModelo] of gruposModelo) {
    const filasModelo = gruposDeModelo.flatMap((g) => g.filas);
    const primeraConMarca = filasModelo.find((f) => f.marca) ?? filasModelo[0];
    const primeraConGenero = filasModelo.find((f) => f.genero) ?? filasModelo[0];
    const primeraConLinea = filasModelo.find((f) => f.linea) ?? filasModelo[0];
    const primeraConCodigoModelo = filasModelo.find((f) => f.codigoModelo) ?? filasModelo[0];

    const colores = gruposDeModelo.map((g) => g.variante).sort((a, b) => a.color.localeCompare(b.color, "es"));

    productos.push({
      id: generarId(slugify(modelo)),
      modelo,
      marca: primeraConMarca.marca,
      genero: primeraConGenero.genero,
      rubro: filasModelo[0].rubro,
      linea: primeraConLinea.linea || undefined,
      codigoModelo: primeraConCodigoModelo.codigoModelo || undefined,
      colores,
    });
  }

  const totalVariantes = productos.reduce(
    (acc, p) =>
      acc + p.colores.reduce((acc2, c) => acc2 + c.curvas.reduce((acc3, curva) => acc3 + curva.tallas.length, 0), 0),
    0,
  );

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
