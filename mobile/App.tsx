import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newestSave, type SavedGame } from './src/saves';
import BattleScene, { HeroPortrait, Sprite, type BattleEvent } from './src/BattleScene';
import { authorized, restoreSession, signIn, signOut, type User } from './src/auth';
import { claimQuest, combatAction, effectiveStat, enterNextRoom, equipItem, isGame, newGame, nextDungeon, type Action, type Game, type HeroClass } from './src/game';

type Screen = 'home' | 'dungeon' | 'inventory' | 'quests';
const C = { background: '#0B1020', panel: '#171F34', edge: '#303D55', gold: '#F8C96A', text: '#F4F6FA', soft: '#ABB8CF', red: '#FF7185', green: '#7EE0B0', blue: '#95B8FF' };
const cacheKey = (id: string) => `dungeonbound_progress_${id}`; // Non-sensitive game state ONLY.

function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && { opacity: .45 }]}>
    <Text style={[styles.buttonText, secondary && { color: C.text }]}>{label}</Text>
  </Pressable>;
}
function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return <View style={styles.panel}>{title ? <Text style={styles.panelTitle}>{title}</Text> : null}{children}</View>;
}
function Stat({ label, value, color = C.gold }: { label: string; value: string | number; color?: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, { color }]}>{value}</Text></View>;
}
function Bar({ value, max, color = C.red }: { value: number; max: number; color?: string }) {
  return <View style={styles.barOuter}><View style={[styles.barInner, { backgroundColor: color, width: `${Math.min(100, Math.max(0, max ? 100 * value / max : 0))}%` }]} /></View>;
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');
  const [sync, setSync] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const savedAt = useRef(0);
  const [battleEvent, setBattleEvent] = useState<BattleEvent | null>(null);
  const [animating, setAnimating] = useState(false);
  const combatLock = useRef(false);
  const combatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = useRef(0);
  useEffect(() => () => { if (combatTimer.current) clearTimeout(combatTimer.current); }, []);
  useEffect(() => {
    if (screen !== 'dungeon') setBattleEvent(null);
  }, [screen]);

  async function hydrate(nextUser: User) {
    setHydrated(false);
    const raw = await AsyncStorage.getItem(cacheKey(nextUser.id));
    let local: SavedGame | null = null;
    try { local = raw ? JSON.parse(raw) as SavedGame : null; } catch { /* invalid cache ignored */ }
    if (local && (!isGame(local.progress) || !Number.isSafeInteger(local.savedAt) || local.savedAt < 1600000000000)) local = null;
    let chosen: Game | null = local?.progress ?? null;
    let chosenTime = local?.savedAt ?? 0;
    try {
      const cloud = await authorized('/save') as { progress: Game | null; updatedAt: string | null; clientUpdatedAt: number | null };
      const cloudTime = cloud.clientUpdatedAt || new Date(cloud.updatedAt ?? 0).getTime();
      const selected = newestSave(local, cloud.progress && isGame(cloud.progress) ? { progress: cloud.progress, savedAt: cloudTime } : null);
      chosen = selected?.progress ?? null;
      chosenTime = selected?.savedAt ?? 0;
      setSync('Cloud connected');
    } catch { setSync('Offline: local progress is available'); }
    savedAt.current = chosenTime;
    setGame(chosen);
    setUser(nextUser);
    setScreen('home');
    setHydrated(true);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const restored = await restoreSession();
        if (restored && active) await hydrate(restored);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || !user || !game) return;
    let cancelled = false;
    const snapshot: SavedGame = { savedAt: savedAt.current, progress: game };
    // Keep a local offline copy (non-sensitive), but never credentials.
    AsyncStorage.setItem(cacheKey(user.id), JSON.stringify(snapshot)).catch(() => { if (!cancelled) setSync('Local save failed'); });
    let sending = false;
    let complete = false;
    const send = async () => {
      if (cancelled || sending || complete) return;
      sending = true;
      try {
        await authorized('/save', { method: 'PUT', body: JSON.stringify({ progress: game, clientUpdatedAt: snapshot.savedAt }) });
        complete = true;
        if (!cancelled) setSync('Saved to cloud');
      } catch { if (!cancelled) setSync('Saved locally; cloud sync pending'); }
      finally { sending = false; }
    };
    const timer = setTimeout(send, 700);
    const retry = setInterval(send, 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void send(); });
    return () => { cancelled = true; clearTimeout(timer); clearInterval(retry); subscription.remove(); };
  }, [game, hydrated, user?.id]);

  async function submitAuth() {
    setError(''); setBusy(true);
    try {
      const u = await signIn(email.trim().toLowerCase(), password, register);
      setPassword(''); await hydrate(u);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setHydrated(false);
    try { await signOut(); } catch { /* Always clear UI below */ }
    setUser(null); setGame(null); setScreen('home'); setSync(''); setError('');
  }
  function update(next: Game) { setBattleEvent(null); savedAt.current = Math.max(Date.now(), savedAt.current + 1); setGame(next); }
  function fight(action: Action) {
    if (!game?.enemy || combatLock.current || game.hero.hp <= 0) return;
    const enemy = game.enemy;
    const next = combatAction(game, action);
    update(next);
    setBattleEvent({ id: ++turn.current, action, enemy, damage: Math.max(0, enemy.hp - (next.enemy?.hp ?? 0)), received: Math.max(0, game.hero.hp - next.hero.hp), healed: action === 'potion' ? Math.min(40, game.hero.maxHp - game.hero.hp) : 0, defeated: !next.enemy });
    combatLock.current = true; setAnimating(true);
    combatTimer.current = setTimeout(() => { combatLock.current = false; setAnimating(false); }, 1050);
  }
  function confirmNew(className: HeroClass) {
    if (game) {
      Alert.alert('Start over?', 'This replaces the current character and progress.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => { update(newGame(className)); setScreen('dungeon'); } },
      ]);
    } else { update(newGame(className)); setScreen('dungeon'); }
  }
  const hero = game?.hero;
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}><Text style={styles.logo}>⚔ DUNGEONBOUND</Text><Text style={styles.subtitle}>THE ASHEN DEPTHS</Text></View>
        {loading ? <ActivityIndicator size="large" color={C.gold} /> : !user ? <>
          <Panel title={register ? 'CREATE AN ADVENTURER ACCOUNT' : 'WELCOME BACK, ADVENTURER'}>
            <View style={styles.heroLineup}><Sprite cell={0} size={82} /><Sprite cell={1} size={82} /><Sprite cell={2} size={82} /></View>
            <Text style={styles.muted}>Three adventurers. Eight rooms. One Ash Warden. Begin your next descent with progress saved to your account.</Text>
            <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Email address" placeholderTextColor={C.soft} value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} secureTextEntry autoCapitalize="none" autoComplete={register ? 'new-password' : 'current-password'} placeholder="Password (10+ characters)" placeholderTextColor={C.soft} value={password} onChangeText={setPassword} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button disabled={busy || !email.trim() || password.length < 10} label={busy ? 'Working...' : register ? 'CREATE ACCOUNT' : 'SIGN IN'} onPress={submitAuth} />
            <Button secondary label={register ? 'Have an account? Sign in' : 'New player? Create account'} onPress={() => { setRegister(!register); setError(''); }} />
          </Panel>
          <Text style={styles.footnote}>Online sign-in is required once; gameplay logic runs on your device.</Text>
        </> : <>
          <View style={styles.topNav}><Text style={styles.account} numberOfLines={1}>{user.email}</Text><Pressable onPress={logout}><Text style={styles.link}>LOG OUT</Text></Pressable></View>
          {hero && <Panel><View style={styles.statsRow}><Stat label="CLASS" value={hero.className} /><Stat label="LEVEL" value={hero.level} /><Stat label="GOLD" value={hero.gold} /></View>
            <Text style={styles.muted}>HP {hero.hp}/{hero.maxHp} · MP {hero.mana}/{hero.maxMana} · XP {hero.xp}/{hero.level * 55}</Text><Bar value={hero.hp} max={hero.maxHp} /></Panel>}
          {game && <View style={styles.nav}>{(['home','dungeon','inventory','quests'] as Screen[]).map(s => <Pressable key={s} onPress={() => setScreen(s)} style={[styles.navItem, screen === s && styles.navActive]}><Text style={[styles.navText, screen === s && { color: C.gold }]}>{s.toUpperCase()}</Text></Pressable>)}</View>}
          {!game || !hero ? <>
            <Text style={styles.h2}>SELECT YOUR CLASS</Text>
            {(['Warrior','Ranger','Mage'] as HeroClass[]).map((cls, index) => <Panel key={cls} title={`${['🛡','🏹','✦'][index]} ${cls.toUpperCase()}`}>
              <HeroPortrait className={cls} />
              <Text style={styles.muted}>{['Durable melee fighter. High health and defense.','Swift scout. Increased critical-hit chance.','Fragile spellcaster. High skill damage and mana.'][index]}</Text>
              <Button label={`BEGIN AS ${cls.toUpperCase()}`} onPress={() => confirmNew(cls)} />
            </Panel>)}
          </> : screen === 'home' ? <>
            <HeroPortrait className={hero.className} />
            <Panel title="YOUR ADVENTURE"><Text style={styles.body}>Dungeon {game.dungeons + 1} · {game.kills} enemies defeated · {game.bosses} bosses slain</Text>
              <Text style={styles.muted}>Each run features eight connected rooms, randomized enemies, treasure, and a boss.</Text>
              <Button label="CONTINUE ADVENTURE" onPress={() => setScreen('dungeon')} />
              <Button label="NEW CHARACTER / RESTART" secondary onPress={() => Alert.alert('Restart character', 'Choose a new class from the selection screen?', [ { text:'Cancel', style:'cancel' }, { text:'Restart', style:'destructive', onPress: () => { setGame(null); setScreen('home'); } } ])} />
            </Panel>
            <Panel title="ACHIEVEMENTS">{game.achievements.length ? game.achievements.map(a => <Text key={a} style={styles.body}>🏆 {a}</Text>) : <Text style={styles.muted}>Defeat your first enemy to unlock an achievement.</Text>}</Panel>
          </> : screen === 'dungeon' ? <>
            <Text style={styles.h2}>DUNGEON {game.dungeons + 1}</Text>
            <BattleScene game={game} event={battleEvent} />
            <Panel title="ROOM MAP"><View style={styles.roomRow}>{game.rooms.map((room, i) => <View key={room.id} style={[styles.room, i === game.roomIndex && styles.roomCurrent, room.cleared && styles.roomClear]}>
              <Text style={styles.roomGlyph}>{room.kind === 'boss' ? '♛' : room.kind === 'elite' ? '⚡' : room.kind === 'treasure' ? '◆' : room.kind === 'rest' ? '♥' : room.kind === 'event' ? '✦' : room.kind === 'combat' ? '⚔' : '⌂'}</Text>
              <Text style={styles.roomNumber}>{i + 1}</Text>
            </View>)}</View>
              <Text style={styles.muted}>Green = cleared · Gold = current · ♛ = final boss</Text></Panel>
            {hero.hp <= 0 ? <Panel title="YOU HAVE FALLEN"><Text style={styles.body}>Your adventurer's journey has ended. Start a new character from the main menu.</Text><Button label="RETURN HOME" onPress={() => setScreen('home')} /></Panel>
             : game.ended ? <Panel title="🏆 VICTORY"><Text style={styles.body}>The Ash Warden has fallen. Your rewards and progression are preserved.</Text><Button label="NEXT DUNGEON" onPress={() => update(nextDungeon(game))} /></Panel>
             : game.enemy ? <Panel title={`⚔ ${game.enemy.name.toUpperCase()}`}>
                <Text style={styles.muted}>Enemy HP {game.enemy.hp}/{game.enemy.maxHp}</Text><Bar value={game.enemy.hp} max={game.enemy.maxHp} />
                <Text style={styles.muted}>Your HP {hero.hp}/{hero.maxHp} · Mana {hero.mana}/{hero.maxMana} · Potions {hero.potions}</Text>
                <View style={styles.actionGrid}>{([['ATTACK', 'attack'], ['SKILL (8 MP)', 'skill'], ['DEFEND', 'defend'], ['POTION (+40 HP)', 'potion']] as [string, Action][]).map(([label, action]) => <View key={action} style={{ width: '48%' }}><Button label={label} onPress={() => fight(action)} disabled={animating || action === 'potion' && hero.potions === 0 || action === 'skill' && hero.mana < 8}/></View>)}</View>
              </Panel> : <Panel title={game.roomIndex < 0 ? 'AT THE DUNGEON GATE' : 'ROOM CLEARED'}>
                <Text style={styles.body}>{game.roomIndex < 0 ? 'Step into the unknown.' : `You survived room ${game.roomIndex + 1}. Prepare for the next encounter.`}</Text>
                <Button label={game.roomIndex < 0 ? 'ENTER DUNGEON' : 'NEXT ROOM'} onPress={() => update(enterNextRoom(game))}/>
              </Panel>}
            <Panel title="BATTLE JOURNAL">{game.log.slice(0, 7).map((entry, i) => <Text key={`${i}-${entry}`} style={styles.journal}>• {entry}</Text>)}</Panel>
          </> : screen === 'inventory' ? <>
            <Text style={styles.h2}>INVENTORY & EQUIPMENT</Text>
            <Panel title="EQUIPPED STATS"><View style={styles.statsRow}><Stat label="ATTACK" value={effectiveStat(game, 'weapon')}/><Stat label="DEFENSE" value={effectiveStat(game, 'armor')}/><Stat label="POTIONS" value={hero.potions}/></View></Panel>
            {game.inventory.length ? game.inventory.map(item => <Panel key={item.id} title={item.name.toUpperCase()}>
              <Text style={styles.muted}>{item.rarity} · {item.slot.toUpperCase()} · +{item.bonus} {item.slot === 'weapon' ? 'ATK' : 'DEF'}</Text>
              <Button secondary label={game.equipment[item.slot] === item.id ? 'EQUIPPED ✓' : 'EQUIP ITEM'} disabled={game.equipment[item.slot] === item.id} onPress={() => update(equipItem(game, item.id))} />
            </Panel>) : <Panel><Text style={styles.muted}>Your pack is empty. Explore treasure rooms and win fights to find gear.</Text></Panel>}
          </> : <>
            <Text style={styles.h2}>QUESTS & ACHIEVEMENTS</Text>
            <Panel title="DUNGEON HUNTER"><Text style={styles.body}>Defeat 3 enemies: {Math.min(3, game.kills)}/3</Text><Text style={styles.muted}>Reward: 30 gold + 35 XP</Text>
              <Button disabled={game.kills < 3 || game.questClaimed} label={game.questClaimed ? 'CLAIMED ✓' : game.kills >= 3 ? 'CLAIM QUEST REWARD' : 'IN PROGRESS'} onPress={() => update(claimQuest(game))}/>
            </Panel><Panel title="ACHIEVEMENTS">{game.achievements.length ? game.achievements.map(a => <Text style={styles.body} key={a}>🏆 {a}</Text>) : <Text style={styles.muted}>None unlocked yet.</Text>}</Panel>
          </>}
          {game && <Text style={styles.footnote}>SAVE STATUS: {sync}</Text>}
        </>}
        <Text style={styles.footer}>DUNGEONBOUND · STUDENT PROJECT · 2D RPG</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  heroLineup: { flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: '#10182B', borderRadius: 12, paddingVertical: 10 },
  safe: { flex: 1, backgroundColor: C.background }, content: { padding: 18, paddingBottom: 45, gap: 14 }, titleRow: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 }, logo: { color: C.gold, fontSize: 26, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' }, subtitle: { color: C.soft, fontSize: 11, letterSpacing: 4, marginTop: 4 },
  panel: { backgroundColor: C.panel, borderColor: C.edge, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 }, panelTitle: { fontWeight: '800', color: C.gold, fontSize: 15, letterSpacing: .8 },
  button: { paddingVertical: 13, paddingHorizontal: 10, backgroundColor: C.gold, borderRadius: 9, alignItems: 'center', justifyContent: 'center', minHeight: 45 }, buttonSecondary: { backgroundColor: '#273249', borderColor: C.edge, borderWidth: 1 }, buttonText: { color: C.background, fontWeight: '900', fontSize: 12, textAlign: 'center', letterSpacing: .45 },
  muted: { color: C.soft, fontSize: 13, lineHeight: 21 }, body: { color: C.text, fontSize: 15, lineHeight: 22 }, h2: { color: C.text, fontSize: 19, fontWeight: '900', marginTop: 9 },
  input: { backgroundColor: '#0F1628', borderWidth: 1, borderColor: C.edge, color: C.text, borderRadius: 9, padding: 13, fontSize: 15 }, error: { color: C.red, fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }, stat: { gap: 3, minWidth: 65 }, statLabel: { color: C.soft, fontSize: 10, fontWeight: '700' }, statValue: { color: C.gold, fontSize: 18, fontWeight: '800' },
  barOuter: { height: 10, borderRadius: 8, backgroundColor: '#2B3448', overflow: 'hidden' }, barInner: { height: '100%', borderRadius: 8 }, topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, account: { color: C.soft, fontSize: 12, flex: 1 }, link: { color: C.gold, fontSize: 12, fontWeight: '800' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'space-between' }, navItem: { flexGrow: 1, borderColor: C.edge, borderWidth: 1, borderRadius: 7, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center' }, navActive: { backgroundColor: C.panel, borderColor: C.gold }, navText: { color: C.soft, fontSize: 10, fontWeight: '800' },
  roomRow: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' }, room: { width: '11.5%', borderWidth: 1, borderColor: C.edge, backgroundColor: '#0F1628', borderRadius: 7, alignItems: 'center', paddingVertical: 8, gap: 3 }, roomCurrent: { borderColor: C.gold }, roomClear: { borderColor: C.green }, roomGlyph: { color: C.text, fontSize: 20 }, roomNumber: { color: C.soft, fontSize: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'space-between' }, journal: { color: C.soft, lineHeight: 19, fontSize: 12 }, footnote: { color: C.soft, textAlign: 'center', fontSize: 12, lineHeight: 18 }, footer: { color: '#596580', fontSize: 10, textAlign: 'center', letterSpacing: 1, marginTop: 9 },
});
