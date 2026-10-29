import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, StyleSheet, Text, View } from 'react-native';
import type { Action, Enemy, Game, HeroClass } from './game';
import { enemyCell, heroCell, heroTint } from './visuals';

const atlas = require('../assets/dungeon-atlas.png');
export type BattleEvent = { id: number; action: Action; enemy: Enemy; damage: number; received: number; healed: number; defeated: boolean };

function useMotion() {
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const accessibility = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const lifecycle = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { mounted = false; accessibility.remove(); lifecycle.remove(); };
  }, []);
  return !reduced && active;
}

export function Sprite({ cell, size = 112, idle = true }: { cell: number; size?: number; idle?: boolean }) {
  const motion = useMotion();
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion || !idle) { bob.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: cell === 5 ? 380 : 1100, isInteraction: false, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: cell === 5 ? 380 : 1100, isInteraction: false, useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); bob.setValue(0); };
  }, [motion, idle, cell, bob]);
  return <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, transform: [{ translateY: [0.02, .08, .1][Math.floor(cell / 4)] * size }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, cell === 5 ? -9 : -3] }) }] }}>
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image source={atlas} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', width: size * 4, height: size * 3, left: -(cell % 4) * size, top: -Math.floor(cell / 4) * size }} />
    </View>
  </Animated.View>;
}

export function HeroPortrait({ className }: { className: HeroClass }) {
  return <View style={styles.portrait} accessible accessibilityLabel={`${className} character portrait`}>
    <View style={[styles.portraitGlow, { backgroundColor: heroTint[className] }]} />
    <Sprite cell={heroCell[className]} size={120} />
    <View style={styles.portraitRule} />
  </View>;
}

