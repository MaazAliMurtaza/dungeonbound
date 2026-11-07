import React from "react";
import { Text as NativeText, StyleSheet, type TextProps } from "react-native";
import { isLoaded } from "expo-font";

export default function GameText({
  style,
  maxFontSizeMultiplier = 1.3,
  ...props
}: TextProps) {
  const flattened = StyleSheet.flatten(style);
  const bold =
    !!flattened?.fontWeight &&
    ["bold", "600", "700", "800", "900"].includes(String(flattened.fontWeight));
  const family = bold ? "DungeonboundBold" : "DungeonboundUI";
  return (
    <NativeText
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        { color: "#F2E4C8" },
        style,
        { fontFamily: isLoaded(family) ? family : "sans-serif" },
      ]}
    />
  );
}
