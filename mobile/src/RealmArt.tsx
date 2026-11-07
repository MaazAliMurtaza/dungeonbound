import React, { useState } from "react";
import { Image, View } from "react-native";
export default function RealmArt({
  index = 0,
  height = 230,
  shade = 0.15,
}: {
  index?: number;
  height?: number;
  shade?: number;
}) {
  const [width, setWidth] = useState(360);
  // Atlas cells are 768 x 341.33. Cover each cell without bleeding adjacent art.
  const scale = Math.max(width / 768, height / (1024 / 3)),
    w = 768 * scale,
    h = (1024 / 3) * scale;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        overflow: "hidden",
      }}
    >
      <Image
        source={require("../assets/realms-v2.png")}
        fadeDuration={0}
        style={{
          position: "absolute",
          width: w * 2,
          height: h * 3,
          left: -(index % 2) * w + (width - w) / 2,
          top: -Math.floor(index / 2) * h + (height - h) / 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(5,8,19,${shade})`,
        }}
      />
    </View>
  );
}
