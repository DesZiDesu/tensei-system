// Run with `npm install --no-save playwright && npx playwright install chromium`,
// then `npm run test:browser`. No AI calls or credentials are used.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;
try {({chromium}=require('playwright'));} catch {({chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));}
const root=fileURLToPath(new URL('..',import.meta.url));
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/chat-ui.css"></head><body style="margin:8px;background:#171914"><div id="chat"><div class="mes" mesid="0"><div class="mes_text"></div></div></div></body></html>');return;}
  const path=resolve(root,'.'+url.pathname);if(!path.startsWith(root+sep)&&path!==root)throw Error();
  res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const core=await import('/chat-core.js'),{installChatUI}=await import('/chat-ui.js');
  const full={...Object.fromEntries(Object.keys(core.PROFILE_FIELDS).map(k=>[k,k==='name'?'Roxy':'ข้อมูล '+k])),...Object.fromEntries(core.RELATIONS.map(k=>[k,20])),stats:{...Object.fromEntries(core.STATS.map(k=>[k,10])),rank:'Saint'},abilities:[],customMeters:[],diary:[],id:'roxy'};
  const raw='<tensei_chat>'+JSON.stringify({npcs:[full],turns:[{speaker:'Roxy',blocks:[{type:'narrative',text:'เธอเงยหน้าขึ้นจากตำรา'},{type:'dialogue',text:'“ลองอีกครั้งนะ”'},{type:'narrative',text:'แสงอ่อน ๆ ปรากฏขึ้น'}]},{speaker:'Rudeus',blocks:[{type:'dialogue',text:'ครับอาจารย์'}]}]})+'</tensei_chat>';
  const ctx={chat:[{mes:raw}],getCurrentChatId:()=> 'test'};const state={npcs:[full],npcDrafts:[{name:'Rudeus'}]};
  window.ui=installChatUI({context:()=>ctx,contextKey:()=> 'test',state:()=>state,settings:()=>({renderChat:true,npcAuto:true,chatAvatarSize:64,dialogueWidth:100}),hasUserReply:()=>true,portrait:async()=>null,notify:()=>{},saveNpc:async p=>{state.npcs.push({...p,id:'new'});},deleteNpc:async()=>{},generateProfile:async()=>full,ingest:async()=>{}},core);
  window.ui.renderChat();window.ctx=ctx;
 });
 await page.locator('.ts-chat-header').first().waitFor();
 assert.equal(await page.locator('.ts-chat-header').count(),2);
 assert.equal(await page.locator('.ts-chat-portrait').count(),0);
 assert.equal(await page.locator('.ts-chat-dialogue').first().textContent(),'ลองอีกครั้งนะ');
 const gaps=await page.locator('.ts-chat-turn').first().evaluate(el=>{const parts=[...el.children];return parts.slice(1).map((p,i)=>Math.abs(p.getBoundingClientRect().top-parts[i].getBoundingClientRect().bottom));});assert(gaps.every(v=>v<1));
 for(const width of [320,390,736,1024]){
  await page.setViewportSize({width,height:850});await page.evaluate(()=>ui.open());
  await page.getByRole('button',{name:'+ สร้าง NPC',exact:true}).click();
  await page.getByLabel('ชื่อ',{exact:true}).fill('Eris');
  await page.getByRole('button',{name:'บันทึก NPC',exact:true}).click();
  await page.getByRole('button',{name:/Eris/}).last().click();
  for(const tab of ['ตัวตน','เรื่องราว','ความสัมพันธ์','สถานะ','ทักษะ / บันทึก','ภาพ / สี'])await page.getByRole('button',{name:tab,exact:true}).click();
  assert.equal(await page.locator('.tsm-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'manager horizontal overflow at '+width);
  await page.getByRole('button',{name:'ปิด',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'chat overflow at '+width);
 }
 await page.evaluate(()=>{ctx.chat[0].mes='<tensei_chat>{"private":"unfinished';document.querySelector('.mes_text').textContent='host rerender';});
 await page.locator('.ts-chat-status').waitFor();assert(!(await page.locator('.mes_text').textContent()).includes('private'));
 assert.deepEqual(errors,[]);console.log('Browser checks passed: grouping, quotes, no avatar placeholder, zero gaps, manager CRUD/tabs, responsive widths, streaming payload hiding.');
}finally{await browser?.close();server.close();}
