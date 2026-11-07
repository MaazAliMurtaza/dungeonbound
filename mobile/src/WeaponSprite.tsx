import React from "react";
import { Image, View } from "react-native";

const source = require("../assets/weapons-v1.png");
export default function WeaponSprite({row,column,size=64}:{row:number;column:number;size?:number}) {
  const dimensions=Image.resolveAssetSource(source);
  const cellWidth=(dimensions?.width??1448)/4,cellHeight=(dimensions?.height??1086)/3;
  const scale=Math.min(size/cellWidth,size/cellHeight),w=cellWidth*scale,h=cellHeight*scale;
  return <View pointerEvents="none" style={{width:w,height:h,overflow:"hidden"}}>
    <Image source={source} resizeMode="contain" fadeDuration={0} style={{position:"absolute",width:w*4,height:h*3,left:-column*w,top:-row*h}} />
  </View>;
}
