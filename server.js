require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const PHONE_ID = process.env.PHONE_NUMBER_ID || "";
const TOKEN = process.env.WHATSAPP_TOKEN || "";
const APP_SECRET = process.env.META_APP_SECRET || "";
const MEDIA_DIR = process.env.MEDIA_DIR || path.join("/tmp", "ammu-media");
fs.mkdirSync(MEDIA_DIR,{recursive:true});
let messages=[], contacts=new Map(), mediaItems=[], sent=0, received=0;
let automation={
 welcome:"வணக்கம்! AMMU WhatsApp Bot-க்கு வரவேற்கிறோம். MENU என அனுப்பி வசதிகளைப் பாருங்கள்.",
 fallback:"மன்னிக்கவும், புரியவில்லை. MENU என அனுப்புங்கள்.",
 menu:"🤖 AMMU WHATSAPP BOT\n\n1️⃣ Song Search – SONG பாடல் பெயர்\n2️⃣ Sticker Maker – படத்துடன் STICKER caption\n3️⃣ Media Saver – படம்/வீடியோ அனுப்புங்கள்; Bot சேமிக்கும்\n\nஉதவி: HELP"
};
app.use(cors({origin:true}));
app.get("/health",(_req,res)=>res.json({ok:true,service:"AMMU WhatsApp Bot"}));
app.get("/webhook",(req,res)=>{
 const mode=req.query["hub.mode"],token=req.query["hub.verify_token"],challenge=req.query["hub.challenge"];
 if(mode==="subscribe"&&token&&token===VERIFY_TOKEN)return res.status(200).send(challenge);
 return res.sendStatus(403);
});
app.use("/webhook",express.raw({type:"application/json"}));
app.post("/webhook",(req,res)=>{
 const raw=req.body;
 if(APP_SECRET){
  const signature=req.get("x-hub-signature-256")||"";
  const expected="sha256="+crypto.createHmac("sha256",APP_SECRET).update(raw).digest("hex");
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.sendStatus(401);
 }
 let body;try{body=JSON.parse(raw.toString("utf8"))}catch{return res.sendStatus(400)}
 res.sendStatus(200);processWebhook(body).catch(e=>console.error("Webhook:",e.message));
});
app.use(express.json({limit:"1mb"}));
function admin(req,res,next){if(!ADMIN_KEY||req.get("x-admin-key")!==ADMIN_KEY)return res.status(401).json({error:"Unauthorized. Check your admin key."});next()}
async function graph(pathname,options={}){
 if(!TOKEN)throw new Error("Add WHATSAPP_TOKEN in Render.");
 const r=await fetch("https://graph.facebook.com/"+VERSION+"/"+pathname,{...options,headers:{Authorization:"Bearer "+TOKEN,...(options.headers||{})}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error?.message||"Meta API error "+r.status);
 return data;
}
async function waSend(to,text){
 if(!PHONE_ID)throw new Error("Add PHONE_NUMBER_ID in Render.");
 const data=await graph(PHONE_ID+"/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to,type:"text",text:{preview_url:true,body:text}})});
 sent++;messages.unshift({time:new Date().toISOString(),direction:"OUT",phone:to,text,status:"accepted"});return data;
}
async function downloadMedia(mediaId){
 const meta=await graph(mediaId);
 const r=await fetch(meta.url,{headers:{Authorization:"Bearer "+TOKEN}});
 if(!r.ok)throw new Error("Could not download WhatsApp media.");
 const buf=Buffer.from(await r.arrayBuffer());
 if(buf.length>16*1024*1024)throw new Error("Media exceeds the 16 MB bot storage limit.");
 return {buffer:buf,mime:meta.mime_type||"application/octet-stream"};
}
async function uploadWhatsAppMedia(buffer,mime,filename){
 const form=new FormData();
 form.append("messaging_product","whatsapp");
 form.append("type",mime);
 form.append("file",new Blob([buffer],{type:mime}),filename);
 const r=await fetch("https://graph.facebook.com/"+VERSION+"/"+PHONE_ID+"/media",{method:"POST",headers:{Authorization:"Bearer "+TOKEN},body:form});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(d.error?.message||"Media upload failed.");
 return d.id;
}
async function sendSticker(to,buffer){
 const webp=await sharp(buffer).rotate().resize(512,512,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).webp({quality:82}).toBuffer();
 const id=await uploadWhatsAppMedia(webp,"image/webp","ammu-sticker.webp");
 await graph(PHONE_ID+"/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"sticker",sticker:{id}})});
 sent++;messages.unshift({time:new Date().toISOString(),direction:"OUT",phone:to,text:"[Sticker sent]",status:"accepted"});
}
async function songSearch(to,query){
 if(!query){await waSend(to,"🎵 Song search செய்ய: SONG <பாடல் பெயர்> என்று அனுப்புங்கள்.\nஉதா: SONG Shape of You");return}
 const url="https://itunes.apple.com/search?term="+encodeURIComponent(query)+"&entity=song&limit=5";
 const r=await fetch(url);if(!r.ok)throw new Error("Song search is temporarily unavailable.");
 const d=await r.json();
 if(!d.results?.length){await waSend(to,"இந்தப் பெயரில் பாடல் கிடைக்கவில்லை. வேறு பெயரில் முயற்சிக்கவும்.");return}
 const lines=d.results.map((x,i)=>(i+1)+". "+x.trackName+" – "+x.artistName+"\nListen: "+x.trackViewUrl+(x.previewUrl?"\nPreview: "+x.previewUrl:"")).join("\n\n");
 await waSend(to,"🎵 SONG SEARCH RESULTS\n\n"+lines+"\n\nகுறிப்பு: இவை அதிகாரப்பூர்வ listening/preview links. அனுமதியில்லாத முழுப் பாடல் பதிவிறக்கத்தை Bot வழங்காது.");
}
async function processWebhook(body){
 for(const entry of body.entry||[])for(const change of entry.changes||[]){
  const value=change.value||{};
  for(const m of value.messages||[]){
   const phone=m.from;if(!phone)continue;
   const text=m.text?.body||m.image?.caption||m.video?.caption||("["+m.type+" message]");
   received++;messages.unshift({time:new Date().toISOString(),direction:"IN",phone,text,status:"received"});
   contacts.set(phone,{phone,lastMessage:text,lastSeen:new Date().toISOString()});
   if(m.type==="image"||m.type==="video"){
    try{
     const media=await downloadMedia(m.image?.id||m.video?.id);
     const ext=media.mime.includes("png")?".png":media.mime.includes("webp")?".webp":media.mime.includes("mp4")?".mp4":media.mime.includes("3gpp")?".3gp":".jpg";
     const name=Date.now()+"-"+crypto.randomBytes(4).toString("hex")+ext;
     fs.writeFileSync(path.join(MEDIA_DIR,name),media.buffer);
     mediaItems.unshift({id:name,phone,type:m.type,mime:media.mime,size:media.buffer.length,time:new Date().toISOString()});
     mediaItems=mediaItems.slice(0,200);
     if(m.type==="image"&&/^\s*sticker\b/i.test(m.image?.caption||"")){
      await sendSticker(phone,media.buffer);
     } else await waSend(phone,"✅ உங்கள் "+(m.type==="image"?"படம்":"வீடியோ")+" சேமிக்கப்பட்டது. தேவையெனில் மீண்டும் அனுப்பலாம்.");
    }catch(e){console.error("Media handling:",e.message);await waSend(phone,"Media-வை சேமிக்க முடியவில்லை: "+e.message).catch(()=>{})}
   } else if(m.type==="text")await reply(phone,text);
  }
 }
 messages=messages.slice(0,500);
}
async function reply(to,text){
 const t=text.trim(),lower=t.toLowerCase();
 if(lower==="menu"||lower==="0"||lower==="help"||t==="மெனு"){await waSend(to,automation.menu);return}
 if(/^song\s*/i.test(t)){await songSearch(to,t.replace(/^song\s*/i,"").trim());return}
 if(["hi","hello","hey","vanakkam","வணக்கம்","ஹாய்"].includes(lower)){await waSend(to,automation.welcome);return}
 if(lower==="1"||lower.includes("song")){await songSearch(to,"");return}
 if(lower==="2"||lower.includes("sticker")){await waSend(to,"🎨 Sticker உருவாக்க: ஒரு Photo அனுப்பி caption-ல் STICKER என்று எழுதுங்கள். Bot அதை WhatsApp sticker-ஆக மாற்றி அனுப்பும்.");return}
 if(lower==="3"||lower.includes("media")){await waSend(to,"🖼️ Image அல்லது Video-வை Bot-க்கு அனுப்புங்கள். அது சேமிக்கப்படும். சேமிக்கப்பட்டவை Admin Dashboard-ல் பார்க்கலாம்.");return}
 await waSend(to,automation.fallback);
}
app.get("/api/admin/status",admin,(_req,res)=>res.json({ok:true,received,sent,contacts:contacts.size,media:mediaItems.length,configured:!!(TOKEN&&PHONE_ID)}));
app.get("/api/admin/messages",admin,(_req,res)=>res.json({messages:messages.slice(0,150)}));
app.get("/api/admin/contacts",admin,(_req,res)=>res.json({contacts:[...contacts.values()].sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen))}));
app.get("/api/admin/media",admin,(_req,res)=>res.json({media:mediaItems}));
app.get("/api/admin/media/:id",admin,(req,res)=>{
 const item=mediaItems.find(x=>x.id===req.params.id);if(!item)return res.sendStatus(404);
 const file=path.join(MEDIA_DIR,item.id);if(!fs.existsSync(file))return res.status(404).json({error:"Media file is no longer available; Render temporary storage may have reset."});
 res.type(item.mime);res.sendFile(file);
});
app.post("/api/admin/send",admin,async(req,res)=>{
 const {to,message}=req.body||{};if(!to||!message)return res.status(400).json({error:"Recipient and message are required."});
 try{const result=await waSend(String(to).replace(/\D/g,""),String(message).slice(0,4096));res.json({ok:true,result})}catch(e){res.status(502).json({error:e.message})}
});
app.get("/api/admin/automation",admin,(_req,res)=>res.json(automation));
app.post("/api/admin/automation",admin,(req,res)=>{
 for(const k of ["welcome","fallback","menu"])if(typeof req.body[k]==="string")automation[k]=req.body[k].slice(0,2000);
 res.json({ok:true,automation});
});
app.listen(PORT,()=>console.log("AMMU WhatsApp Bot listening on "+PORT));