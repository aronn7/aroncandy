import { RotateCcw,Map,Heart } from 'lucide-react';
import type { Objective as ObjectiveType } from '@/game/ObjectiveSystem';
import Objective from './Objective';
export default function LoseModal({objectives,onRetry,onMap}:{objectives:ObjectiveType[];onRetry:()=>void;onMap:()=>void}){return <><Heart className="result-heart"/><span className="eyebrow">SO CLOSE, SWEET EXPLORER</span><h2>Sedikit lagi!</h2><p>Langkah habis. Coba strategi baru,<br/>keajaiban berikutnya sudah dekat.</p><Objective objectives={objectives}/><div className="modal-actions"><button className="primary" onClick={onRetry}><RotateCcw size={18}/>Coba lagi</button><button className="text-button" onClick={onMap}><Map size={18}/>Kembali ke map</button></div></>;}
