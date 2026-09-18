export const CANDIES = [
 {name:'Hati merah',file:'red-heart',color:'#ff5a7d'}, {name:'Bintang biru',file:'blue-star',color:'#47c6fa'},
 {name:'Tetes kuning',file:'yellow-drop',color:'#ffcb43'}, {name:'Kotak hijau',file:'green-square',color:'#77d53d'},
 {name:'Bunga ungu',file:'purple-flower',color:'#c26af1'}, {name:'Lingkaran oranye',file:'orange-circle',color:'#ff9c42'},
];
export const candyAsset = (color: number) => `/assets/optimized/candies/${CANDIES[color]?.file ?? 'yellow-drop'}.webp`;
