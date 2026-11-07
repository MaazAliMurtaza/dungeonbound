import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import GameText from "./GameText";
import AbilityIcon from "./AbilityIcon";
import { SKILLS, SKILL_PATHS, type Skill } from "./content";
import { buyItem, chooseSpecialization, skillLockReason, type Game } from "./game";

export default function SkillTree({ game, locked, update }: {
  game: Game; locked: boolean; update: (game: Game) => void;
}) {
  const skills = SKILLS.filter((sk) => sk.className === game.hero.className);
  const branches = [...new Set(skills.slice(1).map((sk) => SKILL_PATHS[sk.id].branch))];
  const node = (skill: Skill) => {
    const learned = game.skills.includes(skill.id);
    const reason = skillLockReason(game, skill.id);
    return <View key={skill.id} style={[s.node, learned && s.learned]}>
      <AbilityIcon cell={SKILLS.indexOf(skill)} size={44} />
      <GameText style={s.name}>{skill.name}</GameText>
      <GameText style={s.meta}>LV {skill.level} · {skill.mana} MP</GameText>
      <GameText style={s.description}>{skill.description}</GameText>
      {!learned && <GameText style={s.requirement}>
        {reason ?? "Ready to awaken"}
      </GameText>}
      <Pressable testID={`learn-${skill.id}`} accessibilityRole="button"
        accessibilityLabel={`Learn ${skill.name}`} disabled={locked || !!reason}
        onPress={() => update(buyItem(game, skill.id))}
        style={[s.action, (locked || (!!reason && !learned)) && s.disabled]}>
        <GameText style={s.actionText}>{learned ? "AWAKENED" : `LEARN · ${skill.price} GOLD`}</GameText>
      </Pressable>
    </View>;
  };
  return <View style={s.root}>
    <GameText style={s.title}>AWAKENING TREE</GameText>
    <GameText style={s.intro}>Follow a branch to unlock its next technique. Both paths remain available.</GameText>
    <View style={{ alignSelf: "center", width: "65%" }}>{node(skills[0])}</View>
    <View style={s.stem} /><View style={s.bridge} />
    <View style={s.branches}>{branches.map((branch) => <View key={branch} style={s.branch}>
      <View style={s.stem} /><GameText style={s.branchName}>{branch.toUpperCase()}</GameText>
      {skills.filter((sk) => SKILL_PATHS[sk.id].branch === branch).sort((a,b) => a.level-b.level).map((skill, i) =>
        <React.Fragment key={skill.id}>{i > 0 && <View style={s.stem} />}{node(skill)}</React.Fragment>)}
    </View>)}</View>
    <View style={s.mastery}>
      <GameText style={s.title}>CHOOSE YOUR MASTERY</GameText>
      <GameText style={s.intro}>Level 3 · First choice is free. Switching costs 25 gold. One mastery active at a time.</GameText>
      {(["assault", "survival"] as const).map((choice) => {
        const active = game.specialization === choice;
        const disabled = locked || active || game.hero.level < 3 || (!!game.specialization && game.hero.gold < 25);
        return <Pressable key={choice} testID={`mastery-${choice}`} accessibilityRole="button"
          accessibilityLabel={`Choose ${choice} mastery`} disabled={disabled}
          onPress={() => update(chooseSpecialization(game, choice))}
          style={[s.masteryChoice, active && s.learned, disabled && !active && s.disabled]}>
          <GameText style={s.name}>{active ? "◆ " : "◇ "}{choice.toUpperCase()}</GameText>
          <GameText style={s.description}>{choice === "assault" ? "+10% attack and skill damage" : "10% less incoming damage"}</GameText>
          <GameText style={s.meta}>{active ? "ACTIVE" : game.hero.level < 3 ? "REQUIRES LEVEL 3" : game.specialization ? "SWITCH · 25 GOLD" : "CHOOSE · FREE"}</GameText>
        </Pressable>;
      })}
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { gap: 0, paddingBottom: 12 },
  title: { color: "#F3D18D", fontSize: 19, fontWeight: "700", textAlign: "center" },
  intro: { color: "#C6BCA9", fontSize: 13, textAlign: "center", marginVertical: 10 },
  branches: { flexDirection: "row", gap: 10 },
  branch: { flex: 1, minWidth: 0 },
  branchName: { color: "#D9BB7B", fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  node: { alignItems: "center", gap: 6, padding: 10, borderWidth: 1, borderColor: "#6F5B3D", backgroundColor: "#16131CEC" },
  learned: { borderColor: "#DDBA6D", backgroundColor: "#30291DE8" },
  name: { color: "#F2E4C8", fontSize: 15, fontWeight: "700", textAlign: "center" },
  meta: { color: "#B6C8D9", fontSize: 11, textAlign: "center" },
  description: { color: "#D0C9BC", fontSize: 12, textAlign: "center" },
  requirement: { color: "#C7B38B", fontSize: 11, textAlign: "center" },
  stem: { width: 2, height: 18, alignSelf: "center", backgroundColor: "#B69758" },
  bridge: { height: 2, marginHorizontal: "25%", backgroundColor: "#B69758" },
  action: { minHeight: 44, width: "100%", padding: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#5D4527", borderWidth: 1, borderColor: "#B69758" },
  actionText: { color: "#FFE0A0", fontSize: 12, fontWeight: "700", textAlign: "center" },
  disabled: { opacity: 0.5 },
  mastery: { marginTop: 22, gap: 8 },
  masteryChoice: { minHeight: 82, padding: 12, gap: 5, borderWidth: 1, borderColor: "#6F5B3D", backgroundColor: "#16131C" },
});
