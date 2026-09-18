import { candyAsset,CANDIES } from '@/config/candies';
import type { Candy } from '@/types/Candy';
import { PackageCheck } from 'lucide-react';
export default function CandyVisual({candy}:{candy:Candy}){
 if(candy.item)return <span className="drop-item"><PackageCheck/><i>★</i></span>;
 const special=candy.special;
 return <span className={`candy-visual ${special??''}`}><img draggable={false} src={special==='bomb'?'/assets/optimized/special/color-bomb.webp':candyAsset(candy.color)} onError={e=>{const fallback=special==='bomb'?'/assets/special/color-bomb.png':`/assets/candies/${CANDIES[candy.color].file}.png`;if(e.currentTarget.getAttribute('src')!==fallback)e.currentTarget.src=fallback;}} alt=""/>{special&&special!=='bomb'&&<img className="special-token" src={`/assets/optimized/special/${special==='wrapped'?'wrapped':'striped'}.webp`} alt=""/>}{special&&special!=='bomb'&&<span className="special-badge">{special==='wrapped'?'✦':special==='striped-h'?'↔':'↕'}</span>}</span>;
}
