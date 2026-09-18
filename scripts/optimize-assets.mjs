import sharp from 'sharp';
import { readdir, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
for (const group of ['candies','special','blockers','icons']) {
 const dir=path.join('public/assets',group), out=path.join('public/assets/optimized',group);
 await mkdir(out,{recursive:true});
 for(const file of await readdir(dir)) if(file.endsWith('.png')) {
  await sharp(path.join(dir,file)).trim({threshold:12}).resize(group==='icons'?640:160,group==='icons'?640:160,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:85}).toFile(path.join(out,file.replace('.png','.webp')));
 }
}
await mkdir('public/assets/logo',{recursive:true});
await copyFile('public/assets/icons/icon.png','public/assets/logo/aroncandy-logo.png');
console.log('Optimized original assets; originals preserved.');
