import React from "react";
import { Image, View } from "react-native";
export default function AbilityIcon({
  cell,
  size = 56,
}: {
  cell: number;
  size?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        backgroundColor: "#171013",
      }}
    >
      <Image
        source={require("../assets/abilities-v2.png")}
        fadeDuration={0}
        style={{
          position: "absolute",
          width: size * 4,
          height: size * 4,
          left: -(cell % 4) * size,
          top: -Math.floor(cell / 4) * size,
        }}
      />
    </View>
  );
}