export default function BattleScene({ game, event }: { game: Game; event: BattleEvent | null }) {
  const motion = useMotion();
  const heroX = useRef(new Animated.Value(0)).current;
  const enemyX = useRef(new Animated.Value(0)).current;
  const effect = useRef(new Animated.Value(0)).current;
  const [fallen, setFallen] = useState<Enemy | null>(null);
  const [effectVisible, setEffectVisible] = useState(false);
  useEffect(() => {
    if (!event) return;
    setFallen(event.defeated ? event.enemy : null);
    setEffectVisible(true);
    heroX.setValue(0); enemyX.setValue(0); effect.setValue(0);
    const timer = setTimeout(() => { setFallen(null); setEffectVisible(false); }, motion ? 1050 : 800);
    if (!motion) return () => clearTimeout(timer);
    const lunge = (value: Animated.Value, direction: number) => Animated.sequence([
      Animated.timing(value, { toValue: direction, duration: 130, useNativeDriver: true }),
      Animated.spring(value, { toValue: 0, speed: 22, bounciness: 4, useNativeDriver: true }),
    ]);
    const animation = Animated.parallel([
      Animated.sequence([
        event.action === 'attack' || event.action === 'skill' ? lunge(heroX, 18) : Animated.delay(260),
        event.received > 0 ? lunge(enemyX, -16) : Animated.delay(0),
      ]),
      Animated.timing(effect, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]);
    animation.start();
    return () => { clearTimeout(timer); animation.stop(); };
  }, [event, motion, heroX, enemyX, effect]);

  const enemy = game.enemy ?? fallen;
  const room = game.rooms[Math.max(0, game.roomIndex)];
  const boss = enemy?.boss || room.kind === 'boss';
  const accent = boss ? '#FF986C' : '#8BD9D0';
  const float = motion ? effect.interpolate({ inputRange: [0, 1], outputRange: [0, -25] }) : 0;
  const fade = motion ? effect.interpolate({ inputRange: [0, .15, .8, 1], outputRange: [0, 1, 1, 0] }) : 1;
  const status = game.hero.hp <= 0 ? 'FALLEN' : game.ended ? 'DUNGEON CONQUERED' : enemy ? boss ? 'BOSS ENCOUNTER' : 'YOUR TURN' : game.roomIndex < 0 ? 'THE ASHEN GATE' : 'A MOMENT OF RESPITE';
  return <View style={[styles.scene, boss && styles.bossScene]} accessibilityLabel={`${game.hero.className} in ${room.kind} room${enemy ? ` facing ${enemy.name}` : ''}`}>
    <View style={styles.sceneHeading}><View style={[styles.dot, { backgroundColor: accent }]} /><Text style={[styles.eyebrow, { color: accent }]}>{status}</Text><Text style={styles.roomLabel}>{Math.max(0, game.roomIndex + 1)} / 8</Text></View>
    <View style={styles.brickwork}>{Array.from({ length: 18 }, (_, i) => <View key={i} style={[styles.brick, i % 4 === 0 && { backgroundColor: '#252C3D' }]} />)}</View>
    <View style={styles.arch}><View style={styles.archInner} /></View>
    {[false, true].map(right => <View key={String(right)} style={[styles.torch, right ? { right: 18 } : { left: 18 }]}><View style={styles.flameHalo} /><View style={styles.flame} /><View style={styles.torchStem} /></View>)}
    <View style={styles.floor} /><View style={styles.floorSeam} />
    <View style={styles.fighters}>
      <View style={styles.fighter}>
        <View style={styles.shadow} />
        <Animated.View style={{ transform: [{ translateX: heroX }, { rotate: game.hero.hp <= 0 ? '-65deg' : '0deg' }], opacity: game.hero.hp <= 0 ? .5 : 1 }}><Sprite cell={heroCell[game.hero.className]} size={124} idle={game.hero.hp > 0} /></Animated.View>
        {effectVisible && event && <Animated.View style={[styles.heroEffect, { opacity: fade, transform: [{ translateY: float }] }]}>
          <Text style={[styles.effectText, { color: event.action === 'potion' ? '#9FF3AD' : event.action === 'defend' ? '#9DDCFF' : '#FFACAD' }]}>{event.action === 'potion' ? `+${event.healed} HP` : event.action === 'defend' ? 'GUARD' : event.received ? `−${event.received}` : 'READY'}</Text>
        </Animated.View>}
        {effectVisible && event?.action === 'defend' && <View style={styles.shield} />}
        {effectVisible && event?.action === 'potion' && <View style={styles.healRing}><Text style={styles.healPlus}>+</Text></View>}
        <Text style={[styles.fighterName, { color: heroTint[game.hero.className] }]}>{game.hero.className.toUpperCase()}</Text>
      </View>
      <View style={styles.fighter}>
        <View style={styles.shadow} />
        <Animated.View style={{ transform: [{ translateX: enemyX }, { rotate: motion && effectVisible && event && event.damage > 0 ? effect.interpolate({ inputRange: [0, .12, .25, .4, 1], outputRange: ['0deg', '-6deg', '4deg', '0deg', '0deg'] }) : '0deg' }], opacity: fallen && !game.enemy ? .35 : 1 }}>
          <Sprite cell={enemy ? enemyCell(enemy.name) : room.kind === 'treasure' ? 10 : 11} size={124} idle={!!enemy && !fallen} />
        </Animated.View>
        {effectVisible && event && event.damage > 0 && <Animated.View style={[styles.damage, { opacity: fade, transform: [{ translateY: float }] }]}><Text style={[styles.effectText, { color: event.action === 'skill' ? '#BFC0FF' : '#FFE3A5' }]}>{event.action === 'skill' ? '✦ ' : ''}−{event.damage}</Text></Animated.View>}
        {effectVisible && event?.action === 'skill' && <Animated.View style={[styles.spell, { opacity: fade, transform: [{ scale: motion ? effect.interpolate({ inputRange: [0, 1], outputRange: [.4, 1.7] }) : 1 }] }]} />}
        {effectVisible && event?.action === 'attack' && <Animated.View style={[styles.slash, { opacity: fade }]} />}
        <Text numberOfLines={1} style={[styles.fighterName, { color: accent }]}>{enemy ? enemy.name.toUpperCase() : game.ended ? 'VICTORY' : room.kind === 'treasure' ? 'TREASURE' : 'THE DEPTHS AWAIT'}</Text>
      </View>
    </View>
    <View style={styles.caption}><Text style={styles.captionText}>{game.ended ? 'The Ash Warden has fallen. A new descent awaits.' : enemy ? 'Choose an action below. Every move is one turn.' : 'Catch your breath, then venture deeper.'}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  portrait: { height: 130, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10182B', borderRadius: 12, overflow: 'hidden' },
  portraitGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, opacity: .08 }, portraitRule: { position: 'absolute', bottom: 9, width: 70, height: 2, backgroundColor: '#465069' },
  scene: { height: 254, backgroundColor: '#141C2B', borderWidth: 1, borderColor: '#3D4F5D', borderRadius: 16, overflow: 'hidden' }, bossScene: { borderColor: '#9A583E', backgroundColor: '#251C27' },
  sceneHeading: { zIndex: 5, flexDirection: 'row', alignItems: 'center', padding: 13, gap: 7 }, dot: { width: 5, height: 5, borderRadius: 3 }, eyebrow: { flex: 1, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, roomLabel: { color: '#8D9AB0', fontSize: 10 },
  brickwork: { position: 'absolute', top: 42, left: -20, right: -20, height: 115, flexDirection: 'row', flexWrap: 'wrap', gap: 3, opacity: .5 }, brick: { width: '15.8%', height: 33, backgroundColor: '#20293B', borderWidth: 1, borderColor: '#2A3545', borderRadius: 2 },
  arch: { position: 'absolute', width: 90, height: 136, alignSelf: 'center', top: 46, backgroundColor: '#2B3445', borderTopLeftRadius: 48, borderTopRightRadius: 48, padding: 9 }, archInner: { flex: 1, backgroundColor: '#0B101E', borderTopLeftRadius: 38, borderTopRightRadius: 38 },
  torch: { position: 'absolute', top: 66, alignItems: 'center' }, flameHalo: { position: 'absolute', top: -13, width: 44, height: 48, backgroundColor: '#F7A34B', opacity: .06, borderRadius: 24 }, flame: { width: 10, height: 18, borderRadius: 6, backgroundColor: '#FFD17E', borderWidth: 2, borderColor: '#CB7541', transform: [{ rotate: '12deg' }] }, torchStem: { height: 14, width: 5, backgroundColor: '#76574B' },
  floor: { position: 'absolute', bottom: 33, width: '100%', height: 54, backgroundColor: '#242D3C', borderTopWidth: 2, borderColor: '#3E4654' }, floorSeam: { position: 'absolute', bottom: 50, width: '100%', height: 1, backgroundColor: '#313C4C' },
  fighters: { position: 'absolute', top: 65, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }, fighter: { width: '47%', height: 148, alignItems: 'center', justifyContent: 'flex-end' }, shadow: { position: 'absolute', bottom: 21, width: 74, height: 12, borderRadius: 40, backgroundColor: '#080D17', opacity: .55 },
  fighterName: { height: 20, maxWidth: '100%', fontSize: 8, fontWeight: '900', letterSpacing: .6, textAlign: 'center', paddingTop: 5 }, heroEffect: { position: 'absolute', top: 0, zIndex: 4 }, damage: { position: 'absolute', top: 0, zIndex: 4 }, effectText: { fontSize: 19, fontWeight: '900', textShadowColor: '#080D17', textShadowRadius: 3 },
  shield: { position: 'absolute', right: 16, bottom: 35, width: 31, height: 53, borderWidth: 3, borderColor: '#94D9FF', borderRadius: 17, backgroundColor: '#86CFFF33' }, healRing: { position: 'absolute', top: 22, width: 83, height: 83, borderRadius: 45, borderWidth: 2, borderColor: '#9AE2B1', alignItems: 'center' }, healPlus: { color: '#ABF8BA', fontWeight: '900', fontSize: 28 },
  spell: { position: 'absolute', top: 39, width: 63, height: 63, borderRadius: 40, borderWidth: 4, borderColor: '#C4A6FF', backgroundColor: '#8871D544' }, slash: { position: 'absolute', top: 35, width: 4, height: 71, borderRadius: 4, backgroundColor: '#FFE3A5', transform: [{ rotate: '33deg' }] },
  caption: { position: 'absolute', bottom: 0, width: '100%', height: 33, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1422' }, captionText: { fontSize: 9, color: '#9AAAC2', textAlign: 'center', paddingHorizontal: 8 },
});
