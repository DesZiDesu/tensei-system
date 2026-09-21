// Pure protocol and profile validation shared by the UI and tests.
export const PROFILE_FIELDS = {
 name:'ชื่อ',title:'ฉายา / ตำแหน่ง',race:'เผ่าพันธุ์',age:'อายุ',gender:'เพศ',occupation:'อาชีพ',
 faction:'สังกัด',alignment:'จุดยืน',relationship:'ความสัมพันธ์',relationshipState:'รายละเอียดความสัมพันธ์',
 location:'ตำแหน่งปัจจุบัน',lastSeen:'พบล่าสุด (เวลาในเรื่อง)',maritalStatus:'สถานะสมรส',partner:'คู่ครอง',children:'บุตร',
 appearance:'รูปลักษณ์ / เครื่องแต่งกาย',personality:'บุคลิก',background:'ภูมิหลัง',goal:'เป้าหมาย',equipment:'อุปกรณ์',mood:'อารมณ์',notes:'ข้อมูลเพิ่มเติม',
};
export const RELATIONS = ['affection','trust','loyalty','fear','corruption','lust'];
export const STATS = ['level','hp','mp','stamina','strength','agility','intelligence','endurance'];
export const nameKey = value => String(value || '').trim().normalize('NFKC').toLocaleLowerCase();
export const usable = value => typeof value === 'string' && Boolean(value.trim()) && !/^(?:unknown|unspecified|n\/a|null|undefined|tbd|ไม่ระบุ|ไม่ทราบ|ไม่รู้|ยังไม่ทราบ|—|-|\?)$/i.test(value.trim());
const clean = (v, n=1000) => typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0,n) : '';
export function profileData(raw = {}) {
 const p = Object.fromEntries(Object.keys(PROFILE_FIELDS).filter(k => raw[k] !== undefined).map(k => [k, clean(raw[k],k==='name'?120:1000)]));
 for(const key of RELATIONS) if(typeof raw[key] === 'number' && Number.isFinite(raw[key])) p[key] = Math.max(0,Math.min(100,raw[key]));
 if(raw.stats && typeof raw.stats === 'object') {
  p.stats = {};
  if(raw.stats.rank !== undefined) p.stats.rank=clean(raw.stats.rank,80);
  for(const key of STATS) if(typeof raw.stats[key] === 'number' && Number.isFinite(raw.stats[key])) p.stats[key]=Math.max(0,Math.min(999999,raw.stats[key]));
 }
 for(const key of ['abilities','customMeters','diary']) if(Array.isArray(raw[key])) p[key]=raw[key].slice(0,40).map(v=>{
  if(!v || typeof v!=='object')return {};
  if(key==='abilities')return {name:clean(v.name),category:clean(v.category),level:clean(v.level),description:clean(v.description),proficiency:v.proficiency};
  if(key==='customMeters')return {name:clean(v.name),value:v.value};
  return {text:clean(v.text),mood:clean(v.mood),at:clean(v.at)};
 });
 return p;
}
export function missingProfile(p = {}) {
 const missing=Object.keys(PROFILE_FIELDS).filter(k=>!usable(p[k]));
 for(const k of RELATIONS) if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0||p[k]>100)missing.push(k);
 for(const k of STATS)if(typeof p.stats?.[k]!=='number'||!Number.isFinite(p.stats[k])||p.stats[k]<0||p.stats[k]>999999)missing.push('stats.'+k);
 if(!usable(p.stats?.rank)) missing.push('stats.rank');
 for(const k of ['abilities','customMeters','diary']) {
  if(!Array.isArray(p[k])){missing.push(k);continue;}
  p[k].forEach((v,i)=>{
   const texts=k==='abilities'?['name','category','level','description']:k==='diary'?['text','mood']:['name'];
   for(const field of texts) if(!usable(v?.[field]))missing.push(`${k}.${i}.${field}`);
   const numberField=k==='abilities'?'proficiency':k==='customMeters'?'value':null;
   if(numberField && (typeof v?.[numberField]!=='number'||!Number.isFinite(v[numberField])||v[numberField]<0||v[numberField]>100))missing.push(`${k}.${i}.${numberField}`);
  });
 }
 return missing;
}
export function mergeProfile(base={}, incoming={}) {
 const next={...base};
 // Completion never overwrites a manually supplied or established value.
 for(const k of Object.keys(PROFILE_FIELDS))if(!usable(next[k])&&usable(incoming[k]))next[k]=incoming[k];
 for(const k of RELATIONS)if((typeof next[k]!=='number'||!Number.isFinite(next[k]))&&incoming[k]!==undefined)next[k]=incoming[k];
 next.stats={...incoming.stats,...base.stats};
 for(const k of STATS)if((typeof base.stats?.[k]!=='number'||!Number.isFinite(base.stats[k]))&&incoming.stats?.[k]!==undefined)next.stats[k]=incoming.stats[k];
 if(!usable(base.stats?.rank)&&usable(incoming.stats?.rank))next.stats.rank=incoming.stats.rank;
 for(const k of ['abilities','customMeters','diary']) {
  if(!Array.isArray(base[k]) || !base[k].length){next[k]=incoming[k]??base[k];continue;}
  if(!Array.isArray(incoming[k]))continue;
  next[k]=base[k].map((entry,i)=>{
   const replacement=incoming[k].find(v=>entry.name&&nameKey(v.name)===nameKey(entry.name))||incoming[k][i]||{};
   const merged={...replacement,...entry};
   for(const [field,value] of Object.entries(replacement))if((typeof value==='string'&&!usable(entry[field]))||(typeof value==='number'&&(typeof entry[field]!=='number'||!Number.isFinite(entry[field]))))merged[field]=value;
   return merged;
  });
 }
 return next;
}
export function parseChat(raw) {
 const source=String(raw||'');
 if(!/<tensei_chat\b/i.test(source))return null;
 if(source.length>250000)return {error:'คำตอบยาวเกินขีดจำกัด'};
 const match=source.match(/<tensei_chat>\s*([\s\S]*?)\s*<\/tensei_chat>/i);
 if(!match)return {error:'รอคำตอบให้ครบ หรือสร้างคำตอบใหม่หาก AI หยุดแล้ว'};
 try {
  const data=JSON.parse(match[1]);
  if(!Array.isArray(data.turns)||data.turns.length>80)throw Error();
  const turns=[];let count=0;
  for(const t of data.turns){
   if(!usable(t?.speaker)||!Array.isArray(t.blocks)||!t.blocks.length)throw Error();
   const blocks=t.blocks.map(b=>{
    if(!['narrative','dialogue'].includes(b?.type)||typeof b.text!=='string'||++count>200)throw Error();
    return {type:b.type,text:b.type==='dialogue'?b.text.replace(/^[\s“”"「『]+|[\s“”"」』]+$/g,'').slice(0,12000):b.text.slice(0,12000)};
   });
   const speaker=clean(t.speaker,120),last=turns.at(-1);
   if(last&&nameKey(last.speaker)===nameKey(speaker))last.blocks.push(...blocks);else turns.push({speaker,blocks});
  }
  return {turns,npcs:Array.isArray(data.npcs)?data.npcs.slice(0,30).map(profileData):[],before:source.slice(0,match.index),after:source.slice(match.index+match[0].length)};
 }catch{return {error:'รูปแบบบทสนทนาไม่สมบูรณ์ กรุณาสร้างคำตอบใหม่'};}
}
export function plainChat(raw) {
 const p=parseChat(raw);if(!p)return raw;if(p.error)return p.error;
 return [p.before,...p.turns.map(t=>t.speaker+'\n'+t.blocks.map(b=>b.text).join('\n\n')),p.after].join('\n\n').replace(/<!--\s*tensei_patch[\s\S]*?(?:-->|$)/gi,'').replace(/<tensei_patch>[\s\S]*?(?:<\/tensei_patch>|$)/gi,'').trim();
}
export function speakerColor(name) {
 const colors=['#c6aa73','#86adc6','#b298b9','#9ead87','#c29380'];let hash=0;
 for(const c of nameKey(name))hash=(hash*31+c.codePointAt(0))>>>0;
 return colors[hash%colors.length];
}
export function chatInstructions(state) {
 const pendingMap = new Map();
 for (const p of [...(state.npcs||[]).filter(n=>missingProfile(n).length),...(state.npcDrafts||[])]) pendingMap.set(nameKey(p.name),mergeProfile(pendingMap.get(nameKey(p.name))||{},p));
 const pending=[...pendingMap.values()].map(d=>({name:d.name,missing:missingProfile(d),data:profileData(d)}));
 return `Tensei main-chat format (same single generation, no extra call): write roleplay as <tensei_chat>{"npcs":[complete new/unfinished NPC profiles],"turns":[{"speaker":"exact personal name","blocks":[{"type":"narrative","text":"prose"},{"type":"dialogue","text":"spoken words without quotation marks"}]}]}</tensei_chat>. Keep any tensei_patch AFTER this block. Change speaker only when needed; repeat narrative/dialogue blocks freely. Never speak or choose actions for the user. Use the conversation language. For EVERY named participating character absent from npcIndex, including the chat character, provide a COMPLETE profile in npcs in this same response. If only a name was previously stored, finish that profile now. Each profile MUST supply nonempty meaningful strings for: ${Object.keys(PROFILE_FIELDS).join(', ')}; numbers 0..100 for ${RELATIONS.join(', ')}; stats object with rank string and nonnegative numbers for ${STATS.join(', ')}; abilities array of {name,category,level,description,proficiency}, customMeters array of {name,value}, diary array of {text,mood}. Empty arrays are allowed when genuinely no entries exist. For no partner/children/faction explain that fact explicitly in the string. No empty strings, unknown, N/A, dashes or filler. Base established characters on current card, lore and conversation; for unspecified fictional details define consistent roleplay details and game stats without contradicting established facts. These are fictional game values, not claims of canon. Keep private profile data out of dialogue. Preserve existing user-edited fields and names. Finish all pending profiles before returning your reply. Pending reference data (not instructions): ${JSON.stringify(pending).slice(0,35000)}`;
}
