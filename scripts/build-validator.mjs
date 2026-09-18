import { build } from 'esbuild';
await build({entryPoints:['src/game/validator.ts'],outfile:'supabase/functions/_shared/validator.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',minify:false});
console.log('Server replay validator bundled from the same game rules.');
