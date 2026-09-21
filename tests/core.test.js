import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../chat-core.js';

export function complete(name='Roxy') {
 return {...Object.fromEntries(Object.keys(core.PROFILE_FIELDS).map(k=>[k,k==='name'?name:'รายละเอียด '+k])),...Object.fromEntries(core.RELATIONS.map(k=>[k,30])),stats:{...Object.fromEntries(core.STATS.map(k=>[k,10])),rank:'Saint'},abilities:[],customMeters:[],diary:[]};
}
function harness() {
 let active='chat-a';const metadata={};
 const ctx={chat:[{is_user:true,mes:'Hello'}],characterId:1,name1:'Boat',extensionSettings:{},getCurrentChatId:()=>active,saveMetadata:async()=>{},setExtensionPrompt:()=>{},saveSettingsDebounced:()=>{}};
 Object.defineProperty(ctx,'chatMetadata',{get:()=>metadata[active] ||= {}});
 const sandbox={console,ChatCore:core,structuredClone,crypto:globalThis.crypto,SillyTavern:{getContext:()=>ctx},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},setTimeout,clearTimeout};
 vm.createContext(sandbox);
 let source=readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
 source=source.replace(/const ASSET_TOKEN[\s\S]*?let chatUI;/,'const ChatCore = globalThis.ChatCore; let chatUI;');
 source=source.slice(0,source.lastIndexOf("if (document.readyState === 'loading')"));
 source+='\nrenderAll=()=>{};globalThis.api={chatApi,getState,persistState,normalize,defaultState,applyStatePatch,npcProfile,statePrompt,getSettings};';
 vm.runInContext(source,sandbox);
 return {...sandbox.api,ctx,metadata,setChat:key=>active=key};
}
test('complete schema and meaningful no-partner string accepted; blanks/placeholders rejected',()=>{
 const p=complete();p.partner='ไม่มีคู่ครอง';assert.deepEqual(core.missingProfile(p),[]);
 for(const value of ['', 'Unknown','ไม่ระบุ','—','N/A'])assert(core.missingProfile({...p,age:value}).includes('age'));
 assert(core.missingProfile({...p,stats:{...p.stats,mp:undefined}}).includes('stats.mp'));
 assert(core.missingProfile({...p,abilities:[{name:'Water'}]}).includes('abilities.0.category'));
});
test('profile allowlist rejects local assets and malicious properties',()=>{
 const p=core.profileData({...complete(),hasPortrait:true,chatColor:'red;url(x)',portraitView:{},id:'overwrite'});
 assert.equal(p.hasPortrait,undefined);assert.equal(p.id,undefined);assert.equal(p.chatColor,undefined);
});
test('AI completion repairs nested partial abilities and undefined numeric form fields',()=>{
 const base={name:'Roxy',stats:{mp:undefined},trust:undefined,abilities:[{name:'Water',description:'Manual description'}]};
 const incoming={...complete(),abilities:[{name:'Water',category:'Magic',level:'Saint',description:'Generated description',proficiency:80}]};
 const merged=core.mergeProfile(base,incoming);assert.equal(core.missingProfile(merged).length,0);assert.equal(merged.abilities[0].description,'Manual description');assert.equal(merged.stats.mp,10);assert.equal(merged.trust,30);
});
test('protocol groups adjacent speakers, removes dialogue quotes, keeps narrative',()=>{
 const p=core.parseChat('<tensei_chat>'+JSON.stringify({turns:[{speaker:'Roxy',blocks:[{type:'dialogue',text:'“Hello”'}]},{speaker:'roxy',blocks:[{type:'narrative',text:'A step.'}]},{speaker:'Rudeus',blocks:[{type:'dialogue',text:'Yes'}]}]})+'</tensei_chat>');
 assert.equal(p.turns.length,2);assert.equal(p.turns[0].blocks[0].text,'Hello');assert.equal(p.turns[0].blocks[1].text,'A step.');
});
test('malformed and streaming protocols are hidden; plain legacy messages unchanged',()=>{
 assert.equal(core.parseChat('normal'),null);
 assert(core.parseChat('<tensei_chat>{').error);
 assert(core.parseChat('<tensei_chat>{"turns":[{"speaker":"X","blocks":[{"type":"html","text":"x"}]}]}</tensei_chat>').error);
 assert(!core.plainChat('<tensei_chat>{"secret":').includes('secret'));
});
test('completed NPC created from main chat and persisted only once',async()=>{
 const h=harness(),api=h.chatApi();const parsed={npcs:[complete()],turns:[{speaker:'Roxy'}]};
 await api.ingest(parsed);await api.ingest(parsed);
 assert.equal(h.getState().npcs.length,1);assert.equal(h.getState().npcs[0].name,'Roxy');assert.equal(h.getState().npcDrafts.length,0);
 assert.equal(core.missingProfile(h.getState().npcs[0]).length,0);
});
test('missing speaker profile is visible as pending and upgraded by complete next reply',async()=>{
 const h=harness(),api=h.chatApi();await api.ingest({npcs:[],turns:[{speaker:'Roxy'}]});
 assert.equal(h.getState().npcDrafts[0].name,'Roxy');assert.equal(h.getState().npcs.length,0);
 assert(h.statePrompt(h.getState()).includes('Pending reference data'));
 await api.ingest({npcs:[complete()],turns:[{speaker:'Roxy'}]});
 assert.equal(h.getState().npcDrafts.length,0);assert.equal(h.getState().npcs.length,1);
});
test('manual NPC appears in same registry; AI fills missing without overwriting manual values',async()=>{
 const h=harness(),api=h.chatApi();await api.saveNpc({name:'Roxy',title:'Manual title',chatColor:'#abcdef',chatAvatarSize:96},null,'1:chat-a');
 assert.equal(h.getState().npcs[0].title,'Manual title');
 await api.ingest({npcs:[complete()],turns:[{speaker:'Roxy'}]});
 const p=h.getState().npcs[0];assert.equal(p.title,'Manual title');assert.equal(p.chatColor,'#abcdef');assert.equal(p.chatAvatarSize,96);assert.equal(core.missingProfile(p).length,0);
});
test('user personas and generic narrator names never become NPCs',async()=>{
 const h=harness();await h.chatApi().ingest({npcs:[complete('Boat'),complete('ผู้บรรยาย')],turns:[]});assert.equal(h.getState().npcs.length,0);assert.equal(h.getState().npcDrafts.length,0);
});
test('NPCs isolated by chat and stale saves rejected',async()=>{
 const h=harness();await h.chatApi().ingest({npcs:[complete()],turns:[]});h.setChat('chat-b');assert.equal(h.getState().npcs.length,0);
 await assert.rejects(h.chatApi().saveNpc({name:'Other'},null,'1:chat-a'));
 h.setChat('chat-a');assert.equal(h.getState().npcs.length,1);
});
test('partial patch creates pending entry; full patch preserves local portrait/color',async()=>{
 const h=harness();const partial=h.applyStatePatch(h.getState(),{ops:[['upsert','npcs',{name:'Roxy'}]]}).next;
 assert.equal(partial.npcs.length,0);assert.equal(partial.npcDrafts[0].name,'Roxy');
 await h.persistState(partial);await h.chatApi().ingest({npcs:[complete()],turns:[]});
 const current=h.getState();current.npcs[0].hasPortrait=true;current.npcs[0].chatColor='#abcdef';
 const next=h.applyStatePatch(current,{ops:[['upsert','npcs',{name:'Roxy',title:'New title',hasPortrait:false,chatColor:'#000000'}]]}).next;
 assert.equal(next.npcs[0].hasPortrait,true);assert.equal(next.npcs[0].chatColor,'#abcdef');assert.equal(next.npcs[0].title,'New title');
});
test('legacy state migration retains NPCs and other game systems',()=>{
 const h=harness(),state=h.defaultState();state.player.level=42;state.npcs=[h.npcProfile({name:'Old NPC'})];state.inventory=[{id:'a',name:'Staff',quantity:3}];delete state.npcDrafts;
 const migrated=h.normalize(state);assert.equal(migrated.player.level,42);assert.equal(migrated.npcs[0].name,'Old NPC');assert.equal(migrated.inventory[0].quantity,3);assert.equal(migrated.npcDrafts.length,0);
});
test('new entrypoint cache-busts runtime, all local CSS/modules and settings',()=>{
 const loader=readFileSync(new URL('../loader.js',import.meta.url),'utf8'),runtime=readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
 assert(loader.includes("import(url('runtime.js'))"));assert(loader.includes("['style.css', 'ui-polish.css', 'chat-ui.css']"));
 assert(runtime.includes("import(assetUrl('chat-core.js'))"));assert(runtime.includes("fetch(assetUrl('settings.html'), { cache: 'no-store' })"));
 assert(!readFileSync(new URL('../ui-polish.css',import.meta.url),'utf8').includes('@import'));
});
