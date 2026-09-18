import { createServer } from 'node:http';
import { stat,readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('out');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
 try{const url=new URL(req.url??'/', 'http://localhost');const file=path.resolve(root,`.${decodeURIComponent(url.pathname)}`);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 let target=file;try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':url.pathname.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}
 catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:await readFile(path.join(root,'404.html')).catch(()=>Buffer.from('Not found')));}
 }catch{res.writeHead(400);res.end('Bad request');}
});
server.listen(Number(process.env.PORT??3000),process.env.HOST??'127.0.0.1',()=>console.log(`ARONCANDY production: http://${process.env.HOST??'127.0.0.1'}:${process.env.PORT??3000}`));
