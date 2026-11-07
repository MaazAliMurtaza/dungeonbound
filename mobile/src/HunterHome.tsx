import React, { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import GameText from "./GameText";
import HeroSprite from "./HeroSprite";
import AbilityIcon from "./AbilityIcon";
import { homeLayout, armorAppearance } from "./appearance";
import { FLOORS } from "./content";
import type { Game } from "./game";

const links = [
  { label: "GEAR", name: "Armory", cell: 0, target: "inventory" },
  { label: "SKILLS", name: "Skills", cell: 10, target: "skills" },
  { label: "MARKET", name: "Merchant", cell: 15, target: "shop" },
  { label: "GUILD", name: "Contracts", cell: 7, target: "quests" },
];

export default function HunterHome({
  game,
  sync,
  navigate,
}: {
  game: Game;
  sync: string;
  navigate: (screen: string) => void;
}) {
  const [bounds, setBounds] = useState({ width: 360, height: 250 });
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const layout = homeLayout(bounds.width, bounds.height),
    floor = FLOORS[game.floor - 1],
    armor = armorAppearance(game);
  const renderLink = (link: (typeof links)[number]) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={link.label}
      key={link.label}
      onPress={() => navigate(link.target)}
      style={s.link}
    >
      <View style={s.iconFrame}>
        <AbilityIcon cell={link.cell} size={layout.iconSize} />
      </View>
      <GameText
        style={s.linkLabel}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {link.name}
      </GameText>
    </Pressable>
  );
  return (
    <View style={s.root}>
      <View style={s.heading}>
        <GameText
          style={[s.brand, compact && { fontSize: 22 }]}
          maxFontSizeMultiplier={1.1}
        >
          DUNGEONBOUND
        </GameText>
        <GameText
          style={[s.bounty, compact && { fontSize: 12 }]}
          numberOfLines={1}
        >
          Current hunt: {floor.boss}
        </GameText>
      </View>
      <View
        style={[s.stage, { paddingHorizontal: layout.gutter }]}
        onLayout={(event) =>
          setBounds({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
      >
        <View style={[s.rail, { width: layout.rail }]}>
          {links.slice(0, 2).map(renderLink)}
        </View>
        <View style={s.hunter}>
          <HeroSprite game={game} size={layout.heroSize} />
          <GameText
            testID="hunter-outfit-name"
            style={s.armorLabel}
            numberOfLines={2}
          >
            {armor.name}
          </GameText>
          <GameText
            testID="hunter-title"
            style={s.hunterTitle}
            numberOfLines={2}
          >
            {game.achievements.at(-1) ?? "Awakened Hunter"}
          </GameText>
        </View>
        <View style={[s.rail, { width: layout.rail }]}>
          {links.slice(2).map(renderLink)}
        </View>
      </View>
      <View style={s.travel}>
        <GameText style={s.floor} numberOfLines={2}>
          Floor {game.floor} / {floor.name}
        </GameText>
        <GameText
          style={s.story}
          numberOfLines={compact ? 1 : 3}
          accessibilityLabel={floor.story}
        >
          {floor.story}
        </GameText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="CONTINUE ADVENTURE"
          onPress={() => navigate("dungeon")}
          style={({ pressed }) => [
            s.continue,
            pressed && { backgroundColor: "#665132" },
          ]}
        >
          <GameText style={s.continueText} maxFontSizeMultiplier={1.2}>
            CONTINUE ADVENTURE
          </GameText>
        </Pressable>
        <View style={s.summary}>
          <GameText style={s.stats} numberOfLines={2}>
            {game.kills} slain · {game.bosses} guardians · {game.relics.length}{" "}
            relics
          </GameText>
          <GameText style={s.save}>
            {sync === "Saved to cloud" ? "SAVED" : "LOCAL"}
          </GameText>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  heading: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 3,
    alignItems: "center",
  },
  brand: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F5DC9F",
    letterSpacing: 1.4,
  },
  bounty: {
    fontSize: 14,
    color: "#D0D7DC",
    textAlign: "center",
    flexShrink: 1,
  },
  stage: {
    flex: 1,
    minHeight: 150,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  rail: {
    alignSelf: "stretch",
    justifyContent: "space-evenly",
    alignItems: "center",
    gap: 10,
  },
  link: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 56,
    minHeight: 70,
  },
  iconFrame: {
    borderWidth: 1,
    borderColor: "#C4A772",
    padding: 2,
    backgroundColor: "#101014",
  },
  linkLabel: {
    color: "#F2E4C8",
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  hunter: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 5,
    gap: 2,
  },
  armorLabel: {
    color: "#B9DDE9",
    fontSize: 12,
    textAlign: "center",
    flexShrink: 1,
  },
  hunterTitle: {
    color: "#E5C78C",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  travel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 7,
    backgroundColor: "#0B1019ED",
    borderTopWidth: 1,
    borderColor: "#89734B",
  },
  floor: {
    color: "#E2C68B",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  story: {
    color: "#CDD1D5",
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
  },
  continue: {
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#C9A968",
    backgroundColor: "#4D3D25",
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: "#FFE8AD",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  stats: { flex: 1, minWidth: 0, color: "#B9BCC1", fontSize: 11 },
  save: { color: "#BBD4B4", fontSize: 11, fontWeight: "600" },
});
