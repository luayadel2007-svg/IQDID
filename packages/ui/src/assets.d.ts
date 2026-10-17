// Vite resolves `?url` imports of the brand SVGs to a served asset URL (or an inline data URL when small).
declare module '*.svg?url' {
  const src: string;
  export default src;
}
