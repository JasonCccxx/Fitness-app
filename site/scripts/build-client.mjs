import { build } from 'esbuild';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await build({entryPoints:[resolve(root,'client/atlas-api.js')],outfile:resolve(root,'dist/atlas-api.js'),bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,legalComments:'eof'});
console.log('Bundled official Supabase client and application API.');
