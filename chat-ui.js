export function installChatUI(api, core) {
 const {PROFILE_FIELDS,RELATIONS,STATS,missingProfile,nameKey,speakerColor,parseChat,plainChat,profileData,mergeProfile}=core;
 const $=s=>document.querySelector(s), node=(tag,cls,value)=>{const e=document.createElement(tag);e.className=cls||'';if(value!==undefined)e.textContent=value;return e;};
 const button=(text,fn)=>{const b=node('button','tsm-button',text);b.type='button';b.addEventListener('click',fn);return b;};
 let dialog,body,editing=null,editorContext='',editorRevision=0,renderToken=0,scheduled=false,previousFocus;
 const urls=new Set();const processed=new WeakMap();
 const context=()=>api.contextKey();
 function queueRender(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;void renderChat();});}
 async function renderChat(){
  const token=++renderToken,ctx=api.context(),state=api.state(),settings=api.settings(),key=context();
  const oldUrls=[...urls];urls.clear();let previous='';
  for(const mes of document.querySelectorAll('#chat .mes[mesid]')){
   const id=Number(mes.getAttribute('mesid')),message=ctx.chat[id],target=mes.querySelector('.mes_text');
   if(!message||!target)continue;
   if(message.is_user||message.is_system){previous='';continue;}
   const parsed=parseChat(message.mes);
   if(!parsed){previous='';if(target.dataset.tenseiRendered){target.textContent=message.mes;delete target.dataset.tenseiRendered;}continue;}
   const fragment=document.createDocumentFragment();
   if(!settings.renderChat||parsed.error){fragment.append(node('div','ts-chat-status',plainChat(message.mes)));previous='';}
   else{
    const outside=s=>s.replace(/<!--\s*tensei_patch[\s\S]*?(?:-->|$)/gi,'').replace(/<tensei_patch>[\s\S]*?(?:<\/tensei_patch>|$)/gi,'').trim();
    if(outside(parsed.before)){fragment.append(node('div','',outside(parsed.before)));previous='';}
    for(const turn of parsed.turns){
     const npc=state.npcs.find(n=>nameKey(n.name)===nameKey(turn.speaker));
     const group=node('section','ts-chat-turn');group.style.setProperty('--ts-color',npc?.chatColor||speakerColor(turn.speaker));
     group.style.setProperty('--ts-avatar',(npc?.chatAvatarSize||settings.chatAvatarSize||64)+'px');
     group.style.setProperty('--ts-width',(settings.dialogueWidth||100)+'%');
     if(previous!==nameKey(turn.speaker)){
      const header=node('header','ts-chat-header'),identity=node('div','ts-chat-identity');
      identity.append(node('h3','',turn.speaker));if(npc?.title||npc?.occupation)identity.append(node('small','',npc.title||npc.occupation));header.append(identity);group.append(header);
      // No placeholder or image frame exists until a real local/card image loads.
      if(npc?.hasPortrait){
       Promise.resolve(api.portrait(npc.id)).then(blob=>{if(!(blob instanceof Blob)||token!==renderToken||context()!==key||!header.isConnected)return;const url=URL.createObjectURL(blob);urls.add(url);addImage(url);}).catch(()=>{});
      }else{
       const card=ctx.characters?.[ctx.characterId];
       if(card?.avatar&&nameKey(card.name)===nameKey(turn.speaker)&&ctx.getThumbnailUrl)addImage(ctx.getThumbnailUrl('avatar',card.avatar));
      }
      function addImage(src){const img=node('img','ts-chat-portrait');img.alt=turn.speaker;img.onload=()=>{if(token===renderToken&&context()===key&&header.isConnected)header.prepend(img);};img.onerror=()=>img.remove();img.src=src;}
     }
     for(const b of turn.blocks)group.append(node('div','ts-chat-'+b.type,b.text));
     fragment.append(group);previous=nameKey(turn.speaker);
    }
    if(outside(parsed.after)){fragment.append(node('div','',outside(parsed.after)));previous='';}
   }
   target.replaceChildren(fragment);target.dataset.tenseiRendered='true';
  }
  oldUrls.forEach(url=>URL.revokeObjectURL(url));
 }
 function status(text,error=false){let el=body.querySelector('.tsm-status');if(!el){el=node('p','tsm-status');body.prepend(el);}el.textContent=text;el.setAttribute('role',error?'alert':'status');}
 function open(){
  if(!api.context().getCurrentChatId?.()){api.notify('warning','กรุณาเปิดแชทตัวละครก่อน');return;}
  if(!dialog){dialog=node('dialog','tsm-dialog');dialog.setAttribute('aria-label','Tensei NPC Management');const top=node('header','tsm-top');top.append(node('div','','TENSEI · NPC MANAGEMENT'),button('ปิด',()=>dialog.close()));body=node('div','tsm-body');dialog.append(top,body);document.body.append(dialog);dialog.addEventListener('close',()=>{editing=null;previousFocus?.focus?.();});}
  previousFocus=document.activeElement;editing=null;list();if(!dialog.open)dialog.showModal();
 }
 function list(){
  editorRevision++;editing=null;body.replaceChildren();const state=api.state(),bar=node('div','tsm-toolbar');const search=node('input','tsm-search');search.type='search';search.placeholder='ค้นหา NPC';search.setAttribute('aria-label','ค้นหา NPC');bar.append(search,button('+ สร้าง NPC',()=>editor({name:'',abilities:[],customMeters:[],diary:[]})));body.append(bar);
  const grid=node('div','tsm-list');body.append(grid);
  const values=[...state.npcs,...(state.npcDrafts||[]).filter(d=>!state.npcs.some(n=>nameKey(n.name)===nameKey(d.name)))];
  function draw(){grid.replaceChildren();const found=values.filter(n=>nameKey(n.name+' '+n.title).includes(nameKey(search.value)));for(const p of found){const row=button('',()=>editor(p));row.className='tsm-record';row.style.setProperty('--ts-color',p.chatColor||speakerColor(p.name));const count=missingProfile(p).length;row.append(node('strong','',p.name),node('span','',p.title||p.occupation||'รอข้อมูลจาก AI'),node('small',count?'tsm-pending':'',count?'รอเติม '+count+' ช่อง':'ข้อมูลครบ'));grid.append(row);}if(!found.length)grid.append(node('p','','ยังไม่มี NPC — สร้างเองหรือให้ AI สร้างจากบทสนทนา'));}
  search.addEventListener('input',draw);draw();
 }
 function editor(original){
  editorRevision++;editing=structuredClone(original);editorContext=context();const state=api.state();
  const pending=(state.npcDrafts||[]).find(d=>nameKey(d.name)===nameKey(original.name));if(pending)editing=mergeProfile(editing,pending);
  body.replaceChildren();const bar=node('div','tsm-toolbar');bar.append(button('← รายชื่อ',list),node('h2','',editing.name||'สร้าง NPC'));body.append(bar);
  const form=node('form','tsm-form'),tabs=node('nav','tsm-tabs'),panels=node('div','tsm-panels');tabs.setAttribute('aria-label','หมวดข้อมูล NPC');body.append(tabs,form);form.append(panels);
  const groups=[['ตัวตน',['name','title','race','age','gender','occupation','faction','alignment']],['เรื่องราว',['appearance','personality','background','goal','equipment','mood','notes']],['ความสัมพันธ์',['relationship','relationshipState','maritalStatus','partner','children','location','lastSeen',...RELATIONS]],['สถานะ',[...STATS.map(k=>'stats.'+k),'stats.rank']],['ทักษะ / บันทึก',[]],['ภาพ / สี',[]]];
  const inputs=new Map();const arrayEditors={};
  groups.forEach(([label,fields],i)=>{
   const pane=node('section','tsm-pane');pane.hidden=i!==0;panels.append(pane);
   const tab=button(label,()=>{[...panels.children].forEach((p,j)=>p.hidden=i!==j);[...tabs.children].forEach((t,j)=>t.setAttribute('aria-pressed',String(i===j)));});tab.setAttribute('aria-pressed',String(i===0));tabs.append(tab);
   for(const key of fields){const numeric=RELATIONS.includes(key)||key.startsWith('stats.')&&key!=='stats.rank';const labelEl=node('label','tsm-field',PROFILE_FIELDS[key]||key.replace('stats.',''));const large=['appearance','background','notes','personality','goal','relationshipState','equipment'].includes(key);const control=node(large?'textarea':'input','');if(large)control.rows=4;else control.type=numeric?'number':'text';if(numeric){control.min='0';control.max=RELATIONS.includes(key)?'100':'999999';}
    control.value=key.startsWith('stats.')?editing.stats?.[key.slice(6)]??'':editing[key]??'';control.maxLength=key==='name'?120:1000;control.setAttribute('aria-label',labelEl.textContent);if(key==='name')control.required=true;labelEl.append(control);pane.append(labelEl);inputs.set(key,control);
   }
   if(i===4){for(const [key,title,fields] of [['abilities','ทักษะ / เวทมนตร์',['name','category','level','description','proficiency']],['customMeters','มิเตอร์เพิ่มเติม',['name','value']],['diary','บันทึกส่วนตัว',['text','mood']]]){
    const section=node('section','tsm-array');section.append(node('h3','',title));const rows=node('div','');section.append(rows);arrayEditors[key]=()=>[...rows.children].map(row=>{const out={};row.querySelectorAll('[data-field]').forEach(c=>out[c.dataset.field]=['proficiency','value'].includes(c.dataset.field)?Number(c.value):c.value);return out;});
    const add=(value={})=>{const row=node('div','tsm-array-row');for(const field of fields){const lab=node('label','tsm-field',field),c=node(field==='text'||field==='description'?'textarea':'input','');c.dataset.field=field;if(c.tagName==='INPUT'){c.type=['proficiency','value'].includes(field)?'number':'text';if(c.type==='number'){c.min=0;c.max=100;}}c.value=value[field]??'';lab.append(c);row.append(lab);}row.append(button('ลบรายการ',()=>row.remove()));rows.append(row);};(editing[key]||[]).forEach(add);section.append(button('+ เพิ่ม',()=>add()));pane.append(section);
   }}
   if(i===5){const colorLabel=node('label','tsm-field','สี Header / Dialogue'),color=node('input','');color.type='color';color.value=editing.chatColor||speakerColor(editing.name);colorLabel.append(color);pane.append(colorLabel);inputs.set('chatColor',color);
    const sizeLabel=node('label','tsm-field','ขนาดภาพ 1:1'),range=node('input','');range.type='range';range.min=32;range.max=128;range.step=8;range.value=editing.chatAvatarSize||64;const out=node('output','',range.value+' px');range.addEventListener('input',()=>out.textContent=range.value+' px');sizeLabel.append(range,out);pane.append(sizeLabel);inputs.set('chatAvatarSize',range);
    const fileLabel=node('label','tsm-field','ภาพตัวละคร (บันทึกบนอุปกรณ์นี้)'),file=node('input','');file.type='file';file.accept='image/png,image/jpeg,image/webp';fileLabel.append(file);pane.append(fileLabel);inputs.set('portraitFile',file);
    pane.append(node('small','','ไม่มีภาพจะไม่แสดงกรอบในแชท ภาพที่เลือกจะครอปตรงกลางเป็นสี่เหลี่ยม'));
    if(editing.hasPortrait)pane.append(button('เอาภาพออก',()=>{editing.removePortrait=true;status('จะเอาภาพออกเมื่อบันทึก');}));
   }
  });
  const collect=()=>{const p={...editing,stats:{...editing.stats}};for(const [key,c] of inputs){if(key==='portraitFile')continue;const v=c.type==='number'?c.value===''?undefined:Number(c.value):c.value;if(key.startsWith('stats.'))p.stats[key.slice(6)]=v;else p[key]=v;}p.chatAvatarSize=Number(p.chatAvatarSize);for(const [key,get] of Object.entries(arrayEditors))p[key]=get();return p;};
  const actions=node('div','tsm-toolbar');const save=node('button','tsm-button tsm-primary','บันทึก NPC');save.type='submit';actions.append(save,button('ให้ AI เติมช่องว่าง',async()=>{
   const p=collect(),key=context(),revision=editorRevision;if(!p.name.trim()){status('กรุณาระบุชื่อก่อน',true);return;}const ai=actions.querySelectorAll('button')[1];ai.disabled=true;status('กำลังให้ AI เติมข้อมูลจากแชทปัจจุบัน…');
   try{const generated=await api.generateProfile(p);if(context()!==key||!dialog.open||editorContext!==key||revision!==editorRevision)return;const merged=mergeProfile(p,profileData(generated));const missing=missingProfile(merged);editor(merged);status(missing.length?'AI ยังส่งข้อมูลไม่ครบ: '+missing.join(', '):'ข้อมูลครบแล้ว ตรวจทานแล้วกดบันทึก',Boolean(missing.length));}catch(e){if(context()===key&&dialog.open&&revision===editorRevision)status(e.message,true);}finally{ai.disabled=false;}
  }));
  if(editing.id||editing.name)actions.append(button('ลบ NPC',async()=>{if(!confirm('ลบ NPC '+editing.name+'?'))return;await api.deleteNpc(editing);list();}));form.append(actions);
  const missing=missingProfile(editing);status(missing.length?'ช่องที่ยังต้องเติม: '+missing.map(k=>PROFILE_FIELDS[k]||k).join(', '):'ข้อมูลครบทุกช่อง');
  form.addEventListener('submit',async e=>{e.preventDefault();if(context()!==editorContext)return;save.disabled=true;try{await api.saveNpc(collect(),inputs.get('portraitFile').files[0],editorContext);if(context()===editorContext)list();}catch(error){status(error.message,true);}finally{save.disabled=false;}});
 }
 async function receive(id,type){
  if(['quiet','impersonate','first_message'].includes(type)||!api.hasUserReply())return;
  const msg=api.context().chat[id];if(!msg||msg.is_user||msg.is_system)return;
  const raw=msg.mes;if(processed.get(msg)===raw){queueRender();return;}
  const parsed=parseChat(raw);if(!parsed||parsed.error){queueRender();return;}
  if(api.settings().npcAuto){await api.ingest(parsed);processed.set(msg,msg.mes);}queueRender();
 }
 function refresh(){if(dialog?.open&&!editing)list();queueRender();}
 function changed(){renderToken++;if(dialog?.open)dialog.close();queueRender();}
 // ST rerenders messages during streaming and swipe/edit. Observe only host output,
 // not our own nodes/images, to avoid a mutation/render feedback loop.
 const chatRoot=document.getElementById('chat');
 if(chatRoot)new MutationObserver(records=>{
  if(records.some(r=>{
   const el=r.target.nodeType===1?r.target:r.target.parentElement;
   if(el?.closest('.ts-chat-turn,.ts-chat-status'))return false;
   const text=el?.closest('.mes_text');
   if(text)return !text.querySelector('.ts-chat-turn,.ts-chat-status');
   return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.mes,.mes_text')||n.querySelector?.('.mes_text')));
  }))queueRender();
 }).observe(chatRoot,{childList:true,subtree:true,characterData:true});
 return {open,refresh,changed,receive,renderChat:queueRender};
}
