import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect on the client (runs before paint, so DOM reconciliation is
// invisible), useEffect on the server (avoids React's SSR warning). Use for
// pre-paint work like reconciling a layout from localStorage.
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
