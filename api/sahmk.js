const API_KEY=process.env.SAHMK_API_KEY;
const BASE_URL='https://app.sahmk.sa/api/v1';
module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(!API_KEY) return res.status(500).json({error:'SAHMK_API_KEY غير مضبوط'});
  const{path='quote/2222',...params}=req.query;
  if(path.includes('historical')&&!params.from){
    const to=new Date(),from=new Date();
    const p=params.period||'daily';
    if(p==='daily') from.setFullYear(from.getFullYear()-7);
    else if(p==='weekly') from.setFullYear(from.getFullYear()-7);
    else from.setFullYear(from.getFullYear()-25);
    params.from=from.toISOString().split('T')[0];
    params.to=to.toISOString().split('T')[0];
  }
  const url=new URL(`${BASE_URL}/${path}/`);
  if(params.from) params.from=params.from.split('T')[0];
  if(params.to) params.to=params.to.split('T')[0];
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  try{
    const r=await fetch(url.toString(),{headers:{'X-API-Key':API_KEY,'Accept':'application/json'}});
    const text=await r.text();
    if(!text||text.trim().startsWith('<')) return res.status(502).json({error:'sahmk رجع HTML'});
    const data=JSON.parse(text);
    res.setHeader('Cache-Control','s-maxage=60');
    return res.status(r.status).json(data);
  }catch(e){return res.status(502).json({error:'فشل الاتصال',details:e.message});}
};
