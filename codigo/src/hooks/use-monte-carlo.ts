import { useEffect, useMemo, useRef, useState } from "react";
import { runMonteCarlo, type MonteCarloInput, type MonteCarloOutcome } from "@/lib/monte-carlo";

/**
 * Ejecuta Monte Carlo en un Web Worker cuando la simulación es pesada, para no
 * bloquear el navegador. Si el worker no está disponible, cae al hilo principal.
 */
export function useMonteCarlo(input: MonteCarloInput | null) {
  const [result, setResult] = useState<MonteCarloOutcome | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const key = useMemo(() => (input ? JSON.stringify(input) : ""), [input]);

  useEffect(() => {
    if (!input) {
      setResult(null);
      return;
    }
    const id = ++reqId.current;
    setIsRunning(true);
    setError(null);

    const heavy = input.sims > 8000;
    if (!heavy || typeof Worker === "undefined") {
      // Simulación ligera: hilo principal, respuesta inmediata.
      try {
        const r = runMonteCarlo(input);
        if (reqId.current === id) setResult(r);
      } catch (e) {
        if (reqId.current === id) setError(e instanceof Error ? e.message : "Error en la simulación");
      }
      setIsRunning(false);
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("../workers/monte-carlo.worker.ts", import.meta.url), {
        type: "module",
      });
    }
    const worker = workerRef.current;
    const onMessage = (e: MessageEvent<{ id: number; result?: MonteCarloOutcome; error?: string }>) => {
      if (e.data.id !== id) return;
      if (e.data.error) setError(e.data.error);
      else if (e.data.result) setResult(e.data.result);
      setIsRunning(false);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, input });
    return () => worker.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  return { result, isRunning, error };
}
