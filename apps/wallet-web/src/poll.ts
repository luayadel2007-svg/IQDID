import { createContext, useContext } from 'react';

/** Polling interval (ms) for cross-app updates; tests inject a short value. */
export const PollContext = createContext(2000);
export const usePollMs = (): number => useContext(PollContext);
