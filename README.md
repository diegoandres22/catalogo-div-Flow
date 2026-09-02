# Catálogo Mayorista

Catálogo digital de solo lectura para venta al mayor (calzado). Un administrador
carga el export de SAP (CSV/XLSX) o un link de Google Sheets desde `/admin`; el
resto de la app (`/`) es un catálogo público, sin login, para compartir por
WhatsApp con clientes mayoristas.

No hay base de datos: todo el catálogo vive como JSON en **Vercel Blob**.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- `papaparse` (CSV), `xlsx`/SheetJS (Excel)
- `@vercel/blob` como único almacenamiento

## Requisitos previos

- Node.js 20+
- Una cuenta de Vercel con el proyecto importado (para Blob y el deploy)

## 1) Instalación local

```bash
npm install
cp .env.example .env.local
```

Editá `.env.local`:

```
ADMIN_PASSWORD=elegí-una-contraseña
```

`BLOB_READ_WRITE_TOKEN` no hace falta en local si solo querés ver el catálogo
público (se muestra el estado "todavía no hay catálogo publicado" sin token).
Para probar la carga real desde `/admin` en local, copiá el token del store de
Blob desde el dashboard de Vercel (Storage → tu store → `.env.local` tab) y
pegalo en `BLOB_READ_WRITE_TOKEN`.

```bash
npm run dev
```

- Catálogo público: http://localhost:3000
- Panel admin: http://localhost:3000/admin

## 2) Deploy en Vercel

1. Importá el repositorio en Vercel (New Project).
2. Antes del primer deploy o después, andá a **Storage → Create Database →
   Blob** y conectalo al proyecto. Vercel agrega `BLOB_READ_WRITE_TOKEN`
   automáticamente a las variables de entorno del proyecto.
3. En **Settings → Environment Variables**, agregá `ADMIN_PASSWORD` con la
   contraseña que va a usar el administrador.
4. Deploy.

El link público del catálogo es la URL raíz del proyecto (`/`). El panel de
carga está en `/admin`.

## Cómo cargar el catálogo

1. Entrar a `/admin` con la contraseña.
2. Elegir el origen: archivo Excel, archivo CSV, o pegar el link de un Google
   Sheets publicado como CSV (Archivo → Compartir → Publicar en la web →
   formato CSV).
3. "Analizar archivo": el sistema parsea, agrupa por `Nombre modelo` + `Color`
   y muestra un resumen (productos, variantes talla/color, filas con error)
   **sin tocar todavía el catálogo publicado**.
4. Revisar el resumen y, si está bien, "Reemplazar catálogo". Recién ahí se
   sobrescribe `catalogo.json` en Blob (guardando antes la versión anterior
   como respaldo).
5. Si algo salió mal después de confirmar, en `/admin` hay un botón "Revertir
   al respaldo anterior" que restaura la versión previa.

Columnas obligatorias del archivo origen: `Nombre modelo`, `Color`, `Talla`,
`Price`, `BcdCode`. Si faltan, o si el archivo no tiene ninguna fila válida,
el sistema rechaza el reemplazo completo y no toca el catálogo en producción.

Un producto (agrupación modelo+color) sin ninguna foto real después de
filtrar las imágenes de guía de tallas queda **excluido** del catálogo y
aparece listado en "Filas con error" — el resto del archivo se importa igual.
Con el archivo de muestra real que se usó para probar esto (13.811 filas),
348 de 1.978 productos quedaron afuera por esta razón — es una limitación de
los datos de origen (fotos faltantes en el SAP), no del importador.

## Notas de implementación importantes

- **`cantidadPorBulto` está hardcodeado en `12`** para todos los productos
  (marcado con `// TODO` en `src/lib/transform.ts`) hasta que se defina la
  columna real del SAP. Cuando esa columna exista, es un cambio de una línea
  ahí.
- **Precio por producto:** si las filas de un mismo modelo+color traen precios
  distintos entre tallas (pasa en los datos reales de origen), se usa el precio
  más frecuente del grupo. Vale la pena revisar esos casos del lado del SAP si
  aparecen seguido.
- **`BcdCode` no siempre es único** en los datos reales (colisiones entre
  productos distintos). Se usa igual como identificador de la talla porque es
  lo que trae el SAP, pero el id de cada producto en la URL (`/producto/[id]`)
  se genera a partir de modelo+color, no de `BcdCode`.
- Tamaño de archivo: las funciones de Vercel aceptan ~4.5 MB de cuerpo por
  request. El archivo de prueba real (13.811 filas) pesa 2.4 MB — hay margen,
  pero si el catálogo crece mucho más puede hacer falta subir el límite en la
  configuración de la función de `/api/admin/upload`.

## Estructura

```
src/
  app/
    page.tsx                 catálogo público ("/")
    producto/[id]/page.tsx    detalle de producto
    admin/                    panel de administración (protegido)
    api/admin/                login, logout, upload, confirm, revert
  components/
    catalogo/                 grid, tarjetas, filtros, estados vacíos/skeleton
    detalle/                  carrusel, selector de talla
    admin/                    cargador de archivo, resumen previo, revertir
  lib/
    transform.ts               lógica de transformación SAP -> catálogo
    parseOrigen.ts             parsing de CSV / XLSX / link de Sheets
    blob.ts                    lectura/escritura en Vercel Blob
    auth.ts                    sesión de admin (cookie firmada)
  proxy.ts                     protege /admin y /api/admin (antes "middleware")
```
