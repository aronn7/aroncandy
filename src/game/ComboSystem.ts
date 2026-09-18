export const comboMultiplier=(chain:number)=>chain===1?1:chain===2?1.5:chain===3?2:3;
export const comboLabel=(chain:number)=>chain===1?'Sweet!':chain===2?'So sweet!':chain===3?'Amazing!':`Fantastic! ×${chain}`;
