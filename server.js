require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const PHONE_ID = process.env.PHONE_NUMBER_ID || "";
const TOKEN = process.env.WHATSAPP_TOKEN || "";
const APP_SECRET = process.env.META_APP_SECRET || "";
let messages = [], contacts = new Map(), sent = 0, received = 0;
let automation = {
 welcome: "Hello! Welcome to our business. Type MENU to see options.",
 fallback: "Sorry, I did not understand. Type MENU to see available options.",
 menu: "Welcome! Please choose:\n1. Product prices\n2. Customer support\n3. Business hours\n4. Talk to a person"
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
 res.sendStatus(200);
 processWebhook(body).catch(e=>console.error("Webhook:",e.message));
});
app.use(express.json({limit:"1mb"}));
function admin(req,res,next){if(!ADMIN_KEY||req.get("x-admin-key")!==ADMIN_KEY)return res.status(401).json({error:"Unauthorized. Check your admin key."});next()}
async function waSend(to,text){
 if(!TOKEN||!PHONE_ID)throw new Error("WhatsApp Cloud API is not configured. Add WHATSAPP_TOKEN and PHONE_NUMBER_ID in Render.");
 const response=await fetch("https://graph.facebook.com/"+VERSION+"/"+PHONE_ID+"/messages",{method:"POST",headers:{Authorization:"Bearer "+TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to,type:"text",text:{preview_url:false,body:text}})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error?.message||"WhatsApp API error "+response.status);
 sent++;messages.unshift({time:new Date().toISOString(),direction:"OUT",phone:to,text,status:"accepted"});
 return data;
}
async function processWebhook(body){
 for(const entry of body.entry||[])for(const change of entry.changes||[]){
  const value=change.value||{};
  for(const m of value.messages||[]){
   const phone=m.from;if(!phone)continue;
   const text=m.text?.body||("["+m.type+" message]");
   received++;messages.unshift({time:new Date().toISOString(),direction:"IN",phone,text,status:"received"});
   contacts.set(phone,{phone,lastMessage:text,lastSeen:new Date().toISOString()});
   if(m.type==="text")await reply(phone,text);
  }
 }
 messages=messages.slice(0,500);
}
async function reply(to,text){
 const t=text.trim().toLowerCase();let answer=automation.fallback;
 if(["hi","hello","hey","vanakkam","வணக்கம்","ஹாய்"].includes(t))answer=automation.welcome;
 else if(["menu","0","மெனு"].includes(t))answer=automation.menu;
 else if(t==="1"||t.includes("price")||t.includes("விலை"))answer="Please tell us which product or service you need the price for.";
 else if(t==="2"||t.includes("support")||t.includes("help"))answer="Please describe your issue. Our support team will assist you.";
 else if(t==="3"||t.includes("hours")||t.includes("நேரம்"))answer="Our business hours: Monday to Saturday, 9:00 AM to 6:00 PM.";
 else if(t==="4"||t.includes("human")||t.includes("agent"))answer="Your request has been noted. A team member will contact you.";
 await waSend(to,answer);
}
app.get("/api/admin/status",admin,(_req,res)=>res.json({ok:true,received,sent,contacts:contacts.size,configured:!!(TOKEN&&PHONE_ID)}));
app.get("/api/admin/messages",admin,(_req,res)=>res.json({messages:messages.slice(0,150)}));
app.get("/api/admin/contacts",admin,(_req,res)=>res.json({contacts:[...contacts.values()].sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen))}));
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
