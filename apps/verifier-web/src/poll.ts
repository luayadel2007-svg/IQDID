import { createContext, useContext } from 'react';

/** Polling interval (ms) for cross-app updates; tests inject a short value. */
export const PollContext = createContext(1500);
export const usePollMs = (): number => useContext(PollContext);
