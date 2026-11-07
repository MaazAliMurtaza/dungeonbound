import GameText from "./src/GameText";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  Vibration,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import BattleScene, { Sprite, type BattleEvent } from "./src/BattleScene";
import RealmArt from "./src/RealmArt";
import GameWorld from "./src/GameWorld";
import AbilityIcon from "./src/AbilityIcon";
import { useAdventure } from "./src/useAdventure";
import { authorized } from "./src/auth";
import {
  buyItem,
  claimQuest,
  chooseRoomReward,
  combatAction,
  effectiveStat,
  enterNextRoom,
  equipItem,
  newGame,
  nextDungeon,
  questProgress,
  sellItem,
  type Action,
  type HeroClass,
} from "./src/game";
import { FLOORS, QUESTS, RELICS, SHOP, SKILLS } from "./src/content";
import { MotionContext } from "./src/motion";
import { useFonts } from "expo-font";
import HeroSprite from "./src/HeroSprite";
import SkillTree from "./src/SkillTree";
import { RARITY_COLORS } from "./src/items";
import { effectiveSpeed, skillLockReason } from "./src/game";

type Screen =
  "home" | "dungeon" | "inventory" | "skills" | "shop" | "quests" | "ranks";
const T = {
  bg: "#0D0B0E",
  panel: "#171419E8",
  line: "#6F5B3D",
  cyan: "#D9BB7B",
  purple: "#B299FF",
  gold: "#F9D18A",
  muted: "#B8AC96",
  text: "#F2E4C8",
  red: "#FF8399",
  green: "#8CE6B2",
};
const glyphs = {
  start: "⌂",
  combat: "⚔",
  elite: "ϟ",
  treasure: "◆",
  rest: "♥",
  event: "✧",
  boss: "♛",
};
function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  const press = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() =>
          Animated.timing(press, {
            toValue: 0.97,
            duration: 80,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(press, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
          }).start()
        }
        style={[
          s.button,
          secondary && s.secondary,
          disabled && { opacity: 0.35 },
        ]}
      >
        <GameText style={[s.buttonText, secondary && { color: T.text }]}>
          {label}
        </GameText>
      </Pressable>
    </Animated.View>
  );
}
function Card({
  children,
  title,
  tag,
}: {
  children: React.ReactNode;
  title?: string;
  tag?: string;
}) {
  return (
    <View style={s.card}>
      {tag && <GameText style={s.eyebrow}>{tag}</GameText>}
      {title && <GameText style={s.cardTitle}>{title}</GameText>}
      {children}
    </View>
  );
}
function Bar({
  value,
  max,
  color = T.cyan,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <View style={s.bar}>
      <View
        style={{
          height: "100%",
          width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`,
          backgroundColor: color,
          borderRadius: 5,
        }}
      />
    </View>
  );
}
function Label({
  children,
  color = T.muted,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <GameText style={[s.body, { color }]}>{children}</GameText>;
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DungeonboundUI: require("./assets/fonts/BarlowSemiCondensed-Medium.ttf"),
    DungeonboundBold: require("./assets/fonts/BarlowSemiCondensed-Bold.ttf"),
  });
  const a = useAdventure(),
    g = a.game,
    h = g?.hero;
  const [screen, setScreen] = useState<Screen>("home"),
    [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [event, setEvent] = useState<BattleEvent | null>(null),
    [locked, setLocked] = useState(false),
    [performance, setPerformance] = useState(true),
    [haptics, setHaptics] = useState(false),
    [shopTab, setShopTab] = useState<"supplies" | "skills">("supplies"),
    [alias, setAlias] = useState(""),
    [records, setRecords] = useState<
      { alias: string; score: string; level: number; bosses: number }[]
    >([]),
    [boardMessage, setBoardMessage] = useState(""),
    [boardBusy, setBoardBusy] = useState(false);
  const combatLock = useRef(false),
    scroll = useRef<React.ElementRef<typeof ScrollView>>(null),
    turn = useRef(0);
  const floor = FLOORS[(g?.floor ?? 1) - 1],
    canTrade = !!g && !g.enemy && !g.pendingChoice && g.hero.hp > 0;
  function navigate(next: Screen) {
    setScreen(next);
    setEvent(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function start(cls: HeroClass) {
    const go = () => {
      a.update(newGame(cls));
      navigate("dungeon");
    };
    if (g)
      Alert.alert("New awakening", "Replace this hunter and their adventure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Begin again", style: "destructive", onPress: go },
      ]);
    else go();
  }
  function fight(action: Action, skillId?: string) {
    if (!g?.enemy || combatLock.current || a.conflict) return;
    const enemy = g.enemy,
      next = combatAction(g, action, skillId);
    if (JSON.stringify(next) === JSON.stringify(g)) return;
    combatLock.current = true;
    setLocked(true);
    a.update(next);
    setEvent({
      id: ++turn.current,
      action,
      enemy,
      damage: Math.max(0, enemy.hp - (next.enemy?.hp ?? 0)),
      received: Math.max(0, g.hero.hp - next.hero.hp),
      healed: Math.max(0, next.hero.hp - g.hero.hp),
      defeated: !next.enemy,
      evaded: next.log[0]?.startsWith("SWIFT EVADE"),
      skillId,
    });
    if (haptics) Vibration.vibrate(next.enemy ? 12 : [0, 15, 40, 25]);
    setTimeout(
      () => {
        combatLock.current = false;
        setLocked(false);
      },
      performance ? 450 : 1050,
    );
  }
  async function board(action: "load" | "publish" | "remove") {
    setBoardBusy(true);
    try {
      if (action === "publish")
        await authorized("/leaderboard", {
          method: "POST",
          body: JSON.stringify({ alias }),
        });
      if (action === "remove")
        await authorized("/leaderboard", { method: "DELETE" });
      const data = await authorized("/leaderboard");
      setRecords(data.entries);
      setBoardMessage(
        action === "publish"
          ? "Your public hunter record is published."
          : action === "remove"
            ? "Your public record was removed."
            : data.notice,
      );
    } catch (e) {
      setBoardMessage((e as Error).message);
    } finally {
      setBoardBusy(false);
    }
  }
  const title = {
    home: "Hunter headquarters",
    dungeon: floor.name,
    inventory: "The armory",
    skills: "Awakening",
    shop: "Guild exchange",
    quests: "The contract board",
    ranks: "Hall of hunters",
  }[screen];
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#080C16",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#D9BB7B" />
      </View>
    );
  if (a.user && g && (screen === "home" || screen === "dungeon")) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <MotionContext.Provider value={!performance}>
          <StatusBar barStyle="light-content" />
          <GameWorld
            game={g}
            event={event}
            screen={screen}
            navigate={(next) => navigate(next as Screen)}
            update={a.update}
            fight={fight}
            locked={locked}
            conflict={a.conflict}
            busy={a.busy}
            resolve={(choice) => void a.resolveConflict(choice)}
            logout={() => void a.logout()}
            restart={start}
            sync={a.sync}
            performance={performance}
            setPerformance={setPerformance}
            haptics={haptics}
            setHaptics={setHaptics}
          />
        </MotionContext.Provider>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <MotionContext.Provider value={!performance}>
        <SafeAreaView style={s.safe}>
          <RealmArt index={a.user ? floor.art : 0} height={1400} shade={0.78} />
          <StatusBar barStyle="light-content" />
          <View style={s.header}>
            <View style={s.brandMark}>
              <GameText style={{ color: T.cyan, fontSize: 22 }}>◈</GameText>
            </View>
            <View style={{ flex: 1 }}>
              <GameText
                style={[
                  s.brand,
                  a.user && {
                    fontFamily: "DungeonboundUI",
                    letterSpacing: 0,
                    fontSize: 22,
                  },
                ]}
              >
                {a.user ? title : "DUNGEONBOUND"}
              </GameText>
              <GameText style={s.brandSub}>
                {a.user ? "ASHFALL GUILD" : "D U N G E O N B O U N D"}
              </GameText>
            </View>
            {h && (
              <View style={s.coin}>
                <GameText style={{ color: T.gold, fontWeight: "800" }}>
                  ◉ {h.gold}
                </GameText>
              </View>
            )}
          </View>
          <ScrollView
            ref={scroll}
            contentContainerStyle={[
              s.content,
              screen === "dungeon" && !!g?.enemy && { gap: 8 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {a.loading ? (
              <ActivityIndicator size="large" color={T.cyan} />
            ) : !a.user ? (
              <>
                <View style={s.loginHero}>
                  <RealmArt index={0} height={320} shade={0.12} />
                  <View style={s.heroBottom}>
                    <GameText style={s.eyebrow}>THE GATES HAVE OPENED</GameText>
                    <GameText style={s.heroTitle}>
                      Rise beyond{`\n`}your rank.
                    </GameText>
                    <GameText style={s.heroCopy}>
                      Six cursed floors. One impossible throne.{`\n`}Your
                      awakening starts here.
                    </GameText>
                  </View>
                </View>
                <Card
                  tag="HUNTER IDENTIFICATION"
                  title={register ? "Join the guild" : "Welcome back, hunter"}
                >
                  <TextInput
                    accessibilityLabel="Email address"
                    style={s.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="Email address"
                    placeholderTextColor={T.muted}
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    accessibilityLabel="Password"
                    style={s.input}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    placeholder="Password · 10+ characters"
                    placeholderTextColor={T.muted}
                    value={password}
                    onChangeText={setPassword}
                  />
                  {a.error && <Label color={T.red}>{a.error}</Label>}
                  <Button
                    label={
                      a.busy
                        ? "CONNECTING…"
                        : register
                          ? "CREATE ACCOUNT"
                          : "SIGN IN"
                    }
                    disabled={a.busy || !email.trim() || password.length < 10}
                    onPress={() => {
                      void a
                        .login(email.trim().toLowerCase(), password, register)
                        .then(() => setPassword(""));
                    }}
                  />
                  <Button
                    secondary
                    label={
                      register
                        ? "Have an account? Sign in"
                        : "New hunter? Create account"
                    }
                    onPress={() => {
                      setRegister(!register);
                      a.setError("");
                    }}
                  />
                </Card>
                <GameText style={s.note}>
                  Sign in online once. Continue your adventure offline.
                </GameText>
              </>
            ) : (
              <>
                <View
                  style={[
                    s.sectionHeading,
                    screen === "dungeon" && !!g?.enemy && { display: "none" },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <GameText style={s.eyebrow}>
                      {g
                        ? `HUNTER ${floor.threat}-RANK · CYCLE ${g.campaignWins + 1}`
                        : "CHOOSE YOUR PATH"}
                    </GameText>
                    {!g && <GameText style={s.title}>A hunter awakens</GameText>}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void a.logout()}
                  >
                    <GameText style={s.smallLink}>LOG OUT</GameText>
                  </Pressable>
                </View>
                {a.conflict && (
                  <Card
                    tag="ADVENTURE CONFLICT"
                    title="Two paths. Your choice."
                  >
                    <Label>
                      A different cloud adventure exists. Actions are paused.
                      Keep this device’s adventure or load the cloud one; both
                      copies are backed up locally before your choice is
                      applied.
                    </Label>
                    {a.error && <Label color={T.red}>{a.error}</Label>}
                    <Button
                      label="KEEP THIS ADVENTURE"
                      disabled={a.busy}
                      onPress={() => void a.resolveConflict("local")}
                    />
                    <Button
                      secondary
                      label="LOAD CLOUD ADVENTURE"
                      disabled={a.busy}
                      onPress={() => void a.resolveConflict("cloud")}
                    />
                  </Card>
                )}
                {!g ? (
                  <>
                    <Label>
                      Choose an origin. Each class has five skills to master,
                      unique strengths, and a different way to survive the
                      gates.
                    </Label>
                    {(["Warrior", "Ranger", "Mage"] as HeroClass[]).map(
                      (cls, i) => (
                        <View
                          key={cls}
                          style={[
                            s.classCard,
                            { borderColor: [T.gold, T.green, T.purple][i] },
                          ]}
                        >
                          <View style={s.row}>
                            <View style={{ flex: 1 }}>
                              <GameText
                                style={[
                                  s.eyebrow,
                                  { color: [T.gold, T.green, T.purple][i] },
                                ]}
                              >
                                {
                                  [
                                    "THE IRON VOW",
                                    "THE PHANTOM PATH",
                                    "THE ASTRAL ORDER",
                                  ][i]
                                }
                              </GameText>
                              <GameText style={s.classTitle}>{cls}</GameText>
                              <Label>
                                {
                                  [
                                    "Break armor. Stand your ground. Steal back your life.",
                                    "Poison your mark. Interrupt the kill. Strike from the shadows.",
                                    "Burn. Freeze. Bend the stars. Unmake your enemies.",
                                  ][i]
                                }
                              </Label>
                            </View>
                            <HeroSprite className={cls} size={105} />
                          </View>
                          <View style={s.row}>
                            <GameText style={s.tiny}>
                              {
                                [
                                  "130 HP · 18 ATK · 7 DEF",
                                  "105 HP · 22 ATK · 5 DEF",
                                  "90 HP · 26 ATK · 3 DEF",
                                ][i]
                              }
                            </GameText>
                            <GameText style={s.tiny}>5 SKILLS</GameText>
                          </View>
                          <Button
                            label={`BEGIN AS ${cls.toUpperCase()}`}
                            onPress={() => start(cls)}
                          />
                        </View>
                      ),
                    )}
                  </>
                ) : (
                  <>
                    {screen === "inventory" && (
                      <>
                        <Card tag="LOADOUT" title="Dress for the next gate">
                          <View style={s.row}>
                            <Label color={T.gold}>
                              ⚔ ATK {effectiveStat(g, "weapon")}
                            </Label>
                            <Label color={T.cyan}>
                              ◈ DEF {effectiveStat(g, "armor")}
                            </Label>
                            <Label color={T.green}>SPD {effectiveSpeed(g)}</Label>
                          </View>
                          <Label>Accessories add attack, defense or speed. Higher speed grants up to 25% evasion against slower enemies.</Label>
                          <Label>{g.specialization ? `${g.specialization === "assault" ? "Assault" : "Survival"} mastery active` : "Choose a mastery in the Awakening Tree at level 3."}</Label>
                          <Label>Accessory: {g.inventory.find((item) => item.id === g.equipment.accessory)?.name ?? "None equipped"}</Label>
                          <Label>
                            {g.enemy
                              ? "Finish this encounter before changing equipment."
                              : "Equip your strongest finds. Sell spare gear to fund your next awakening."}
                          </Label>
                        </Card>
                        {g.inventory.length === 0 ? (
                          <Card title="Your armory is empty">
                            <Label>
                              Find loot in treasure rooms and battles, or
                              commission equipment at the guild exchange.
                            </Label>
                            <Button
                              label="OPEN EXCHANGE"
                              onPress={() => navigate("shop")}
                            />
                          </Card>
                        ) : (
                          g.inventory.map((item) => {
                            const equipped = g.equipment[item.slot] === item.id,
                              color = RARITY_COLORS[item.rarity];
                            return (
                              <View
                                key={item.id}
                                style={[s.itemCard, { borderLeftColor: color }]}
                              >
                                <View style={s.row}>
                                  <AbilityIcon
                                    cell={item.slot === "weapon" ? 0 : item.slot === "armor" ? 1 : 13}
                                    size={56}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <GameText style={[s.eyebrow, { color }]}>
                                      {item.rarity.toUpperCase()} /{" "}
                                      {item.slot.toUpperCase()}
                                    </GameText>
                                    <GameText style={s.cardTitle}>
                                      {item.name}
                                    </GameText>
                                  </View>
                                  <GameText style={[s.bonus, { color }]}>
                                    +{item.bonus}
                                    {item.stat ? ` ${item.stat.toUpperCase()}` : ""}
                                  </GameText>
                                </View>
                                <Button
                                  label={equipped ? "EQUIPPED" : "EQUIP ITEM"}
                                  testID={`equip-${item.id}`}
                                  secondary={equipped}
                                  disabled={equipped || !!g.enemy || a.conflict}
                                  onPress={() =>
                                    a.update(equipItem(g, item.id))
                                  }
                                />
                                {!equipped && (
                                  <Button
                                    secondary
                                    label={`SELL · ${Math.max(5, item.bonus * 4)} GOLD`}
                                    disabled={!!g.enemy || a.conflict}
                                    onPress={() =>
                                      a.update(sellItem(g, item.id))
                                    }
                                  />
                                )}
                              </View>
                            );
                          })
                        )}
                        <Card tag="RELIC COLLECTION">
                          <Label>
                            {g.relics.length
                              ? g.relics
                                  .map(
                                    (id) =>
                                      RELICS.find((r) => r.id === id)?.name,
                                  )
                                  .join(" · ")
                              : "Relics await in treasure rooms."}
                          </Label>
                        </Card>
                      </>
                    )}
                    {screen === "skills" && (
                      <SkillTree game={g} locked={!canTrade || a.conflict} update={a.update} />
                    )}
                    {screen === "shop" && (
                      <>
                        <View style={s.marketBanner}>
                          <Sprite cell={2} size={84} idle={false} />
                          <View style={{ flex: 1 }}>
                            <GameText style={s.cardTitle}>
                              The guild always collects.
                            </GameText>
                            <Label>
                              Spend earned gold. No real-money purchases.
                            </Label>
                          </View>
                        </View>
                        {!canTrade && (
                          <Label color={T.gold}>
                            Finish the encounter or room choice before trading.
                          </Label>
                        )}
                        <View style={s.row}>
                          <View style={{ flex: 1 }}>
                            <Button
                              secondary={shopTab !== "supplies"}
                              label="SUPPLIES & GEAR"
                              onPress={() => setShopTab("supplies")}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button
                              secondary={shopTab !== "skills"}
                              label="SKILL TOMES"
                              onPress={() => setShopTab("skills")}
                            />
                          </View>
                        </View>
                        {shopTab === "supplies"
                          ? SHOP.map((item) => (
                              <View key={item.id} style={s.itemCard}>
                                <View style={s.row}>
                                  <AbilityIcon
                                    cell={
                                      item.id.includes("weapon")
                                        ? 0
                                        : item.id.includes("armor")
                                          ? 1
                                          : item.id === "potion"
                                            ? 15
                                            : item.id === "ether"
                                              ? 12
                                              : 13
                                    }
                                    size={56}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <GameText style={s.cardTitle}>
                                      {item.name}
                                    </GameText>
                                    <Label>{item.description}</Label>
                                  </View>
                                </View>
                                <Button
                                  secondary
                                  testID={`buy-${item.id}`}
                                  label={`BUY ${item.name.toUpperCase()} · ${item.price} GOLD`}
                                  disabled={
                                    !canTrade ||
                                    h!.gold < item.price ||
                                    h!.level < (item.level ?? 1) ||
                                    a.conflict
                                  }
                                  onPress={() => a.update(buyItem(g, item.id))}
                                />
                                {item.level && <Label>Requires level {item.level}</Label>}
                              </View>
                            ))
                          : SKILLS.filter(
                              (sk) =>
                                sk.className === h!.className && sk.price > 0,
                            ).map((sk) => (
                              <Card
                                key={sk.id}
                                tag={`LEVEL ${sk.level} · ${sk.mana} MP`}
                                title={`${sk.icon} ${sk.name}`}
                              >
                                <Label>{sk.description}</Label>
                                <Button
                                  label={
                                    g.skills.includes(sk.id)
                                      ? "ALREADY LEARNED"
                                      : `BUY TOME · ${sk.price} GOLD`
                                  }
                                  disabled={
                                    g.skills.includes(sk.id) ||
                                    !canTrade ||
                                    h!.level < sk.level ||
                                    skillLockReason(g, sk.id) !== null ||
                                    h!.gold < sk.price ||
                                    a.conflict
                                  }
                                  onPress={() => a.update(buyItem(g, sk.id))}
                                />
                                {!g.skills.includes(sk.id) && <Label>{skillLockReason(g, sk.id) ?? "Ready to learn"}</Label>}
                              </Card>
                            ))}
                      </>
                    )}
                    {screen === "quests" && (
                      <>
                        <Button
                          secondary
                          label="HALL OF HUNTERS →"
                          onPress={() => {
                            navigate("ranks");
                            void board("load");
                          }}
                        />
                        <GameText style={s.subheading}>
                          CONTRACTS / {g.claimedQuests.length} OF{" "}
                          {QUESTS.length}
                        </GameText>
                        {QUESTS.map((q) => {
                          const value = questProgress(g, q.metric),
                            done = g.claimedQuests.includes(q.id);
                          return (
                            <Card
                              key={q.id}
                              tag={
                                done
                                  ? "CONTRACT COMPLETE"
                                  : value >= q.target
                                    ? "READY TO CLAIM"
                                    : "GUILD CONTRACT"
                              }
                              title={q.name}
                            >
                              <View style={s.row}>
                                <Label>{q.text}</Label>
                                <GameText style={{ color: T.cyan }}>
                                  {Math.min(value, q.target)}/{q.target}
                                </GameText>
                              </View>
                              <Bar
                                value={value}
                                max={q.target}
                                color={done ? T.green : T.cyan}
                              />
                              <GameText style={s.tiny}>
                                REWARD / {q.gold} GOLD + {q.xp} XP
                              </GameText>
                              <Button
                                secondary
                                label={done ? "CLAIMED ✓" : "CLAIM CONTRACT"}
                                disabled={
                                  done || value < q.target || a.conflict
                                }
                                onPress={() => a.update(claimQuest(g, q.id))}
                              />
                            </Card>
                          );
                        })}
                        <Card tag="HUNTER TITLES">
                          <Label>
                            {g.achievements.length
                              ? g.achievements.map((x) => `✧ ${x}`).join("\n")
                              : "Your first title awaits your first victory."}
                          </Label>
                        </Card>
                      </>
                    )}
                    {screen === "ranks" && (
                      <>
                        <Card
                          tag="COMMUNITY RECORDS"
                          title="Leave your hunter’s mark"
                        >
                          <Label>
                            Publishing is optional. Only your public alias and
                            adventure stats appear. These are player-save
                            records, not an anti-cheat verified competition.
                          </Label>
                          <TextInput
                            accessibilityLabel="Public hunter name"
                            style={s.input}
                            placeholder="Public hunter name"
                            placeholderTextColor={T.muted}
                            value={alias}
                            onChangeText={setAlias}
                            maxLength={24}
                          />
                          <Button
                            label="PUBLISH MY RECORD"
                            disabled={
                              boardBusy ||
                              !/^[A-Za-z0-9 _-]{3,24}$/.test(alias.trim())
                            }
                            onPress={() => void board("publish")}
                          />
                          <Button
                            secondary
                            label="REMOVE MY RECORD"
                            disabled={boardBusy}
                            onPress={() => void board("remove")}
                          />
                          <Button
                            secondary
                            label="REFRESH RECORDS"
                            disabled={boardBusy}
                            onPress={() => void board("load")}
                          />
                          {boardMessage && <Label>{boardMessage}</Label>}
                        </Card>
                        {records.length === 0 ? (
                          <Label>No published records yet.</Label>
                        ) : (
                          records.map((r, i) => (
                            <View key={`${r.alias}-${i}`} style={s.floorRow}>
                              <GameText style={s.metricNumber}>
                                {String(i + 1).padStart(2, "0")}
                              </GameText>
                              <View style={{ flex: 1 }}>
                                <GameText style={s.cardTitle}>
                                  {r.alias}
                                </GameText>
                                <GameText style={s.tiny}>
                                  LV.{r.level} · {r.bosses} guardians
                                </GameText>
                              </View>
                              <GameText style={{ color: T.gold }}>
                                {r.score}
                              </GameText>
                            </View>
                          ))
                        )}
                      </>
                    )}
                    <View style={s.syncLine}>
                      <View
                        style={[
                          s.syncDot,
                          {
                            backgroundColor:
                              a.sync === "Saved to cloud" ? T.green : T.gold,
                          },
                        ]}
                      />
                      <GameText style={s.tiny}>{a.sync}</GameText>
                    </View>
                  </>
                )}
              </>
            )}
            <GameText style={s.footer}>DUNGEONBOUND</GameText>
          </ScrollView>
          {a.user && g && (
            <View style={s.tabs}>
              {(
                [
                  ["home", "⌂", "HUB"],
                  ["dungeon", "⚔", "GATE"],
                  ["inventory", "◈", "GEAR"],
                  ["skills", "✦", "SKILLS"],
                  ["shop", "⚖", "MARKET"],
                  ["quests", "☷", "GUILD"],
                ] as [Screen, string, string][]
              ).map(([id, icon, label]) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: screen === id }}
                  accessibilityLabel={label}
                  key={id}
                  onPress={() => navigate(id)}
                  style={[s.tab, screen === id && s.tabActive]}
                >
                  <GameText
                    style={{
                      fontSize: 20,
                      color: screen === id ? T.cyan : T.muted,
                    }}
                  >
                    {icon}
                  </GameText>
                  <GameText
                    style={[s.tabLabel, screen === id && { color: T.cyan }]}
                  >
                    {label}
                  </GameText>
                </Pressable>
              ))}
            </View>
          )}
        </SafeAreaView>
      </MotionContext.Provider>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: T.line,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: "#397280",
    backgroundColor: "#122735",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  brand: { color: T.text, fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  brandSub: { color: T.muted, fontSize: 7, marginTop: 4 },
  coin: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#28251E",
  },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  title: {
    color: T.text,
    fontSize: 25,
    fontFamily: "DungeonboundUI",
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: -0.7,
  },
  eyebrow: {
    color: T.cyan,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 2,
    padding: 17,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DungeonboundUI",
    fontWeight: "800",
    color: T.text,
  },
  body: { fontSize: 13, lineHeight: 21, color: T.muted },
  button: {
    minHeight: 47,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 2,
    backgroundColor: T.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: "#292127",
    borderWidth: 1,
    borderColor: "#8C7148",
  },
  buttonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#07131C",
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 18,
  },
  input: {
    fontFamily: "DungeonboundUI",
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: "#8C7148",
    padding: 14,
    borderRadius: 2,
    color: T.text,
    fontSize: 14,
  },
  note: { fontSize: 11, lineHeight: 17, color: T.muted, textAlign: "center" },
  footer: {
    color: "#4D607B",
    fontSize: 8,
    letterSpacing: 2,
    textAlign: "center",
    padding: 12,
  },
  loginHero: {
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.line,
  },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
    gap: 10,
    backgroundColor: "#08101BBA",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 38,
  },
  heroCopy: { color: "#C6D7E5", fontSize: 12, lineHeight: 20 },
  smallLink: { color: T.muted, fontSize: 9, fontWeight: "800" },
  classCard: {
    backgroundColor: T.panel,
    borderWidth: 1,
    borderRadius: 2,
    padding: 18,
    gap: 16,
  },
  classTitle: {
    color: T.text,
    fontSize: 31,
    fontWeight: "900",
    marginVertical: 8,
  },
  tiny: { fontSize: 10, lineHeight: 17, color: T.muted },
  hud: {
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 2,
    padding: 13,
    gap: 8,
  },
  hudName: { color: T.text, fontSize: 12, fontWeight: "800" },
  bar: {
    height: 5,
    backgroundColor: "#28334A",
    borderRadius: 5,
    overflow: "hidden",
  },
  gateHero: {
    height: 245,
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.line,
  },
  gateText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 9,
    backgroundColor: "#0710209C",
  },
  metrics: {
    flexDirection: "row",
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 2,
    paddingVertical: 17,
  },
  metric: { flex: 1, alignItems: "center", gap: 5 },
  metricNumber: { fontSize: 26, fontWeight: "800", color: T.text },
  metricLabel: { fontSize: 8, color: T.muted, letterSpacing: 0.8 },
  subheading: {
    fontSize: 12,
    color: T.text,
    fontWeight: "900",
    letterSpacing: 1,
  },
  floorRow: {
    backgroundColor: T.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    padding: 14,
  },
  floorNumber: {
    height: 38,
    width: 38,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  route: { flexDirection: "row", gap: 4 },
  node: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 8,
    backgroundColor: T.panel,
    gap: 3,
  },
  nodeCleared: { borderColor: "#3B6B62" },
  nodeNumber: { fontSize: 8, color: T.muted },
  enemyInfo: {
    backgroundColor: T.panel,
    borderRadius: 12,
    padding: 13,
    gap: 9,
  },
  intent: { fontSize: 11, lineHeight: 17, fontWeight: "700" },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  skillGrid: { gap: 8, flexDirection: "row", flexWrap: "wrap" },
  skillAction: { minWidth: "46%", flexGrow: 1 },
  feedLead: { fontSize: 13, color: T.cyan, lineHeight: 20 },
  feed: { fontSize: 11, color: T.muted, lineHeight: 17 },
  itemCard: {
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.line,
    borderLeftWidth: 3,
    borderLeftColor: T.gold,
    borderRadius: 2,
    padding: 16,
    gap: 13,
  },
  itemIcon: { fontSize: 29, color: T.gold, width: 40, textAlign: "center" },
  bonus: { fontSize: 26, fontWeight: "900" },
  marketBanner: {
    backgroundColor: "#242131",
    borderWidth: 1,
    borderColor: "#5C4965",
    borderRadius: 2,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
  },
  syncLine: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
  },
  syncDot: { width: 5, height: 5, borderRadius: 3 },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderColor: T.line,
    backgroundColor: "#141014F5",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 2,
  },
  tabActive: { backgroundColor: "#4A3925" },
  tabLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: T.muted,
    letterSpacing: 0.4,
  },
});
