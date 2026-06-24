import { useEffect, useRef } from 'react';

type PollingTaskOptions = {
  enabled?: boolean;
  immediate?: boolean;
  intervalMs: number;
  onError?: (error: unknown) => void;
  runWhenHidden?: boolean;
};

export function usePollingTask(
  task: () => Promise<void> | void,
  {
    enabled = true,
    immediate = false,
    intervalMs,
    onError,
    runWhenHidden = false,
  }: PollingTaskOptions,
) {
  const taskRef = useRef(task);
  const errorRef = useRef(onError);

  taskRef.current = task;
  errorRef.current = onError;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let running = false;

    const execute = async () => {
      if (cancelled || running || (!runWhenHidden && document.hidden)) return;

      running = true;
      try {
        await taskRef.current();
      } catch (error) {
        if (!cancelled) errorRef.current?.(error);
      } finally {
        running = false;
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) void execute();
    };

    if (immediate) void execute();

    const timer = window.setInterval(() => {
      void execute();
    }, intervalMs);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, immediate, intervalMs, runWhenHidden]);
}
