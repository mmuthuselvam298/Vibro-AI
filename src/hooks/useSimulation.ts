import { useEffect, useRef } from 'react';
import { useEngineStore } from '../store/engineStore';
import { useSignalStore } from '../store/signalStore';

export function useSimulation() {
  const { scenario, isSimulating, tick } = useEngineStore();
  const { generateSignal } = useSignalStore();

  const timeRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const UPDATE_INTERVAL = 50; // ms

  useEffect(() => {
    const animate = (time: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = time;

      const deltaTime = time - lastUpdateRef.current;

      if (deltaTime > UPDATE_INTERVAL && isSimulating) {
        timeRef.current += (deltaTime / 1000); // convert to seconds

        generateSignal(scenario, timeRef.current);
        tick();

        lastUpdateRef.current = time;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    if (isSimulating) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isSimulating, scenario, generateSignal, tick]);
}
