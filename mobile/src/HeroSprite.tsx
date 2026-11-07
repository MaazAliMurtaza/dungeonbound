import React from "react";
import { Image, View } from "react-native";
import type { Game, HeroClass } from "./game";
import { armorAppearance, HERO_POSES, type HeroPose } from "./appearance";

const atlases = {
  Warrior: require("../assets/warrior-poses-v4.png"),
  Ranger: require("../assets/ranger-poses-v3.png"),
  Mage: require("../assets/mage-poses-v3.png"),
};

export default function HeroSprite({
  game,
  className = game?.hero.className ?? "Warrior",
  pose = "idle",
  size = 160,
}: {
  game?: Game;
  className?: HeroClass;
  pose?: HeroPose;
  size?: number;
}) {
  const armor = game
    ? armorAppearance(game)
    : { row: 0, tier: "Starter", name: "Starter outfit" };
  const source = atlases[className];
  const dimensions = Image.resolveAssetSource(source);
  const width = dimensions?.width ?? 1774,
    height = dimensions?.height ?? 887;
  const cellWidth = width / 8,
    cellHeight = height / 4;
  const scale = Math.min(size / cellWidth, size / cellHeight);
  const w = cellWidth * scale,
    h = cellHeight * scale;
  return (
    <View
      accessible
      accessibilityLabel={`${className}, ${armor.name}, ${pose} pose`}
      testID={`hero-${className.toLowerCase()}-${armor.tier.toLowerCase()}-${pose}`}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {armor.tier === "Legendary" && (
        <View pointerEvents="none" style={{ position: "absolute", width: size * 0.72,
          height: size * 0.72, bottom: size * 0.07, borderRadius: size,
          borderWidth: 2, borderColor: "#FFD56D", backgroundColor: "#FFD56D12",
          transform: [{ scaleY: 0.28 }] }} />
      )}
      <View style={{ width: w, height: h, overflow: "hidden" }}>
        <Image
          source={source}
          fadeDuration={0}
          resizeMode="contain"
          style={{
            position: "absolute",
            width: width * scale,
            height: height * scale,
            left: -HERO_POSES.indexOf(pose) * w,
            top: -armor.row * h,
          }}
        />
      </View>
      {armor.tier === "Legendary" && (
        <View pointerEvents="none" style={{ position: "absolute", top: size * 0.05,
          width: Math.max(5, size * 0.045), height: Math.max(5, size * 0.045),
          backgroundColor: "#FFD56D", transform: [{ rotate: "45deg" }] }} />
      )}
    </View>
  );
}
