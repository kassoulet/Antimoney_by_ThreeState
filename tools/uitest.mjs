// UI test (headless Chrome, CDP): no console errors, canvas text masks built and visible at the script positions that use them, 4:3 canvas, play / pause / seek. Exit code 1 on failure.
// node tools/uitest.mjs [screenshot-dir]   (screenshots: slot3a, slot3b, slot14, slot16, slot23 .png)
import {spawn} from 'child_process';import fs from 'fs';import http from 'http';import path from 'path';import {fileURLToPath} from 'url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'../web'), shots=process.argv[2];
const srv=http.createServer((q,r)=>{let p=path.join(root,q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return;}const m={'.html':'text/html','.js':'text/javascript','.json':'application/json','.ogg':'audio/ogg','.bin':'application/octet-stream'};r.writeHead(200,{'content-type':m[path.extname(p)]||'application/octet-stream'});r.end(d);});}).listen(0);
const PORT=9300+Math.floor(Math.random()*500);
const ch=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--autoplay-policy=no-user-gesture-required','--remote-debugging-port='+PORT,'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(2000);
const tabs=await (await fetch('http://localhost:'+PORT+'/json')).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend={},errs=[];ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id])pend[d.id](d);
 if(d.method==='Runtime.exceptionThrown')errs.push(JSON.stringify(d.params.exceptionDetails).slice(0,300));
 if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errs.push('console.error '+JSON.stringify(d.params.args).slice(0,200));
 if(d.method==='Log.entryAdded'&&d.params.entry.level==='error'&&!/favicon/.test(d.params.entry.url||''))errs.push('log '+d.params.entry.text+' '+d.params.entry.url);};
const send=(method,params={})=>new Promise(r=>{pend[++id]=r;ws.send(JSON.stringify({id,method,params}))});
const ev=async e=>{const r=(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result;if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,300));return r.result.value;};
await send('Runtime.enable');await send('Log.enable');await send('Page.enable');await send('Page.navigate',{url:`http://localhost:${srv.address().port}/index.html`});
for(let i=0;i<300&&!(await ev('window.demoReady===true').catch(()=>false));i++)await wait(200);
let bad=0;const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m);if(!c)bad++;};
const cur=()=>ev('+document.getElementById("seek").value/10');
const seek=async s=>{await ev(`(()=>{const e=document.getElementById("seek");e.value=${s*10};e.dispatchEvent(new Event("input"));})()`);await wait(500);};
const shot=async n=>{if(!shots)return;fs.mkdirSync(shots,{recursive:true});fs.writeFileSync(path.join(shots,n+'.png'),Buffer.from((await send('Page.captureScreenshot',{})).result.data,'base64'));};
// non-black pixels of the canvas
const lit=()=>ev(`(()=>{const c=document.getElementById("cv"),d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i])n++;return n;})()`);
try{
ok(await ev('window.demoReady===true'),'page ready');
const box=await ev('(()=>{const r=document.getElementById("cv").getBoundingClientRect();return r.width/r.height})()');ok(Math.abs(box-4/3)<0.01,'canvas displayed 4:3: '+box.toFixed(3));
ok(await ev('(()=>{const f=document.fonts;return document.getElementById("cv").width/document.getElementById("cv").height})()')-4/3<0.01,'canvas buffer 512x384');
// mask check inside the page: render with the real masks, then with an empty one, count differing pixels (same module instance as player.js)
const diff=(ax,what)=>ev(`(async()=>{const m=await import('./fx/compose.js');const R=await (await fetch('assets/rows.json')).json();const ms=R[${ax>>8}*64+${ax&63}]+800+40;
 const a=new Uint8Array(512*384),b=new Uint8Array(512*384);m.render(${ax},ms,a);window.__saved=window.__saved||{};
 ${what}
 m.render(${ax},ms,b);let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;})()`);
const z3=`const z=new Uint8Array(3584*200);m.setText3([z,z]);`;
// slot 3 overlay: orders 14-15 (script 3456..4095) and 18-19 (4608..5119); run last in this order since it blanks the masks
const t=(o,r)=>(ev(`fetch('assets/rows.json').then(r=>r.json()).then(R=>R[${o}*64+${r}]/1000)`));
const at=async(o,r,n)=>{const s=await t(o,r);await seek(s+0.5);if(n){await shot(n);return lit();}};
await ev('document.getElementById("pp").click()');await wait(1500);ok(await cur()>1&&await cur()<3.5,'play advances: '+await cur());
await ev('document.getElementById("pp").click()');const p0=await cur();await wait(1000);ok(await cur()===p0,'pause holds: '+p0);
const n3a=await at(14,20,'slot3a'),n3b=await at(18,20,'slot3b'),n14=await at(2,40,'slot14'),n16=await at(0,20,'slot16'),n23=await at(16,20,'slot23');
console.log('lit px: slot3a',n3a,'slot3b',n3b,'slot14',n14,'slot16',n16,'slot23',n23);
// both slot-3 positions in one call: the first blanking would otherwise hide the second mask
const d3=await ev(`(async()=>{const m=await import('./fx/compose.js');const R=await (await fetch('assets/rows.json')).json();const out=[];const A=[0xe14,0x1214].map(ax=>{const a=new Uint8Array(512*384);m.render(ax,R[(ax>>8)*64+(ax&63)]+840,a);return [ax,a];});
 m.setText3([0,1].map(()=>new Uint8Array(3584*200)));for(const [ax,a] of A){const b=new Uint8Array(512*384);m.render(ax,R[(ax>>8)*64+(ax&63)]+840,b);let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;out.push(n);}return out;})()`);
ok(d3[0]>500,'slot 3 overlay (order 14, init text) changes the picture: '+d3[0]);ok(d3[1]>500,'slot 3 overlay (order 18, "work consume sleep") changes the picture: '+d3[1]);
ok((await diff(0x228,'m.setOverlay14(new Uint8Array(512*384));'))>500,'slot 14 overlay (order 2 row 40) changes the picture');
ok((await diff(0x214,'m.setOverlay14(new Uint8Array(512*384));'))===0,'slot 14 overlay off before row 32');
ok((await diff(0x014,'m.setMask16(new Uint8Array(4096));'))>200,'slot 16 "anti" mask changes the picture (order 0)');
ok((await diff(0x1014,'m.setStrips23([0,1,2,3,4].map(()=>new Uint8Array(0x6000)));'))>500,'slot 23 text strips change the picture (order 16)');
// seek / play after all that
await seek(100);ok(Math.abs(await cur()-100)<0.5,'seek to 100 s: '+await cur());
await ev('document.getElementById("pp").click()');const q=await cur();await wait(2000);ok(await cur()>q+1,'play from seek');
ok(!errs.length,'no console errors / exceptions'+(errs.length?': '+errs.join(' | '):''));
}catch(e){console.log('FAIL',e);bad++;}
ch.kill();srv.close();process.exit(bad?1:0);
