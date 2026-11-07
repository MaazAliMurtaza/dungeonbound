import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";

const tracks = { refuge: require("../assets/audio/refuge.wav"), battle: require("../assets/audio/battle.wav"), guardian: require("../assets/audio/guardian.wav") };
const cues = { slash: require("../assets/audio/slash.wav"), arrow: require("../assets/audio/arrow.wav"), spell: require("../assets/audio/spell.wav"), guard: require("../assets/audio/guard.wav"), heal: require("../assets/audio/heal.wav"), ui: require("../assets/audio/ui.wav"), gold: require("../assets/audio/gold.wav"), victory: require("../assets/audio/victory.wav"), defeat: require("../assets/audio/defeat.wav") };
export type SoundCue = keyof typeof cues;
type AudioSettings = {music:boolean;sound:boolean;voice:boolean};
const defaults:AudioSettings = {music:true,sound:true,voice:false};
const storageKey = "dungeonbound_audio_preferences_v1";
export const SoundContext = createContext({play:(_cue:SoundCue)=>{}, say:(_text:string)=>{}});

export function useGameAudio(scene:keyof typeof tracks, ready:boolean) {
  const [settings,setSettings] = useState(defaults);
  const [loaded,setLoaded] = useState(false);
  const [active,setActive] = useState(AppState.currentState === "active");
  const music = useAudioPlayer(null,{updateInterval:1000});
  const fx1 = useAudioPlayer(null,{updateInterval:1000});
  const fx2 = useAudioPlayer(null,{updateInterval:1000});
  const nextFx = useRef(0);
  useEffect(()=>{
    let mounted=true;
    void AsyncStorage.getItem(storageKey).then(raw=>{
      if(!mounted||!raw)return;
      try{const value=JSON.parse(raw);setSettings({music:typeof value.music==='boolean'?value.music:true,sound:typeof value.sound==='boolean'?value.sound:true,voice:value.voice===true});}catch{}
    }).catch(()=>{}).finally(()=>{if(mounted)setLoaded(true);});
    void setAudioModeAsync({playsInSilentMode:false,interruptionMode:"mixWithOthers",allowsRecording:false,shouldPlayInBackground:false}).catch(()=>{});
    const listener=AppState.addEventListener("change",state=>setActive(state==='active'));
    return()=>{mounted=false;listener.remove();void Speech.stop();};
  },[]);
  useEffect(()=>{if(loaded)void AsyncStorage.setItem(storageKey,JSON.stringify(settings)).catch(()=>{});},[settings,loaded]);
  useEffect(()=>{
    try{music.replace(tracks[scene]);music.loop=true;music.volume=.22;}catch{}
  },[scene,music]);
  useEffect(()=>{
    try{if(ready&&loaded&&active&&settings.music)music.play();else music.pause();}catch{}
    if(!active||!settings.sound){try{fx1.pause();fx2.pause();}catch{}}
    if(!active||!settings.voice)void Speech.stop();
  },[ready,loaded,active,settings,music,fx1,fx2,scene]);
  const play=useCallback((cue:SoundCue)=>{
    if(!ready||!active||!loaded||!settings.sound||AppState.currentState!=='active')return;
    try{const player=nextFx.current++%2?fx1:fx2;player.replace(cues[cue]);player.volume=cue==='ui'?.3:.55;player.play();}catch{}
  },[ready,active,loaded,settings.sound,fx1,fx2]);
  const say=useCallback((text:string)=>{
    if(ready&&active&&settings.voice&&AppState.currentState==='active'){void Speech.stop();Speech.speak(text,{language:'en',rate:.92,onError:()=>{}});}
  },[ready,active,settings.voice]);
  function configure(key:keyof AudioSettings,value:boolean){setSettings(previous=>({...previous,[key]:value}));}
  return {play,say,settings,configure};
}
