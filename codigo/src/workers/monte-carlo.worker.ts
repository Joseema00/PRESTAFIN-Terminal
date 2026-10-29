/// <reference lib="webworker" />
/** Ejecuta las simulaciones pesadas fuera del hilo principal. */
import { runMonteCarlo, type MonteCarloInput } from "@/lib/monte-carlo";

self.onmessage = (e: MessageEvent<{ id: number; input: MonteCarloInput }>) => {
  const { id, input } = e.data;
  try {
    const result = runMonteCarlo(input);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : "Error en la simulación",
    });
  }
};
