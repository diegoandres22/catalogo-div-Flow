"use client";

import { useState } from "react";
import { CargadorCatalogo } from "./CargadorCatalogo";
import { RevertirRespaldo } from "./RevertirRespaldo";

// "Reemplazar catálogo" y "Revertir al respaldo" escriben el mismo archivo
// (catalogo.json) sin ningún candado del lado del servidor — si se disparan
// al mismo tiempo, gana el que termina de escribir último, no el que el
// admin apretó último, y el toast de éxito de cualquiera de los dos puede
// no reflejar lo que quedó realmente publicado.
//
// Esta pieza comparte un estado entre ambos botones: mientras uno está en
// curso, el otro queda deshabilitado — así ya no se pueden disparar juntos
// desde esta pantalla.
export function PanelAdmin() {
  const [operacionCriticaEnCurso, setOperacionCriticaEnCurso] = useState(false);

  return (
    <>
      <CargadorCatalogo
        bloqueadoPorOtraOperacion={operacionCriticaEnCurso}
        onOperacionCriticaChange={setOperacionCriticaEnCurso}
      />
      <RevertirRespaldo
        bloqueadoPorOtraOperacion={operacionCriticaEnCurso}
        onOperacionCriticaChange={setOperacionCriticaEnCurso}
      />
    </>
  );
}
