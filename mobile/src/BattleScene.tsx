import GameText from "./GameText";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  StyleSheet,
  View,
} from "react-native";
import type { Action, Enemy, Game, HeroClass } from "./game";
import { enemyCell, heroCell, heroTint } from "./visuals";
import RealmArt from "./RealmArt";
import { FLOORS } from "./content";
import { MotionContext } from "./motion";
import HeroSprite from "./HeroSprite";
import { combatSequence, battlefieldActorSize, type HeroPose } from "./appearance";
import { useWindowDimensions } from "react-native";
import { SKILLS } from "./content";

const atlas = require("../assets/dungeon-atlas.png");
export type BattleEvent = {
  id: number;
  action: Action;
  enemy: Enemy;
  damage: number;
  received: number;
  healed: number;
  defeated: boolean;
  skillId?: string;
  evaded?: boolean;
};

function useMotion(combat = false) {
  const enabled = useContext(MotionContext);
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const accessibility = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const lifecycle = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => {
      mounted = false;
      accessibility.remove();
      lifecycle.remove();
    };
  }, []);
  return (enabled || combat) && !reduced && active;
}

export function Sprite({
  cell,
  size = 112,
  idle = true,
  monster = false,
}: {
  cell: number;
  size?: number;
  idle?: boolean;
  monster?: boolean;
}) {
  const motion = useMotion();
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion || !idle) {
      bob.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: cell === 5 ? 380 : 1100,
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: cell === 5 ? 380 : 1100,
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      bob.setValue(0);
    };
  }, [motion, idle, cell, bob]);
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        transform: [
          {
            translateY:
              (monster ? 0 : [0.02, 0.08, 0.1][Math.floor(cell / 4)]) * size,
          },
          {
            translateY: bob.interpolate({
              inputRange: [0, 1],
              outputRange: [0, cell === 5 ? -9 : -3],
            }),
          },
        ],
      }}
    >
      <View style={{ width: size, height: size, overflow: "hidden" }}>
        <Image
          source={monster ? require("../assets/monsters-v2.png") : atlas}
          resizeMode="stretch"
          fadeDuration={0}
          style={{
            position: "absolute",
            width: size * 4,
            height: size * (monster ? 4 : 3),
            left: -(cell % 4) * size,
            top: -Math.floor(cell / 4) * size,
          }}
        />
      </View>
    </Animated.View>
  );
}

export function HeroPortrait({ className }: { className: HeroClass }) {
  return (
    <View
      style={styles.portrait}
      accessible
      accessibilityLabel={`${className} character portrait`}
    >
      <View
        style={[styles.portraitGlow, { backgroundColor: heroTint[className] }]}
      />
      <Sprite cell={heroCell[className]} size={120} />
      <View style={styles.portraitRule} />
    </View>
  );
}

