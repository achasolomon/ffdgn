import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { blankPage, blankSection } from '../lib/website-content';
loadEnvConfig(process.cwd());
const base = process.env.CMS_TEST_URL ?? 'http://localhost:3100';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname));
const db = new PrismaClient();
const path = '/cms-verification-' + Date.now();
const hash = createHash('sha256').update(path).digest('hex');
const cookies = new Map<string,string>();
let userId: string | undefined;
async function request(route:string, options:RequestInit = {}) {
  const response = await fetch(base + route, {...options, redirect:'manual', headers:{...options.headers, Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}});
  for (const cookie of response.headers.getSetCookie()) {const pair=cookie.split(';',1)[0],split=pair.indexOf('=');cookies.set(pair.slice(0,split),pair.slice(split+1));}
  return response;
}
async function mutate(page:ReturnType<typeof blankPage>, version:number, action:string) {
  const response=await request('/api/v1/cms/website',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page,version,action})});
  return {status:response.status,payload:await response.json()};
}
async function browserWorkspace() {
  const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=9448','--user-data-dir='+mkdtempSync(join(tmpdir(),'ffdgn-cms-')),'about:blank'],{stdio:'ignore',windowsHide:true});
  const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
  let socket:WebSocket|undefined;
  try {
    let target:{webSocketDebuggerUrl:string}|undefined;
    for(let attempt=0;attempt<60;attempt++){try{const targets=await(await fetch('http://localhost:9448/json/list')).json();target=targets.find((item:{type:string})=>item.type==='page');break;}catch{await wait(250);}}
    assert.ok(target);
    socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve=>{socket!.onopen=resolve;});
    let id=0;const slots=new Map<number,(value:Record<string,unknown>)=>void>();const exceptions:string[]=[];
    socket.onmessage=event=>{const message=JSON.parse(String(event.data));if(message.id){slots.get(message.id)?.(message.result);slots.delete(message.id);}if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text);};
    const send=(method:string,params:Record<string,unknown>={})=>new Promise<Record<string,unknown>>(resolve=>{slots.set(++id,resolve);socket!.send(JSON.stringify({id,method,params}));});
    const evaluate=async(expression:string)=>((await send('Runtime.evaluate',{expression,returnByValue:true})).result as {value:unknown}).value;
    await send('Network.enable');await send('Runtime.enable');
    await send('Network.setExtraHTTPHeaders',{headers:{Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}});
    for(const width of [1440,390]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
      await send('Page.navigate',{url:base+'/admin/website'});await wait(5500);
      assert.equal(await evaluate('document.querySelectorAll(".website-builder").length'),1);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
      await evaluate('document.querySelector(".builder-section-list select").value="table";document.querySelector(".builder-section-list select").dispatchEvent(new Event("change",{bubbles:true}))');
      await wait(500);assert.equal(await evaluate('document.querySelectorAll(".builder-table").length'),1);
      const capture=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(tmpdir(),'ffdgn-cms-builder-'+width+'.png'),Buffer.from(capture.data as string,'base64'));
    }
    assert.deepEqual(exceptions,[]);console.log('Authenticated CMS browser checks passed at desktop/mobile widths; adding a table section works.');
  } finally {socket?.close();browser.kill();}
}
async function main() {
  assert.equal((await mutate(blankPage(path),0,'save')).status,401);
  const password=randomUUID()+randomUUID();
  const user=await db.user.create({data:{email:'cms-test-'+randomUUID()+'@example.invalid',name:'CMS workflow verification',passwordHash:await bcrypt.hash(password,12),role:'super_admin'}});
  userId=user.id;
  const csrf=await (await request('/api/auth/csrf')).json();
  const login=await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:csrf.csrfToken,email:user.email,password,json:'true',callbackUrl:base+'/admin/website'}).toString()});
  assert.equal(login.status,200);
  const session=await (await request('/api/auth/session')).json();assert.equal(session.user?.id,user.id,'Sign-in must issue a real session.');
  const page=blankPage(path,'Draft verification page');
  page.sections=[{...blankSection('text','overview'),title:'Overview',body:'Working page content.'},{...blankSection('table','table'),columns:['Name','Zone'],rows:[['Test member','South-East']]}];
  const first=await mutate(page,0,'save');assert.equal(first.status,200);assert.equal(first.payload.data.version,1);
  assert.equal((await request(path)).status,404);
  const preview=await request('/site-preview'+path);assert.equal(preview.status,200);assert.ok((await preview.text()).includes('Draft verification page'));
  const editor=await request('/admin/website');assert.equal(editor.status,200);assert.ok((await editor.text()).includes('Manage your website'));
  await browserWorkspace();
  assert.equal((await mutate(page,0,'save')).status,409);
  page.title='Published verification page';assert.equal((await mutate(page,1,'publish')).status,200);
  const published=await request(path);assert.equal(published.status,200);const html=await published.text();assert.ok(html.includes('Published verification page'));assert.ok(html.includes('Test member'));
  page.title='Private unpublished revision';assert.equal((await mutate(page,2,'save')).status,200);
  const current=await (await request(path)).text();assert.ok(current.includes('Published verification page'));assert.ok(!current.includes('Private unpublished revision'));
  const settings=await (await request('/api/v1/cms/settings')).json();assert.ok(!Object.keys(settings.data).some(key=>key.startsWith('website.')));
  const revisions=await (await request('/api/v1/cms/website?path='+encodeURIComponent(path))).json();assert.equal(revisions.data.length,2);
  const original=revisions.data.find((draft:{version:number})=>draft.version===1);assert.ok(original);
  assert.equal((await mutate(original.page,3,'publish')).status,200);
  await db.user.update({where:{id:user.id},data:{role:'auditor'}});assert.equal((await mutate(page,4,'save')).status,403);
  await db.user.update({where:{id:user.id},data:{role:'super_admin'}});assert.equal((await mutate(original.page,4,'unpublish')).status,200);assert.equal((await request(path)).status,404);
  console.log('CMS workflow passed: authentication, drafts, preview, public rendering, edit conflicts, revisions, permissions and unpublishing.');
}
main().finally(async()=>{
  await db.siteSetting.deleteMany({where:{OR:[{key:'website.draft.'+hash},{key:'website.published.'+hash},{key:{startsWith:'website.revision.'+hash+'.'}}]}});
  // Preserve audit evidence; revoke the test account and all its sessions.
  if(userId)await db.user.update({where:{id:userId},data:{isActive:false,passwordHash:await bcrypt.hash(randomUUID(),12),passwordChangedAt:new Date(),name:'CMS workflow verification (disabled)'}});
  await db.$disconnect();
}).catch(error=>{console.error(error instanceof Error?error.message:'Workflow failed');process.exitCode=1;});
