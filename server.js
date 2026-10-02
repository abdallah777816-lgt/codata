import express from "express";
import cors from "cors";

const app=express();
app.use(cors());
app.use(express.json({limit:"100kb"}));
const PORT=process.env.PORT||3000;
const CACHE_TTL=1000*60*60*12;
const cache=new Map();

const ENDPOINTS=[
 "https://overpass.private.coffee/api/interpreter",
 "https://overpass-api.de/api/interpreter",
 "https://overpass.kumi.systems/api/interpreter"
];

const activityMap={
 pharmacy:['["amenity"="pharmacy"]'],
 hospital:['["amenity"="hospital"]','["healthcare"="clinic"]'],
 restaurant:['["amenity"="restaurant"]','["amenity"="cafe"]'],
 hotel:['["tourism"="hotel"]'],
 bank:['["amenity"="bank"]'],
 accounting:['["office"="accountant"]'],
 legal:['["office"="lawyer"]'],
 real_estate:['["office"="estate_agent"]'],
 car:['["shop"="car"]','["shop"="car_repair"]','["shop"="car_parts"]'],
 supermarket:['["shop"="supermarket"]','["shop"="convenience"]'],
 it:['["office"="it"]','["shop"="computer"]'],
 travel:['["shop"="travel_agency"]']
};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function clean(s){return String(s||"").replace(/["\\]/g,"").slice(0,100)}
function query(cc,region,filter,keyword){
 cc=String(cc||"").replace(/[^A-Z]/g,"").slice(0,2);
 region=clean(region); keyword=clean(keyword);
 let a=`area["ISO3166-1"="${cc}"][admin_level=2]->.country;`, target="area.country";
 if(region){a+=`area(area.country)["boundary"="administrative"][~"^name(:ar|:en)?$"~"^${region}$",i]->.region;`;target="area.region";}
 const nf=keyword?`["name"~"${keyword}",i]`:"";
 return `[out:json][timeout:20];${a}(nwr${filter}${nf}(${target}););out tags center 150;`;
}
async function fetchJSON(url,q,ms=28000){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);
 try{
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","user-agent":"SWP-Business-Data/1.0"},body:"data="+encodeURIComponent(q),signal:ctrl.signal});
  if(!r.ok) throw Error("HTTP "+r.status);
  return await r.json();
 }finally{clearTimeout(timer)}
}
async function run(q){
 let last;
 for(const endpoint of ENDPOINTS){
  for(let n=0;n<2;n++){
   try{return await fetchJSON(endpoint,q)}
   catch(e){last=e; await sleep(700*(n+1))}
  }
 }
 throw last||Error("Data source unavailable");
}
function normalize(elements,activity,country,region){
 const out=[],seen=new Set();
 for(const x of elements||[]){
  const t=x.tags||{},name=t.name||t["name:ar"]||t["name:en"];
  if(!name)continue;
  const phone=t.phone||t["contact:phone"]||"",mobile=t.mobile||t["contact:mobile"]||"";
  const website=t.website||t["contact:website"]||"",email=t.email||t["contact:email"]||"";
  const key=(name+"|"+phone+"|"+mobile+"|"+website).toLowerCase();
  if(seen.has(key))continue;seen.add(key);
  out.push({country,region,name,activity,email,phone,mobile,website,source:"OpenStreetMap"});
 }
 return out;
}
app.get("/api/health",(req,res)=>res.json({ok:true,service:"SWP Business Data API"}));
app.get("/api/search",async(req,res)=>{
 const cc=String(req.query.country||"").toUpperCase(),region=clean(req.query.region),activity=clean(req.query.activity),keyword=clean(req.query.keyword),countryName=clean(req.query.countryName)||cc;
 if(!/^[A-Z]{2}$/.test(cc)||!activity)return res.status(400).json({error:"country and activity are required"});
 const key=[cc,region,activity,keyword].join("|").toLowerCase(),hit=cache.get(key);
 if(hit&&Date.now()-hit.time<CACHE_TTL)return res.json({...hit.data,cached:true});
 const filters=activityMap[activity]||[`["name"~"${clean(activity)}",i]`];
 let all=[],warnings=[];
 for(const f of filters){
  try{const d=await run(query(cc,region,f,keyword));all.push(...normalize(d.elements,activity,countryName,region))}
  catch(e){warnings.push(String(e.message||e))}
 }
 const seen=new Set(); all=all.filter(r=>{const k=(r.name+"|"+r.phone+"|"+r.mobile+"|"+r.website).toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
 const data={ok:true,count:all.length,results:all,warnings};
 if(all.length)cache.set(key,{time:Date.now(),data});
 res.json(data);
});
app.listen(PORT,()=>console.log(`SWP API running on ${PORT}`));
