// Presentation only: approved RGB category colors, independent of owners and cargo.
export const BUILDING_TYPE_COLORS=Object.freeze({
 'Жилое':'#466B50',
 'Бизнес':'#624D73',
 'Промышленное':'#353B40',
 'Общественное':'#3C607C',
 'Торговое':'#A58B43'
});
export const UNKNOWN_CATEGORY_COLOR='#8A7D6B';
export function categoryColors(types,palette=BUILDING_TYPE_COLORS){
 return (Array.isArray(types)?types:[]).filter(t=>Object.hasOwn(palette,t)).map(t=>palette[t]);
}
// Equal sharp sections are provisional, not a final mixed-tile design.
export function categoryStops(colors){
 return colors.flatMap((color,i)=>[{color,offset:100*i/colors.length},{color,offset:100*(i+1)/colors.length}]);
}
export function categoryStripe(types,palette=BUILDING_TYPE_COLORS){
 const colors=categoryColors(types,palette);
 if(!colors.length)return UNKNOWN_CATEGORY_COLOR;
 if(colors.length===1)return colors[0];
 return 'linear-gradient(90deg,'+categoryStops(colors).map(({color,offset})=>color+' '+offset+'%').join(',')+')';
}
function luminance(hex){
 const channels=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}
export function categoryTextStyle(colors){
 if(!colors.length)return '';
 if(colors.length>1)return 'fill:#FFF4DB;paint-order:stroke fill;stroke:#182127;stroke-linejoin:round;';
 const bg=luminance(colors[0]),light=luminance('#FFF4DB'),dark=luminance('#182127');
 return 'fill:'+((light+.05)/(bg+.05)>=(bg+.05)/(dark+.05)?'#FFF4DB':'#182127')+';';
}
