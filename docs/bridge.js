/* Tadka bridge: replaces the Claude artifact runtime with
   Supabase (login + sync) and the Anthropic API (import, grams, calories). */
(function(){
  const LSC="cbs-connection";
  const conf=()=>{const c=window.CBS_CONFIG||{};let s={};try{s=JSON.parse(localStorage.getItem(LSC)||"{}")}catch(e){}
    return {url:c.supabaseUrl||s.url||"",key:c.supabaseAnonKey||s.key||"",model:c.model||"claude-sonnet-5-5"}};
  let sb=null,uid=null,settings={};const docs=new Map();const subs=[];let ready,readyRes;ready=new Promise(r=>readyRes=r);

  /* ---------- styles + UI ---------- */
  const css=`.cbs-ov{position:fixed;inset:0;z-index:9999;background:rgba(30,26,22,.55);display:flex;align-items:center;justify-content:center;padding:16px;padding-top:max(16px,env(safe-area-inset-top));font-family:inherit}
  .cbs-card{background:#fff;color:#2b2622;border-radius:18px;width:100%;max-width:420px;max-height:90vh;overflow:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:grid;gap:12px}
  .cbs-card h2{margin:0;font-size:1.35rem}.cbs-card p{margin:0;color:#6b625a;font-size:.92rem;line-height:1.45}
  .cbs-card label{display:grid;gap:5px;font-weight:600;font-size:.88rem}
  .cbs-card input{font:inherit;padding:11px 12px;border:1px solid #ddd3c8;border-radius:10px;width:100%;box-sizing:border-box}
  .cbs-row{display:flex;gap:8px;flex-wrap:wrap}.cbs-b{font:inherit;font-weight:700;border-radius:10px;padding:11px 16px;border:1px solid #ddd3c8;background:#fff;color:#2b2622;cursor:pointer;min-height:44px}
  .cbs-b.p{background:#e2604a;border-color:#e2604a;color:#fff}.cbs-b:disabled{opacity:.5}.cbs-msg{font-size:.88rem;color:#b3402c;min-height:1em}
  .cbs-sep{border:0;border-top:1px solid #eee5dc;margin:4px 0}
  .cbs-acct{position:fixed;top:max(10px,env(safe-area-inset-top));right:12px;z-index:900;width:40px;height:40px;border-radius:50%;border:1px solid #ddd3c8;background:#fff;color:#2b2622;cursor:pointer;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .cbs-acct svg{width:20px;height:20px}`;
  function addCss(){if(document.getElementById("cbs-css"))return;const s=document.createElement("style");s.id="cbs-css";s.textContent=css;document.head.appendChild(s)}
  function modal(html){addCss();const o=document.createElement("div");o.className="cbs-ov";o.innerHTML=`<div class="cbs-card" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(o);return o}
  const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  function setupScreen(){return new Promise(res=>{
    const o=modal(`<h2>Connect Tadka</h2><p>Paste the two values from your Supabase project (Project Settings → API). Tip: put them in docs/config.js instead, so no device ever asks.</p>
    <label>Project URL<input id="cbs-u" placeholder="https://xxxx.supabase.co" autocomplete="off"></label>
    <label>Anon public key<input id="cbs-k" placeholder="eyJhbGciOi…" autocomplete="off"></label>
    <div class="cbs-msg" id="cbs-m"></div><div class="cbs-row"><button class="cbs-b p" id="cbs-go">Continue</button></div>`);
    o.querySelector("#cbs-go").onclick=()=>{const u=o.querySelector("#cbs-u").value.trim().replace(/\/+$/,""),k=o.querySelector("#cbs-k").value.trim();
      if(!/^https:\/\/.+/.test(u)||k.length<40){o.querySelector("#cbs-m").textContent="Check both values. The URL starts with https:// and the key is long.";return}
      localStorage.setItem(LSC,JSON.stringify({url:u,key:k}));o.remove();res()}})}

  function loginScreen(){return new Promise(res=>{
    const o=modal(`<h2>Sign in</h2><p>Use the same email and password on your Mac and iPhone so your recipes stay in sync.</p>
    <label>Email<input id="cbs-e" type="email" autocomplete="username"></label>
    <label>Password<input id="cbs-p" type="password" autocomplete="current-password"></label>
    <div class="cbs-msg" id="cbs-m"></div>
    <div class="cbs-row"><button class="cbs-b p" id="cbs-in">Sign in</button><button class="cbs-b" id="cbs-up">Create account</button></div>
    ${!(window.CBS_CONFIG||{}).supabaseUrl?`<button class="cbs-b" id="cbs-reset" style="justify-self:start;font-weight:500">Change database connection</button>`:""}`);
    const m=t=>o.querySelector("#cbs-m").textContent=t,v=()=>[o.querySelector("#cbs-e").value.trim(),o.querySelector("#cbs-p").value];
    o.querySelector("#cbs-in").onclick=async()=>{const [e,p]=v();if(!e||!p)return m("Enter your email and password.");m("Signing in…");
      const {data,error}=await sb.auth.signInWithPassword({email:e,password:p});if(error)return m(error.message);o.remove();res(data.user)};
    o.querySelector("#cbs-up").onclick=async()=>{const [e,p]=v();if(!e||p.length<8)return m("Use a password with at least 8 characters.");m("Creating your account…");
      const {data,error}=await sb.auth.signUp({email:e,password:p});if(error)return m(error.message);
      if(!data.session)return m("Check your email and click the confirmation link, then come back and tap Sign in.");o.remove();res(data.user)};
    o.querySelector("#cbs-p").onkeydown=e=>{if(e.key==="Enter")o.querySelector("#cbs-in").click()};
    const r=o.querySelector("#cbs-reset");if(r)r.onclick=()=>{localStorage.removeItem(LSC);location.reload()}})}

  /* ---------- data ---------- */
  async function loadAll(){docs.clear();for(let from=0;;from+=500){const {data,error}=await sb.from("docs").select("id,data").range(from,from+499);if(error)throw error;data.forEach(r=>docs.set(r.id,r.data));if(data.length<500)break}
    const s=docs.get("_settings");settings=s||{}}
  let et;function emit(){clearTimeout(et);et=setTimeout(()=>{const snap={empty:![...docs.keys()].some(k=>k!=="_settings"),docs:[...docs].map(([id,v])=>({id,data:()=>v}))};subs.forEach(cb=>{try{cb(snap)}catch(e){console.error(e)}})},250)}
  async function putDoc(id,data){const {error}=await sb.from("docs").upsert({user_id:uid,id,data,updated_at:new Date().toISOString()},{onConflict:"user_id,id"});if(error)throw error;docs.set(id,data)}
  async function delDoc(id){const {error}=await sb.from("docs").delete().eq("user_id",uid).eq("id",id);if(error)throw error;docs.delete(id)}
  function live(){sb.channel("docs-"+uid).on("postgres_changes",{event:"*",schema:"public",table:"docs",filter:"user_id=eq."+uid},p=>{
      if(p.eventType==="DELETE"){if(p.old&&p.old.id)docs.delete(p.old.id)}else if(p.new){docs.set(p.new.id,p.new.data);if(p.new.id==="_settings")settings=p.new.data||{}}emit()}).subscribe();
    document.addEventListener("visibilitychange",async()=>{if(document.visibilityState==="visible"){try{await loadAll();emit()}catch(e){}}})}

  /* ---------- Claude (Anthropic API) ---------- */
  const b64=blob=>new Promise((res,rej)=>{if(typeof blob==="string"){const m=blob.match(/^data:([^;]+);base64,(.*)$/);return m?res({type:m[1],data:m[2]}):rej(new Error("bad image"))}
    const r=new FileReader();r.onload=()=>{const s=String(r.result);res({type:blob.type||s.slice(5,s.indexOf(";")),data:s.slice(s.indexOf(",")+1)})};r.onerror=rej;r.readAsDataURL(blob)});
  function parseJSON(t){t=String(t||"").replace(/```json|```/g,"").trim();try{return JSON.parse(t)}catch(e){}
    const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}const c=t.indexOf("["),d=t.lastIndexOf("]");if(c>=0&&d>c){try{return JSON.parse(t.slice(c,d+1))}catch(e){}}
    const err=new Error("Claude's reply wasn't valid JSON");err.code="error";throw err}
  const sample={
    limits:async()=>({images:{maxCount:8}}),
    json:async(prompt,opts={})=>{const key=(settings.anthropicKey||"").trim();
      if(!key){openAccount("Add your Anthropic API key to use importing, grams and calories.");const e=new Error("No Anthropic API key");e.code="no_key";throw e}
      const content=[];for(const im of (opts.images||[])){const x=await b64(im);content.push({type:"image",source:{type:"base64",media_type:/^image\/(jpeg|png|gif|webp)$/.test(x.type)?x.type:"image/jpeg",data:x.data}})}
      content.push({type:"text",text:prompt+"\n\nReply with only valid JSON. No other text."});
      let res;try{res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:settings.model||conf().model,max_tokens:8000,messages:[{role:"user",content}]})})}catch(e){const er=new Error("Couldn't reach Claude. Check your internet connection.");er.code="network";throw er}
      if(!res.ok){const t=await res.text();const er=new Error(t.slice(0,300));er.code=res.status===429||res.status===529?"rate_limited":(res.status===400&&/image/i.test(t))?"image_rejected":res.status===401?"bad_key":"error";
        if(er.code==="bad_key")openAccount("Claude rejected the API key. Paste it again.");throw er}
      const d=await res.json();return parseJSON((d.content||[]).filter(c=>c.type==="text").map(c=>c.text).join(""))}};

  /* ---------- account panel ---------- */
  function openAccount(note){if(document.querySelector(".cbs-ov"))return;
    const o=modal(`<h2>Account</h2>${note?`<p style="color:#b3402c">${esc(note)}</p>`:""}<p>Signed in as <b>${esc(window.__cbsEmail||"")}</b>. ${docs.size-(docs.has("_settings")?1:0)} items synced.</p>
    <label>Anthropic API key <span style="font-weight:400;color:#6b625a">Saved to your account, so your iPhone gets it too.</span><input id="cbs-ak" type="password" value="${esc(settings.anthropicKey||"")}" placeholder="sk-ant-…" autocomplete="off"></label>
    <label>Claude model<input id="cbs-md" value="${esc(settings.model||conf().model)}"></label>
    <div class="cbs-row"><button class="cbs-b p" id="cbs-save">Save</button><button class="cbs-b" id="cbs-x">Close</button></div>
    <div class="cbs-msg" id="cbs-m"></div><hr class="cbs-sep">
    <button class="cbs-b" id="cbs-imp">Import a backup file…</button>
    <button class="cbs-b" id="cbs-out">Sign out</button><input type="file" id="cbs-f" accept=".json,application/json" hidden>`);
    const m=t=>o.querySelector("#cbs-m").textContent=t;
    o.querySelector("#cbs-x").onclick=()=>o.remove();
    o.querySelector("#cbs-save").onclick=async()=>{settings={...settings,kind:"settings",anthropicKey:o.querySelector("#cbs-ak").value.trim(),model:o.querySelector("#cbs-md").value.trim()||conf().model};
      try{await putDoc("_settings",settings);m("Saved.");setTimeout(()=>o.remove(),600)}catch(e){m(e.message)}};
    o.querySelector("#cbs-out").onclick=async()=>{await sb.auth.signOut();location.reload()};
    o.querySelector("#cbs-imp").onclick=()=>o.querySelector("#cbs-f").click();
    o.querySelector("#cbs-f").onchange=async e=>{const f=e.target.files[0];if(!f)return;let j;try{j=JSON.parse(await f.text())}catch(x){return m("That file isn't a Tadka backup.")}
      const list=Array.isArray(j.docs)?j.docs:[];if(!list.length)return m("No recipes found in that file.");
      let n=0;for(let i=0;i<list.length;i+=10){const chunk=list.slice(i,i+10).filter(d=>d&&d.id&&d.id!=="_settings").map(d=>({user_id:uid,id:d.id,data:d.data,updated_at:new Date().toISOString()}));
        const {error}=await sb.from("docs").upsert(chunk,{onConflict:"user_id,id"});if(error)return m("Stopped at item "+n+": "+error.message);chunk.forEach(c=>docs.set(c.id,c.data));n+=chunk.length;m(`Importing… ${n} of ${list.length}`)}
      m(`Imported ${n} items.`);localStorage.removeItem("cookbook-studio-v1");emit();setTimeout(()=>location.reload(),900)};
  }

  /* ---------- the runtime the app expects ---------- */
  window.claude={use:async name=>{await ready;
    if(name==="user")return {id:async()=>uid};
    if(name==="sample")return sample;
    if(name==="downloads")return {save:async({filename,data})=>{const u=URL.createObjectURL(new Blob([data],{type:/\.html?$/.test(filename)?"text/html":"application/octet-stream"}));const a=document.createElement("a");a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}};
    if(name==="db")return {collection:()=>({doc:id=>({set:d=>putDoc(id,d),delete:()=>delDoc(id)}),
      onSnapshot:(cb,err)=>{subs.push(cb);loadAll().then(emit).catch(e=>err&&err(e))}})};
    return null}};

  async function start(){addCss();let c=conf();if(!c.url||!c.key){await setupScreen();c=conf()}
    sb=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true}});
    let {data:{session}}=await sb.auth.getSession();let user=session&&session.user;if(!user)user=await loginScreen();
    uid=user.id;window.__cbsEmail=user.email;
    try{await loadAll()}catch(e){alert("Couldn't load your recipes: "+e.message+"\n\nIf this is a new database, run the setup SQL first.")}
    live();
    const b=document.createElement("button");b.className="cbs-acct";b.setAttribute("aria-label","Account and settings");b.title="Account and settings";
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>';b.onclick=()=>openAccount();document.body.appendChild(b);
    readyRes();
    if(!settings.anthropicKey&&!sessionStorage.getItem("cbs-keyhint")){sessionStorage.setItem("cbs-keyhint","1");setTimeout(()=>openAccount("Optional: add an Anthropic API key to turn on reading recipes from text, photos and new PDFs. Everything else works without it."),1200)}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
