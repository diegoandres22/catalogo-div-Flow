// Logos de marca del Footer (public/marcas/*.png) — un solo lugar para esta
// lista: la usa Footer.tsx para pintarlos y api/descarga/manifiesto/route.ts
// para incluirlos en toda descarga offline (ver la nota en sw.js sobre
// esLogoDeMarca). Sin este archivo compartido, agregar o sacar un logo del
// footer sin acordarse de actualizar el manifiesto los dejaría rotos sin
// conexión.
export interface LogoFooter {
  nombre: string;
  src: string;
  ancho: number;
  alto: number;
}

export const LOGOS_FOOTER: LogoFooter[] = [
  { nombre: "Volpe", src: "/marcas/volpe.png", ancho: 783, alto: 161 },
  { nombre: "Vita Kids", src: "/marcas/vitakids.png", ancho: 976, alto: 346 },
  { nombre: "Kriza", src: "/marcas/kriza.png", ancho: 1001, alto: 275 },
];
