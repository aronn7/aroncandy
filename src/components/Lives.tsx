import { Heart } from 'lucide-react';
export default function Lives({lives,onClick}:{lives:number;onClick:()=>void}){return <button className="wallet-pill" onClick={onClick} aria-label={`${lives} nyawa. Lihat isi ulang.`}><Heart fill="#f56d9b"/> {lives} <small>{lives===5?'FULL':'+30m'}</small></button>;}
