"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMPRADOR_VACIO, type DatosComprador, type ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";

const CLAVE_CARRITO = "mesvol-carrito-v1";
const CLAVE_COMPRADOR = "mesvol-comprador-v1";

interface CarritoContextValor {
  items: ItemCarrito[];
  comprador: DatosComprador;
  abierto: boolean;
  agregarItem: (item: Omit<ItemCarrito, "cantidad">, cantidad: number) => void;
  actualizarCantidad: (productoId: string, cantidad: number) => void;
  quitarItem: (productoId: string) => void;
  vaciar: () => void;
  setComprador: (comprador: DatosComprador) => void;
  abrir: () => void;
  cerrar: () => void;
}

const CarritoContext = createContext<CarritoContextValor | null>(null);

function leerDeStorage<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = window.localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : porDefecto;
  } catch (err) {
    logError(`CarritoContext.leerDeStorage(${clave})`, err, "No se pudo leer lo guardado en este navegador — se arranca desde cero.");
    return porDefecto;
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  // Arranca vacío en el server y en el primer render del cliente (evita
  // desajustes de hidratación); el contenido real de localStorage se carga
  // recién en el useEffect, que solo corre en el navegador.
  const [hidratado, setHidratado] = useState(false);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [comprador, setCompradorState] = useState<DatosComprador>(COMPRADOR_VACIO);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    // Sincronización deliberada con localStorage (un sistema externo) al
    // montar: arranca en [] tanto en el server como en el primer render del
    // cliente para que la hidratación calce, y recién acá — ya en el
    // navegador — se reemplaza por el contenido guardado. No hay forma de
    // leer localStorage antes de esto sin arriesgar un mismatch de
    // hidratación (SSR no tiene acceso a localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(leerDeStorage(CLAVE_CARRITO, []));
    setCompradorState(leerDeStorage(CLAVE_COMPRADOR, COMPRADOR_VACIO));
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
    } catch (err) {
      logError("CarritoContext (guardar carrito)", err, "No se pudo guardar el pedido en este navegador — si recargás la página podrías perderlo.");
    }
  }, [items, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CLAVE_COMPRADOR, JSON.stringify(comprador));
    } catch (err) {
      logError("CarritoContext (guardar comprador)", err, "No se pudieron guardar los datos del comprador en este navegador.");
    }
  }, [comprador, hidratado]);

  const agregarItem = useCallback((item: Omit<ItemCarrito, "cantidad">, cantidad: number) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.productoId === item.productoId);
      if (existente) {
        return prev.map((i) => (i.productoId === item.productoId ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { ...item, cantidad }];
    });
    setAbierto(true);
  }, []);

  const actualizarCantidad = useCallback((productoId: string, cantidad: number) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((i) => i.productoId !== productoId)
        : prev.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)),
    );
  }, []);

  const quitarItem = useCallback((productoId: string) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);
  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);

  const valor = useMemo<CarritoContextValor>(
    () => ({
      items,
      comprador,
      abierto,
      agregarItem,
      actualizarCantidad,
      quitarItem,
      vaciar,
      setComprador: setCompradorState,
      abrir,
      cerrar,
    }),
    [items, comprador, abierto, agregarItem, actualizarCantidad, quitarItem, vaciar, abrir, cerrar],
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito(): CarritoContextValor {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>.");
  return ctx;
}
