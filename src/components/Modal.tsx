'use client';
import { useEffect,useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,onClose,children,className=''}:{title:string;onClose:()=>void;children:React.ReactNode;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(d&&!d.open)d.showModal();return ()=>{if(d?.open)d.close();};},[]);
 return <dialog ref={ref} className={`modal ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><button className="modal-close icon-button" onClick={onClose} aria-label="Tutup"><X size={19}/></button>{children}</dialog>;
}