export default function BattleScene({
  game,
  event,
  immersive = false,
  height = 320,
}: {
  game: Game;
  event: BattleEvent | null;
  immersive?: boolean;
  height?: number;
}) {
  const motion = useMotion(true);
  const cinematic = useContext(MotionContext);
  const heroX = useRef(new Animated.Value(0)).current;
  const enemyX = useRef(new Animated.Value(0)).current;
  const effect = useRef(new Animated.Value(0)).current;
  const [fallen, setFallen] = useState<Enemy | null>(null);
  const [effectVisible, setEffectVisible] = useState(false);
  const [pose, setPose] = useState<HeroPose>("idle");
  const { width } = useWindowDimensions();
  const actorSize = immersive
    ? battlefieldActorSize(width, height)
    : cinematic
      ? 124
      : 100;
  const reactionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    reactionTimers.current.forEach(clearTimeout);
    if (!event) {
      setPose("idle");
      return;
    }
    const sequence=combatSequence(event.action,event.skillId,game.hero.className,cinematic,!motion,event.received>0);
    setPose(sequence[0].pose);
    for(const frame of sequence.slice(1))reactionTimers.current.push(setTimeout(()=>setPose(frame.pose),frame.at));
    return () => reactionTimers.current.forEach(clearTimeout);
  }, [event, cinematic, motion, game.hero.className]);
  useEffect(() => {
    if (!event) return;
    setFallen(event.defeated ? event.enemy : null);
    setEffectVisible(true);
    heroX.setValue(0);
    enemyX.setValue(0);
    effect.setValue(0);
    const timer = setTimeout(
      () => {
        setFallen(null);
        setEffectVisible(false);
      },
      cinematic ? 1050 : 450,
    );
    if (!motion) return () => clearTimeout(timer);
    const lunge = (value: Animated.Value, direction: number) =>
      Animated.sequence([
        Animated.timing(value, {
          toValue: direction,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.spring(value, {
          toValue: 0,
          speed: 22,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]);
    const animation = Animated.parallel([
      Animated.sequence([
        event.action === "attack" || event.action === "skill"
          ? lunge(heroX, cinematic ? 54 : 28)
          : Animated.delay(100),
        event.received > 0
          ? lunge(enemyX, cinematic ? -38 : -20)
          : Animated.delay(0),
      ]),
      Animated.timing(effect, {
        toValue: 1,
        duration: cinematic ? 1000 : 400,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [event, motion, cinematic, heroX, enemyX, effect]);

  const enemy = game.enemy ?? fallen;
  const skillEffect = SKILLS.find(
    (skill) => skill.id === event?.skillId,
  )?.effect;
  const skillColor =
    skillEffect === "poison"
      ? "#98E66B"
      : skillEffect === "burn"
        ? "#FF964A"
        : skillEffect === "stun"
          ? "#9FE5FF"
          : skillEffect === "drain"
            ? "#EF6D88"
            : skillEffect === "pierce"
              ? "#FFD68E"
              : "#C4A6FF";
  const room = game.rooms[Math.max(0, game.roomIndex)];
  const boss = enemy?.boss || room.kind === "boss";
  const accent = boss ? "#FF986C" : "#8BD9D0";
  const float = motion
    ? effect.interpolate({ inputRange: [0, 1], outputRange: [0, -25] })
    : 0;
  const fade = motion
    ? effect.interpolate({
        inputRange: [0, 0.15, 0.8, 1],
        outputRange: [0, 1, 1, 0],
      })
    : 1;
  const status =
    game.hero.hp <= 0
      ? "FALLEN"
      : game.ended
        ? "DUNGEON CONQUERED"
        : enemy
          ? boss
            ? "BOSS ENCOUNTER"
            : "YOUR TURN"
          : game.roomIndex < 0
            ? "THE ASHEN GATE"
            : "A MOMENT OF RESPITE";
  return (
    <View
      style={[
        styles.scene,
        !cinematic && { height: 190 },
        boss && styles.bossScene,
        immersive && {
          height,
          backgroundColor: "transparent",
          borderWidth: 0,
          borderRadius: 0,
          overflow: "visible",
        },
      ]}
      accessibilityLabel={`${game.hero.className} in ${room.kind} room${enemy ? ` facing ${enemy.name}` : ""}`}
    >
      <View style={[styles.sceneHeading, immersive && { display: "none" }]}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <GameText style={[styles.eyebrow, { color: accent }]}>
          {status}
        </GameText>
        <GameText style={styles.roomLabel}>
          {Math.max(0, game.roomIndex + 1)} / 8
        </GameText>
      </View>
      {!immersive && (
        <RealmArt
          index={FLOORS[game.floor - 1].art}
          height={cinematic ? 300 : 190}
          shade={0.15}
        />
      )}
      {effectVisible && event && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: immersive ? Math.max(95, height - actorSize - 86) : 48,
            left: 0,
            right: 0,
            alignItems: "center",
            opacity: fade,
            zIndex: 10,
          }}
        >
          <GameText
            style={{
              color: event.defeated ? "#F9D18A" : "#D5C3FF",
              fontSize: 13,
              fontWeight: "900",
              letterSpacing: 3,
              textShadowColor: "#050913",
              textShadowRadius: 5,
            }}
          >
            {event.defeated
              ? "SHADOW ELIMINATED"
              : event.evaded
                ? "SWIFT EVADE"
              : event.action === "skill"
                ? "AWAKENING RELEASE"
                : event.action === "defend"
                  ? "IRON GUARD"
                  : event.action === "potion"
                    ? "VITALITY RESTORED"
                    : event.action === "ether"
                      ? "MANA RESTORED"
                      : "RIFT STRIKE"}
          </GameText>
        </Animated.View>
      )}
      {cinematic &&
        motion &&
        effectVisible &&
        event &&
        event.damage > 0 &&
        Array.from({ length: 8 }, (_, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              zIndex: 8,
              left: "72%",
              top: 164,
              width: 3,
              height: 13,
              backgroundColor: event.action === "skill" ? "#C4A6FF" : "#FFE3A5",
              borderRadius: 3,
              opacity: fade,
              transform: [
                {
                  translateX: effect.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos((i * Math.PI) / 4) * 70],
                  }),
                },
                {
                  translateY: effect.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin((i * Math.PI) / 4) * 70],
                  }),
                },
                { rotate: `${i * 45}deg` },
              ],
            }}
          />
        ))}
      <View
        style={[
          styles.fighters,
          !cinematic && { top: 42 },
          immersive && { top: Math.max(25, height - actorSize - 40) },
        ]}
      >
        <View
          style={[
            styles.fighter,
            !cinematic && { height: 120 },
            immersive && { height: actorSize + 24 },
          ]}
        >
          <View style={styles.shadow} />
          <Animated.View
            style={{
              transform: [
                { translateX: heroX },
                { rotate: game.hero.hp <= 0 ? "-65deg" : "0deg" },
              ],
              opacity: game.hero.hp <= 0 ? 0.5 : 1,
            }}
          >
            <HeroSprite game={game} pose={pose} size={actorSize} swing={motion?effect:undefined} />
          </Animated.View>
          {effectVisible && event && (
            <Animated.View
              style={[
                styles.heroEffect,
                { opacity: fade, transform: [{ translateY: float }] },
              ]}
            >
              <GameText
                style={[
                  styles.effectText,
                  {
                    color:
                      event.action === "potion"
                        ? "#9FF3AD"
                        : event.action === "defend"
                          ? "#9DDCFF"
                          : "#FFACAD",
                  },
                ]}
              >
                {event.action === "potion"
                  ? `+${event.healed} HP`
                  : event.action === "defend"
                    ? "GUARD"
                    : event.received
                      ? `−${event.received}`
                      : "READY"}
              </GameText>
            </Animated.View>
          )}
          {effectVisible &&
            (event?.action === "defend" || event?.skillId === "w-aegis") && (
              <View style={styles.shield} />
            )}
          {effectVisible &&
            (event?.action === "potion" || (event?.healed ?? 0) > 0) && (
              <View style={styles.healRing}>
                <GameText style={styles.healPlus}>+</GameText>
              </View>
            )}
          <GameText
            style={[
              styles.fighterName,
              { color: heroTint[game.hero.className] },
            ]}
          >
            {game.hero.className.toUpperCase()}
          </GameText>
        </View>
        <View
          style={[
            styles.fighter,
            !cinematic && { height: 120 },
            immersive && { height: actorSize + 24 },
          ]}
        >
          <View style={styles.shadow} />
          <Animated.View
            style={{
              transform: [
                { translateX: enemyX },
                {
                  rotate:
                    motion && effectVisible && event && event.damage > 0
                      ? effect.interpolate({
                          inputRange: [0, 0.12, 0.25, 0.4, 1],
                          outputRange: [
                            "0deg",
                            "-6deg",
                            "4deg",
                            "0deg",
                            "0deg",
                          ],
                        })
                      : "0deg",
                },
              ],
              opacity: fallen && !game.enemy ? 0.35 : 1,
            }}
          >
            <Sprite
              cell={
                enemy
                  ? enemyCell(enemy.name)
                  : room.kind === "treasure"
                    ? 10
                    : 11
              }
              monster={!!enemy}
              size={
                immersive
                  ? battlefieldActorSize(width, height, !!enemy?.boss)
                  : cinematic
                    ? enemy?.boss
                      ? 152
                      : 132
                    : enemy?.boss
                      ? 120
                      : 100
              }
              idle={!!enemy && !fallen}
            />
          </Animated.View>
          {effectVisible && event && event.damage > 0 && (
            <Animated.View
              style={[
                styles.damage,
                { opacity: fade, transform: [{ translateY: float }] },
              ]}
            >
              <GameText
                style={[
                  styles.effectText,
                  { color: event.action === "skill" ? "#BFC0FF" : "#FFE3A5" },
                ]}
              >
                {event.action === "skill" ? "✦ " : ""}−{event.damage}
              </GameText>
            </Animated.View>
          )}
          {effectVisible && event?.action === "skill" && (
            <Animated.View
              style={[
                styles.spell,
                {
                  borderColor: skillColor,
                  backgroundColor: `${skillColor}44`,
                  borderRadius: skillEffect === "burn" ? 8 : 40,
                },
                {
                  opacity: fade,
                  transform: [
                    {
                      scale: motion
                        ? effect.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.4, 1.7],
                          })
                        : 1,
                    },
                  ],
                },
              ]}
            />
          )}
          {effectVisible && event?.action === "attack" && (
            <Animated.View
              style={[
                styles.slash,
                { opacity: fade },
                game.hero.className === "Ranger" && {
                  width: 70,
                  height: 3,
                  backgroundColor: "#BCE9A0",
                  transform: [{ rotate: "0deg" }],
                },
                game.hero.className === "Mage" && {
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#A2DDFB",
                  transform: [{ rotate: "0deg" }],
                },
              ]}
            />
          )}
          <GameText
            numberOfLines={1}
            style={[styles.fighterName, { color: accent }]}
          >
            {enemy
              ? enemy.name.toUpperCase()
              : game.ended
                ? "VICTORY"
                : room.kind === "treasure"
                  ? "TREASURE"
                  : "THE DEPTHS AWAIT"}
          </GameText>
        </View>
      </View>
      <View style={[styles.caption, immersive && { display: "none" }]}>
        <GameText style={styles.captionText}>
          {game.ended
            ? "GUARDIAN DEFEATED // Ascension unlocked"
            : enemy
              ? "READ THE INTENT // Shape your next move"
              : FLOORS[game.floor - 1].region}
        </GameText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  portrait: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10182B",
    borderRadius: 12,
    overflow: "hidden",
  },
  portraitGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.08,
  },
  portraitRule: {
    position: "absolute",
    bottom: 9,
    width: 70,
    height: 2,
    backgroundColor: "#465069",
  },
  scene: {
    height: 300,
    backgroundColor: "#141C2B",
    borderWidth: 1,
    borderColor: "#3D4F5D",
    borderRadius: 16,
    overflow: "hidden",
  },
  bossScene: { borderColor: "#9A583E", backgroundColor: "#251C27" },
  sceneHeading: {
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    gap: 7,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  eyebrow: { flex: 1, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  roomLabel: { color: "#8D9AB0", fontSize: 10 },
  brickwork: {
    position: "absolute",
    top: 42,
    left: -20,
    right: -20,
    height: 115,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    opacity: 0.5,
  },
  brick: {
    width: "15.8%",
    height: 33,
    backgroundColor: "#20293B",
    borderWidth: 1,
    borderColor: "#2A3545",
    borderRadius: 2,
  },
  arch: {
    position: "absolute",
    width: 90,
    height: 136,
    alignSelf: "center",
    top: 46,
    backgroundColor: "#2B3445",
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    padding: 9,
  },
  archInner: {
    flex: 1,
    backgroundColor: "#0B101E",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
  },
  torch: { position: "absolute", top: 66, alignItems: "center" },
  flameHalo: {
    position: "absolute",
    top: -13,
    width: 44,
    height: 48,
    backgroundColor: "#F7A34B",
    opacity: 0.06,
    borderRadius: 24,
  },
  flame: {
    width: 10,
    height: 18,
    borderRadius: 6,
    backgroundColor: "#FFD17E",
    borderWidth: 2,
    borderColor: "#CB7541",
    transform: [{ rotate: "12deg" }],
  },
  torchStem: { height: 14, width: 5, backgroundColor: "#76574B" },
  floor: {
    position: "absolute",
    bottom: 33,
    width: "100%",
    height: 54,
    backgroundColor: "#242D3C",
    borderTopWidth: 2,
    borderColor: "#3E4654",
  },
  floorSeam: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    height: 1,
    backgroundColor: "#313C4C",
  },
  fighters: {
    position: "absolute",
    top: 103,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fighter: {
    width: "47%",
    height: 148,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  shadow: {
    position: "absolute",
    bottom: 21,
    width: 74,
    height: 12,
    borderRadius: 40,
    backgroundColor: "#080D17",
    opacity: 0.55,
  },
  fighterName: {
    height: 20,
    maxWidth: "100%",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
    paddingTop: 5,
  },
  heroEffect: { position: "absolute", top: 0, zIndex: 4 },
  damage: { position: "absolute", top: 0, zIndex: 4 },
  effectText: {
    fontSize: 19,
    fontWeight: "900",
    textShadowColor: "#080D17",
    textShadowRadius: 3,
  },
  shield: {
    position: "absolute",
    right: 16,
    bottom: 35,
    width: 31,
    height: 53,
    borderWidth: 3,
    borderColor: "#94D9FF",
    borderRadius: 17,
    backgroundColor: "#86CFFF33",
  },
  healRing: {
    position: "absolute",
    top: 22,
    width: 83,
    height: 83,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#9AE2B1",
    alignItems: "center",
  },
  healPlus: { color: "#ABF8BA", fontWeight: "900", fontSize: 28 },
  spell: {
    position: "absolute",
    top: 39,
    width: 63,
    height: 63,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#C4A6FF",
    backgroundColor: "#8871D544",
  },
  slash: {
    position: "absolute",
    top: 35,
    width: 4,
    height: 71,
    borderRadius: 4,
    backgroundColor: "#FFE3A5",
    transform: [{ rotate: "33deg" }],
  },
  caption: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 33,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D1422",
  },
  captionText: {
    fontSize: 9,
    color: "#9AAAC2",
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
