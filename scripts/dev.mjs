// npm run dev       → demo API + both apps (Vite dev servers)
// npm run preview   → demo API + both production builds (run `npm run build` first)
import { startStack } from './stack.mjs';

const preview = process.argv.includes('--preview');
const stack = startStack({ preview });
const stop = () => { stack.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await stack.ready();
console.log('\nIQDID demo (TEST ONLY — synthetic data) is running:');
console.log(`  Wallet   (citizen)  ${stack.urls.wallet}`);
console.log(`  Verifier (staff)    ${stack.urls.verifier}`);
console.log(`  Demo API            ${stack.urls.api}/demo-api/v1/health`);
console.log('Press Ctrl+C to stop.\n');
