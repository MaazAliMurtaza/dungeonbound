import React from "react";
import { Animated, Image, View } from "react-native";
import type { Game, HeroClass } from "./game";
import { armorAppearance, weaponAppearance, HERO_POSES, type HeroPose } from "./appearance";
import WeaponSprite from "./WeaponSprite";

const bodies = {
  Warrior: require("../assets/warrior-body-v5.png"),
  Ranger: require("../assets/ranger-body-v5.png"),
  Mage: require("../assets/mage-body-v5.png"),
};
const legendaryBodies = {
  Warrior: require("../assets/warrior-legendary-v1.png"),
  Ranger: require("../assets/ranger-legendary-v1.png"),
  Mage: require("../assets/mage-legendary-v2.png"),
};
const grips:Record<HeroClass,number[][]>={
  Warrior:[[.51,.66],[.75,.57],[.48,.27],[.78,.58],[.65,.65],[.5,.63],[.3,.66],[.33,.64]],
  Ranger:[[.64,.6],[.85,.44],[.85,.27],[.91,.4],[.65,.77],[.68,.4],[.6,.62],[.65,.48]],
  Mage:[[.7,.49],[.6,.56],[.32,.51],[.8,.27],[.2,.55],[.5,.6],[.2,.48],[.82,.54]],
};
const legendaryGrips:Record<HeroClass,number[][]>={
  Warrior:[[.44,.49],[.88,.36],[.39,.09],[.89,.39],[.55,.52],[.64,.52],[.28,.66],[.3,.57]],
  Ranger:[[.63,.55],[.83,.3],[.75,.23],[.93,.38],[.65,.8],[.7,.48],[.6,.6],[.67,.43]],
  Mage:[[.4,.6],[.19,.48],[.81,.38],[.78,.1],[.58,.57],[.56,.32],[.3,.53],[.75,.6]],
};

export default function HeroSprite({game,className=game?.hero.className??"Warrior",pose="idle",size=160,swing}:{
  game?:Game;className?:HeroClass;pose?:HeroPose;size?:number;swing?:Animated.Value;
}) {
  const armor=game?armorAppearance(game):{row:0,tier:"Starter",name:"Starter outfit"};
  const special=armor.tier==="Legendary",columns=special?4:8,rows=special?2:4;
  const index=HERO_POSES.indexOf(pose),column=special?index%4:index,row=special?Math.floor(index/4):armor.row;
  const source=special?legendaryBodies[className]:bodies[className];
  const dimensions=Image.resolveAssetSource(source),cellWidth=(dimensions?.width??1774)/columns,cellHeight=(dimensions?.height??887)/rows;
  const bodySize=size*(special?.84:1),scale=Math.min(bodySize/cellWidth,bodySize/cellHeight),w=cellWidth*scale,h=cellHeight*scale;
  const weapon=game?weaponAppearance(game):{row:["Warrior","Ranger","Mage"].indexOf(className),column:0,name:"Starter weapon"};
  const [x,y]=(special?legendaryGrips:grips)[className][index];
  const gx=(size-w)/2+x*w,gy=size-h+y*h;
  const weaponSize=size*(className==="Warrior"?.46:className==="Ranger"?.65:pose==="pierce"?.5:.73);
  // Atlas silhouettes have different horizontal grips inside their grid cells.
  const anchorX=(className==="Ranger"?[.54,.48,.35,.30]:[.62,.55,.46,.37])[weapon.column];
  const anchorY=className==="Warrior"?.78:className==="Ranger"?.5:.67;
  const angles=className==="Warrior"?[145,100,-35,95,180,40,145,140]:className==="Ranger"?[0,0,-25,0,60,-15,0,30]:[0,75,0,35,0,65,0,-25];
  const angle=angles[index];
  const rotation=swing&&pose!=="idle"&&pose!=="hit"?swing.interpolate({inputRange:[0,.18,.4,.75,1],outputRange:[(angle-25)+"deg",angle+"deg",(angle+12)+"deg",angle+"deg",angle+"deg"]}):angle+"deg";
  const showWeapon=pose!=="item"&&!(className==="Ranger"&&pose==="ritual");
  return <View accessible accessibilityLabel={className+", "+armor.name+", "+weapon.name+", "+pose+" pose"}
    testID={"hero-"+className.toLowerCase()+"-"+armor.tier.toLowerCase()+"-"+pose}
    style={{width:size,height:size,alignItems:"center",justifyContent:"flex-end"}}>
    <View style={{width:w,height:h,overflow:"hidden"}}>
      <Image source={source} fadeDuration={0} resizeMode="contain" style={{position:"absolute",width:w*columns,height:h*rows,left:-column*w,top:-row*h}} />
    </View>
    {showWeapon&&<View pointerEvents="none" style={{position:"absolute",left:gx,top:gy,width:0,height:0}}>
      <Animated.View style={{width:0,height:0,transform:[{rotate:rotation}]}}>
        <View style={{position:"absolute",left:-weaponSize*anchorX,top:-weaponSize*anchorY}}>
          <WeaponSprite row={weapon.row} column={weapon.column} size={weaponSize} />
        </View>
      </Animated.View>
    </View>}
  </View>;
}
