import GameText from "./GameText";
import React, { useState } from "react";
import {
  Modal,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RealmArt from "./RealmArt";
import HunterHome from "./HunterHome";
import HeroSprite from "./HeroSprite";
import { commandDeckLayout } from "./appearance";
import { effectiveSpeed } from "./game";
import BattleScene, { Sprite, type BattleEvent } from "./BattleScene";
import AbilityIcon from "./AbilityIcon";
import { FLOORS, RELICS, SKILLS } from "./content";
import {
  chooseRoomReward,
  enterNextRoom,
  nextDungeon,
  type Action,
  type Game,
  type HeroClass,
} from "./game";

type Props = {
  game: Game;
  event: BattleEvent | null;
  screen: "home" | "dungeon";
  navigate: (screen: string) => void;
  update: (g: Game) => void;
  fight: (action: Action, id?: string) => void;
  locked: boolean;
  conflict: boolean;
  busy: boolean;
  resolve: (choice: "local" | "cloud") => void;
  logout: () => void;
  restart: (cls: HeroClass) => void;
  sync: string;
  performance: boolean;
  setPerformance: (v: boolean) => void;
  haptics: boolean;
  setHaptics: (v: boolean) => void;
  audioSettings: {music:boolean;sound:boolean;voice:boolean};
  configureAudio: (key:"music"|"sound"|"voice", value:boolean) => void;
};
const gold = "#D9BB7B",
  paper = "#F2E4C8",
  dim = "#B7AE9C",
  red = "#C94B52";
function Meter({
  value,
  max,
  color = red,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <View style={s.meter}>
      <View
        style={{
          height: "100%",
          width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
function Command({
  label,
  caption,
  cell,
  onPress,
  disabled = false,
  primary = false,
}: {
  label: string;
  caption: string;
  cell?: number;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.command,
        primary && s.primary,
        disabled && { opacity: 0.32 },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {cell !== undefined && <AbilityIcon cell={cell} size={32} />}
      <GameText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.15}
        style={[s.commandName, primary && { color: "#FFE5A3" }]}
      >
        {caption}
      </GameText>
    </Pressable>
  );
}
function SealButton({
  label,
  onPress,
  small = false,
}: {
  label: string;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.sealButton,
        small && { minHeight: 40 },
        pressed && { backgroundColor: "#51412B" },
      ]}
    >
      <GameText style={[s.sealText, small && { fontSize: 12 }]}>
        {label}
      </GameText>
    </Pressable>
  );
}
function HubIcon({
  label,
  name,
  cell,
  onPress,
}: {
  label: string;
  name: string;
  cell: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.hubIcon}
    >
      <View style={s.hubIconFrame}>
        <AbilityIcon cell={cell} size={50} />
      </View>
      <GameText style={s.hubIconLabel}>{name}</GameText>
    </Pressable>
  );
}
export default function GameWorld(p: Props) {
  const { game: g } = p,
    h = g.hero,
    floor = FLOORS[g.floor - 1],
    { width, height } = useWindowDimensions(),
    [menu, setMenu] = useState(false),
    [map, setMap] = useState(false),
    [stageHeight, setStageHeight] = useState(350);
  const dead = h.hp <= 0,
    blocked = p.locked || p.conflict;
  const learnedSkills = SKILLS.filter((sk) => g.skills.includes(sk.id));
  const deckLayout = commandDeckLayout(width, learnedSkills.length);
  const intent =
    g.enemy?.intent === "heavy"
      ? "HEAVY STRIKE"
      : g.enemy?.intent === "guard"
        ? "FORTIFY"
        : g.enemy?.intent === "hex"
          ? "MANA HEX"
          : "STRIKE";
  const inventory = [
    ["GEAR", "Armory", 0, "inventory"],
    ["SKILLS", "Awakening", 10, "skills"],
    ["MARKET", "Merchant", 15, "shop"],
    ["GUILD", "Contracts", 7, "quests"],
  ] as const;
  return (
    <View style={s.root}>
      {p.screen === "home" ? (
        <Image
          source={require("../assets/guild-portrait-v3.png")}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        />
      ) : (
        <RealmArt index={floor.art} height={height} shade={0.22} />
      )}
      <View pointerEvents="none" style={s.topShade} />
      <View pointerEvents="none" style={s.bottomShade} />
      <SafeAreaView style={s.safe}>
        <View style={s.topline}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={p.screen === "home" ? "MENU" : "HUB"}
            onPress={() =>
              p.screen === "home" ? setMenu(true) : p.navigate("home")
            }
            style={s.smallControl}
          >
            <GameText style={s.smallControlText}>
              {p.screen === "home" ? "☰" : "‹"}
            </GameText>
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <GameText
              style={s.region}
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
            >
              {p.screen === "home" ? "THE HUNTER’S REFUGE" : floor.region}
            </GameText>
            <GameText style={s.location} numberOfLines={1}>
              {p.screen === "home" ? "Ashfall Keep" : floor.name}
            </GameText>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={s.hunterHud}>
          <View style={s.portrait}>
            <HeroSprite game={g} size={46} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={s.spread}>
              <GameText style={s.hunterName}>{h.className}</GameText>
              <GameText style={s.level} numberOfLines={1} maxFontSizeMultiplier={1.1}>Lv. {h.level} · SPD {effectiveSpeed(g)}</GameText>
            </View>
            <Meter value={h.hp} max={h.maxHp} />
            <View style={s.spread}>
              <GameText style={s.vital}>
                {h.hp} / {h.maxHp}
              </GameText>
              <GameText style={s.vital}>
                MP {h.mana}/{h.maxMana}
              </GameText>
            </View>
            <Meter value={h.mana} max={h.maxMana} color="#658EC8" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="FLOOR MAP"
            onPress={() => setMap(true)}
            style={s.floorSeal}
          >
            <GameText style={s.floorNumeral}>
              {String(g.floor).padStart(2, "0")}
            </GameText>
            <GameText style={s.floorText}>FLOOR</GameText>
            <GameText
              accessibilityLabel={`${h.gold} gold`}
              style={s.currency}
              maxFontSizeMultiplier={1.1}
            >
              ◉{" "}
              {h.gold >= 1000000
                ? `${(h.gold / 1000000).toFixed(1)}M`
                : h.gold >= 10000
                  ? `${(h.gold / 1000).toFixed(1)}K`
                  : h.gold}
            </GameText>
          </Pressable>
        </View>
        {p.screen === "home" ? (
          <HunterHome game={g} sync={p.sync} navigate={p.navigate} />
        ) : (
          <>
            {!g.enemy && (
              <View style={s.route}>
                <View style={s.routeLine} />
                {g.rooms.map((room, i) => (
                  <View
                    key={i}
                    style={[
                      s.routeNode,
                      room.cleared && { borderColor: "#7D9E71" },
                      i === g.roomIndex && {
                        borderColor: gold,
                        backgroundColor: "#493820",
                      },
                    ]}
                  >
                    <GameText
                      style={{
                        color:
                          i === g.roomIndex
                            ? gold
                            : room.cleared
                              ? "#A2C08A"
                              : "#B8AA8C",
                        fontSize: 14,
                      }}
                    >
                      {room.kind === "boss"
                        ? "♛"
                        : room.kind === "treasure"
                          ? "◆"
                          : room.kind === "rest"
                            ? "♥"
                            : room.kind === "event"
                              ? "✧"
                              : room.kind === "start"
                                ? "⌂"
                                : "⚔"}
                    </GameText>
                  </View>
                ))}
              </View>
            )}
            <View
              style={{ flex: 1, minHeight: 110 }}
              onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
            >
              {g.enemy && (
                <View style={s.enemyHud}>
                  <GameText style={s.enemyRank}>
                    {g.enemy.boss
                      ? "♛ GUARDIAN"
                      : g.enemy.elite
                        ? "ϟ ELITE"
                        : "HOSTILE"}{" "}
                    · ROOM {g.roomIndex + 1}/8
                  </GameText>
                  <GameText style={s.enemyName}>{g.enemy.name}</GameText>
                  <Meter value={g.enemy.hp} max={g.enemy.maxHp} />
                  <View style={s.spread}>
                    <GameText style={s.vital}>
                      {g.enemy.hp} / {g.enemy.maxHp}
                    </GameText>
                    <GameText
                      style={[
                        s.intent,
                        g.enemy.intent === "heavy" && { color: "#FFC778" },
                      ]}
                    >
                      {intent} {g.enemy.intent === "heavy" ? "⚠" : "⚔"}
                    </GameText>
                  </View>
                  {((g.enemy.poison ?? 0) > 0 || (g.enemy.burn ?? 0) > 0) && (
                    <GameText style={s.fine}>
                      {(g.enemy.poison ?? 0) > 0 ? "☠ POISON " : ""}
                      {(g.enemy.burn ?? 0) > 0 ? "♨ BURN " : ""}
                    </GameText>
                  )}
                </View>
              )}
              {g.ended && (
                <View style={s.victory}>
                  <GameText style={s.chapter}>
                    {g.floor === 6
                      ? "THE ECLIPSE IS BROKEN"
                      : "GUARDIAN DEFEATED"}
                  </GameText>
                  <GameText style={s.victoryTitle}>
                    {g.floor === 6 ? "Conqueror" : "Victory"}
                  </GameText>
                  <View style={s.goldRule} />
                  <GameText style={s.worldLine}>
                    {g.floor === 6
                      ? "A harder cycle awaits."
                      : "The next gate is yours to claim."}
                  </GameText>
                </View>
              )}
              {dead && (
                <View style={s.victory}>
                  <GameText style={s.chapter}>THE HUNT ENDS</GameText>
                  <GameText style={[s.victoryTitle, { color: "#C27F7B" }]}>
                    Fallen
                  </GameText>
                </View>
              )}
              <BattleScene
                game={g}
                event={p.event}
                immersive
                height={stageHeight}
              />
            </View>
            {g.enemy && !dead ? (
              <View style={s.battleDeck}>
                <View style={s.deckRule} />
                <View style={s.spread}>
                  <GameText style={s.turn}>
                    {p.locked ? "RESOLVING…" : "YOUR MOVE"}
                  </GameText>
                  <GameText style={s.fine}>
                    {g.shield
                      ? `◈ ${g.shield} SHIELD`
                      : "Attack +3 MP · Guard +5 MP"}
                  </GameText>
                </View>
                <View style={[s.skillRow, { gap: deckLayout.gap }]}>
                  {learnedSkills.map((sk) => (
                    <Pressable
                      key={sk.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${sk.icon} ${sk.name}\n${g.cooldowns[sk.id] ? `${g.cooldowns[sk.id]} TURN COOLDOWN` : `${sk.mana} MP`}`}
                      disabled={
                        blocked || h.mana < sk.mana || !!g.cooldowns[sk.id]
                      }
                      onPress={() => p.fight("skill", sk.id)}
                      style={({ pressed }) => [
                        s.skillSlot,
                        { width: deckLayout.slotWidth },
                        (h.mana < sk.mana || !!g.cooldowns[sk.id]) && {
                          opacity: 0.4,
                        },
                        pressed && { transform: [{ scale: 0.94 }] },
                      ]}
                    >
                      <View style={s.skillFrame}>
                        <AbilityIcon
                          cell={SKILLS.findIndex((x) => x.id === sk.id)}
                          size={deckLayout.iconSize}
                        />
                        {!!g.cooldowns[sk.id] && (
                          <View style={s.cooldown}>
                            <GameText style={s.cooldownNumber}>
                              {g.cooldowns[sk.id]}
                            </GameText>
                          </View>
                        )}
                        <GameText style={s.manaCost}>{sk.mana}</GameText>
                      </View>
                      <GameText
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        maxFontSizeMultiplier={1.15}
                        style={s.skillName}
                      >
                        {sk.name}
                      </GameText>
                    </Pressable>
                  ))}
                </View>
                <View style={s.commandRow}>
                  <Command
                    primary
                    label="⚔ ATTACK"
                    caption="Attack"
                    cell={0}
                    disabled={blocked}
                    onPress={() => p.fight("attack")}
                  />
                  <Command
                    label="◈ DEFEND"
                    caption="Guard"
                    cell={1}
                    disabled={blocked}
                    onPress={() => p.fight("defend")}
                  />
                  <Command
                    label={`♥ FLASK (${h.potions})`}
                    caption={`Flask ×${h.potions}`}
                    cell={15}
                    disabled={blocked || !h.potions}
                    onPress={() => p.fight("potion")}
                  />
                  <Command
                    label={`✦ ETHER (${g.ethers})`}
                    caption={`Ether ×${g.ethers}`}
                    cell={12}
                    disabled={blocked || !g.ethers}
                    onPress={() => p.fight("ether")}
                  />
                </View>
                <GameText numberOfLines={1} style={s.combatToast}>
                  {g.log[0]}
                </GameText>
              </View>
            ) : (
              <View style={s.travelPanel}>
                {dead ? (
                  <SealButton
                    label="RETURN HOME"
                    onPress={() => p.navigate("home")}
                  />
                ) : g.ended ? (
                  <>
                    <GameText style={s.nextLocation}>
                      SPOILS SECURED · PROGRESS RETAINED
                    </GameText>
                    <SealButton
                      label={
                        g.floor === 6
                          ? "BEGIN HARDER CYCLE"
                          : "ASCEND TO NEXT FLOOR"
                      }
                      onPress={() => !blocked && p.update(nextDungeon(g))}
                    />
                  </>
                ) : g.pendingChoice === "relic" ? (
                  <>
                    <GameText style={s.rewardTitle}>Choose your relic</GameText>
                    <GameText style={s.worldLine}>
                      Bind one echo. Carry its power onward.
                    </GameText>
                    <View style={s.relicGrid}>
                      {RELICS.map((r, i) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${r.icon} ${r.name} · ${r.description}`}
                          disabled={blocked}
                          key={r.id}
                          onPress={() => p.update(chooseRoomReward(g, r.id))}
                          style={s.relicChoice}
                        >
                          <AbilityIcon cell={[11, 1, 10, 12][i]} size={42} />
                          <View style={{ flex: 1 }}>
                            <GameText style={s.relicName}>{r.name}</GameText>
                            <GameText style={s.fine}>{r.description}</GameText>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : g.pendingChoice === "event" ? (
                  <>
                    <GameText style={s.rewardTitle}>
                      A stranger in the dark
                    </GameText>
                    <GameText style={s.storyLine}>
                      A wounded hunter guards a cursed seal. Mercy or ambition?
                    </GameText>
                    <SealButton
                      small
                      label="HELP THE HUNTER · +1 flask, +15 XP"
                      onPress={() =>
                        !blocked && p.update(chooseRoomReward(g, "safe"))
                      }
                    />
                    <SealButton
                      small
                      label="BREAK THE SEAL · -18% HP, +55 gold, +30 XP"
                      onPress={() =>
                        !blocked && p.update(chooseRoomReward(g, "risk"))
                      }
                    />
                  </>
                ) : (
                  <>
                    <GameText style={s.nextLocation}>
                      {g.roomIndex < 0
                        ? `CHAPTER ${g.floor} · ${floor.name.toUpperCase()}`
                        : "ROOM SECURED"}
                    </GameText>
                    <GameText style={s.storyLine}>
                      {g.roomIndex < 0 ? floor.story : g.log[0]}
                    </GameText>
                    <SealButton
                      label={g.roomIndex < 0 ? "ENTER DUNGEON" : "NEXT ROOM"}
                      onPress={() => !blocked && p.update(enterNextRoom(g))}
                    />
                  </>
                )}
                <View style={s.hubMenu}>
                  {inventory.map(([label, name, cell, target]) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      key={label}
                      onPress={() => p.navigate(target)}
                      style={s.quickLink}
                    >
                      <GameText style={s.quickName}>{name}</GameText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
      <Modal
        transparent
        visible={p.conflict || menu || map}
        animationType="fade"
        onRequestClose={() => {
          if (!p.conflict) {
            setMenu(false);
            setMap(false);
          }
        }}
      >
        <View style={s.modalShade}>
          <View style={s.menuFrame}>
            <View style={s.frameCorner} />
            <ScrollView contentContainerStyle={{ gap: 16, padding: 24 }}>
              {p.conflict ? (
                <>
                  <GameText style={s.menuTitle}>
                    Two paths. Your choice.
                  </GameText>
                  <GameText style={s.storyLine}>
                    Another adventure exists in the cloud. Your hunt is paused.
                    Both copies are kept on this device before you choose.
                  </GameText>
                  <SealButton
                    label="KEEP THIS ADVENTURE"
                    onPress={() => !p.busy && p.resolve("local")}
                  />
                  <SealButton
                    label="LOAD CLOUD ADVENTURE"
                    onPress={() => !p.busy && p.resolve("cloud")}
                  />
                </>
              ) : map ? (
                <>
                  <GameText style={s.menuTitle}>The six gates</GameText>
                  {FLOORS.map((f, i) => (
                    <View key={f.name} style={s.mapRow}>
                      <GameText style={s.mapIndex}>
                        {["I", "II", "III", "IV", "V", "VI"][i]}
                      </GameText>
                      <View style={{ flex: 1 }}>
                        <GameText style={s.relicName}>{f.name}</GameText>
                        <GameText style={s.fine}>{f.region}</GameText>
                      </View>
                      <GameText
                        style={{
                          color: i === g.floor - 1 ? gold : dim,
                          fontSize: 10,
                        }}
                      >
                        {i === g.floor - 1
                          ? "HERE"
                          : i < g.floor - 1
                            ? "CLEARED"
                            : "SEALED"}
                      </GameText>
                    </View>
                  ))}
                  <SealButton
                    small
                    label="CLOSE MAP"
                    onPress={() => setMap(false)}
                  />
                </>
              ) : (
                <>
                  <GameText style={s.menuTitle}>The hunter’s respite</GameText>
                  <GameText style={s.fine}>{p.sync}</GameText>
                  <View style={s.spread}>
                    <GameText style={s.storyLine}>Performance mode</GameText>
                    <Switch
                      value={p.performance}
                      onValueChange={p.setPerformance}
                    />
                  </View>
                  <View style={s.spread}>
                    <GameText style={s.storyLine}>Combat haptics</GameText>
                    <Switch value={p.haptics} onValueChange={p.setHaptics} />
                  </View>
                  {([['music','Music'],['sound','Sound effects'],['voice','Voice announcements']] as const).map(([key,label])=>(
                    <View style={s.spread} key={key}>
                      <GameText style={s.storyLine}>{label}</GameText>
                      <Switch accessibilityLabel={label} value={p.audioSettings[key]} onValueChange={value=>p.configureAudio(key,value)} />
                    </View>
                  ))}
                  <GameText style={s.fine}>
                    A new awakening replaces the current hunter.
                  </GameText>
                  {(["Warrior", "Ranger", "Mage"] as HeroClass[]).map((cls) => (
                    <SealButton
                      small
                      key={cls}
                      label={`NEW ${cls.toUpperCase()}`}
                      onPress={() => {
                        setMenu(false);
                        p.restart(cls);
                      }}
                    />
                  ))}
                  <SealButton
                    small
                    label="LOG OUT"
                    onPress={() => {
                      setMenu(false);
                      p.logout();
                    }}
                  />
                  <SealButton
                    label="RETURN TO THE HUNT"
                    onPress={() => setMenu(false)}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0B0C" },
  safe: { flex: 1 },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "#08090BC7",
  },
  bottomShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "#090A0DDD",
  },
  topline: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },
  smallControl: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#8F794E",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12110CC4",
  },
  smallControlText: { fontSize: 23, color: gold },
  region: { color: gold, fontSize: 10, letterSpacing: 0.6 },
  location: {
    color: paper,
    fontFamily: "DungeonboundUI",
    fontSize: 18,
    marginTop: 3,
  },
  currency: {
    color: "#F4D797",
    fontSize: 12,
    fontWeight: "800",
    minWidth: 48,
    textAlign: "right",
  },
  hunterHud: {
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  portrait: {
    height: 48,
    width: 48,
    borderWidth: 1,
    borderColor: "#8B744B",
    backgroundColor: "#15141ABF",
    overflow: "hidden",
  },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  hunterName: { fontFamily: "DungeonboundUI", color: paper, fontSize: 15 },
  level: { fontSize: 10, color: gold },
  vital: { fontSize: 11, color: "#DED2BE" },
  meter: {
    height: 5,
    borderWidth: 1,
    borderColor: "#8D765C",
    backgroundColor: "#1C1617",
  },
  floorSeal: {
    alignItems: "center",
    borderLeftWidth: 1,
    borderColor: "#82704F",
    paddingLeft: 16,
  },
  floorNumeral: {
    fontFamily: "DungeonboundUI",
    fontSize: 26,
    color: gold,
    lineHeight: 28,
  },
  floorText: { fontSize: 9, color: dim, letterSpacing: 0.6 },
  homeSpace: { flex: 1, minHeight: 270 },
  homeHeading: { position: "absolute", top: 12, left: 23, right: 20 },
  chapter: { color: gold, fontSize: 9, letterSpacing: 2, textAlign: "center" },
  worldTitle: {
    fontFamily: "DungeonboundUI",
    fontSize: 41,
    lineHeight: 45,
    color: paper,
    textShadowColor: "#08090B",
    textShadowRadius: 8,
    marginTop: 11,
  },
  worldLine: {
    color: "#D0C5AD",
    fontFamily: "DungeonboundUI",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  hunterStage: {
    position: "absolute",
    bottom: -7,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  sigil: {
    position: "absolute",
    bottom: 21,
    width: 170,
    height: 36,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#DBC88A88",
    backgroundColor: "#6C9B9D22",
    transform: [{ scaleY: 0.55 }],
  },
  sigilRune: {
    position: "absolute",
    alignSelf: "center",
    fontSize: 90,
    color: "#C8D9BE44",
    bottom: -10,
  },
  heroTitle: {
    fontSize: 9,
    color: gold,
    letterSpacing: 2,
    textShadowColor: "#000",
    textShadowRadius: 6,
  },
  hubLeft: { position: "absolute", left: 17, top: "44%", gap: 22 },
  hubRight: { position: "absolute", right: 17, top: "44%", gap: 22 },
  hubIcon: { alignItems: "center", gap: 5, width: 70 },
  hubIconFrame: {
    borderWidth: 1,
    borderColor: "#C4A772",
    padding: 2,
    backgroundColor: "#101014",
  },
  hubIconLabel: {
    color: paper,
    fontFamily: "DungeonboundUI",
    fontSize: 12,
    textShadowColor: "#000",
    textShadowRadius: 6,
  },
  travelPanel: {
    paddingHorizontal: 19,
    paddingTop: 13,
    paddingBottom: 13,
    gap: 12,
    backgroundColor: "#0E0D0EF0",
    borderTopWidth: 1,
    borderColor: "#9C8151",
  },
  nextLocation: {
    color: gold,
    fontSize: 9,
    letterSpacing: 1,
    textAlign: "center",
  },
  storyLine: {
    color: "#CFC2AA",
    fontFamily: "DungeonboundUI",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  sealButton: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: "#D8BB7C",
    backgroundColor: "#443723",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 0,
    shadowOpacity: 0.8,
    elevation: 3,
  },
  sealText: {
    fontFamily: "DungeonboundUI",
    color: "#FFE7AA",
    fontSize: 16,
    letterSpacing: 1,
    textAlign: "center",
  },
  fine: { color: dim, fontSize: 9, lineHeight: 15 },
  enemyHud: {
    position: "absolute",
    top: 8,
    right: 20,
    width: 217,
    gap: 5,
    zIndex: 10,
  },
  enemyRank: {
    color: "#CEB88A",
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "right",
  },
  enemyName: {
    color: paper,
    fontFamily: "DungeonboundUI",
    fontSize: 20,
    textAlign: "right",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  intent: { color: "#ECC1A1", fontSize: 10, fontWeight: "700" },
  battleDeck: {
    backgroundColor: "#100E10F5",
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    gap: 8,
  },
  deckRule: { height: 1, backgroundColor: "#9D8152", marginHorizontal: -16 },
  turn: {
    color: gold,
    fontFamily: "DungeonboundUI",
    fontSize: 12,
    letterSpacing: 2,
  },
  skillRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingTop: 3,
  },
  skillSlot: { alignItems: "center", gap: 4, width: 62 },
  skillFrame: { borderWidth: 1, borderColor: "#D6B46F", padding: 2 },
  skillName: {
    color: "#DDCBA6",
    fontFamily: "DungeonboundUI",
    fontSize: 10,
    lineHeight: 12.5,
    width: "100%",
    minHeight: 28,
    textAlign: "center",
  },
  manaCost: {
    position: "absolute",
    right: 0,
    bottom: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: "#13213AEF",
    color: "#BBD5FF",
    fontSize: 10,
    fontWeight: "800",
  },
  cooldown: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#040405AA",
    justifyContent: "center",
    alignItems: "center",
  },
  cooldownNumber: { fontFamily: "DungeonboundUI", fontSize: 24, color: paper },
  commandRow: { flexDirection: "row", gap: 7, justifyContent: "space-between" },
  command: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#6D5C42",
    backgroundColor: "#242026",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 4,
  },
  primary: { backgroundColor: "#4D3022", borderColor: "#D5AD63" },
  commandName: {
    color: "#D2C4AB",
    fontFamily: "DungeonboundUI",
    fontSize: 11,
    flexShrink: 1,
  },
  combatToast: {
    color: "#A89C86",
    textAlign: "center",
    fontSize: 9,
    paddingTop: 2,
  },
  route: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 25,
    paddingVertical: 9,
  },
  routeLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "#95815E",
    left: 5,
    right: 5,
    top: 22,
  },
  routeNode: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: "#81745D",
    backgroundColor: "#161416",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "0deg" }],
  },
  victory: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    zIndex: 12,
  },
  victoryTitle: {
    fontFamily: "DungeonboundUI",
    fontSize: 49,
    color: "#E7C98C",
    textShadowColor: "#241208",
    textShadowRadius: 10,
  },
  goldRule: { width: 130, height: 1, backgroundColor: "#B28D4C" },
  rewardTitle: {
    fontFamily: "DungeonboundUI",
    color: paper,
    fontSize: 22,
    textAlign: "center",
  },
  relicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relicChoice: {
    width: "48%",
    backgroundColor: "#201C20",
    borderWidth: 1,
    borderColor: "#8A724A",
    padding: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  relicName: { fontFamily: "DungeonboundUI", color: paper, fontSize: 13 },
  hubMenu: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderColor: "#534833",
    paddingTop: 10,
  },
  quickLink: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    minHeight: 44,
    justifyContent: "center",
  },
  quickName: { color: "#CCB68C", fontFamily: "DungeonboundUI", fontSize: 12 },
  modalShade: {
    flex: 1,
    backgroundColor: "#050507D9",
    justifyContent: "center",
    padding: 25,
  },
  menuFrame: {
    maxHeight: "85%",
    backgroundColor: "#171418",
    borderWidth: 2,
    borderColor: "#A98C56",
  },
  frameCorner: {
    height: 4,
    backgroundColor: "#DBBA74",
    marginHorizontal: 35,
    marginTop: 4,
  },
  menuTitle: {
    fontFamily: "DungeonboundUI",
    fontSize: 26,
    color: paper,
    textAlign: "center",
  },
  mapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderColor: "#493E2C",
    paddingBottom: 13,
  },
  mapIndex: {
    fontFamily: "DungeonboundUI",
    fontSize: 22,
    color: gold,
    width: 30,
  },
});
