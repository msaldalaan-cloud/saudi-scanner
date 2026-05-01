// api/cron.js — Vercel Pro Cron Job
// يقرأ الاستراتيجيات من Upstash Redis ويفحص بإعدادات كل واحدة

const API_KEY     = process.env.SAHMK_API_KEY;
const EMAILJS_PK  = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_SID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TID = process.env.EMAILJS_TEMPLATE_ID;
const KV_URL      = process.env.KV_REST_API_URL;
const KV_TOKEN    = process.env.KV_REST_API_TOKEN;
const BASE_URL    = 'https://app.sahmk.sa/api/v1';
const STRAT_KEY   = 'saudi_scanner_strategies';

// ─── Upstash helpers ──────────────────────────────
async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  let val = data.result;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch {}
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch {}
    }
  }
  return val;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

// ─── كامل السوق ───────────────────────────────────────
const FULL_MARKET = [
  {sym:'1010',name:'الرياض المالية',sector:'البنوك'},
  {sym:'1020',name:'بنك الجزيرة',sector:'البنوك'},
  {sym:'1030',name:'السعودي الفرنسي',sector:'البنوك'},
  {sym:'1050',name:'البريطاني السعودي',sector:'البنوك'},
  {sym:'1060',name:'البنك السعودي للاستثمار',sector:'البنوك'},
  {sym:'1080',name:'العربي الوطني',sector:'البنوك'},
  {sym:'1120',name:'الراجحي',sector:'البنوك'},
  {sym:'1140',name:'الأهلي السعودي',sector:'البنوك'},
  {sym:'1150',name:'بنك الرياض',sector:'البنوك'},
  {sym:'1180',name:'الأول',sector:'البنوك'},
  {sym:'1214',name:'الإنماء',sector:'البنوك'},
  {sym:'1302',name:'الخليج الدولي',sector:'البنوك'},
  {sym:'2030',name:'بترو رابغ',sector:'الطاقة'},
  {sym:'2222',name:'أرامكو السعودية',sector:'الطاقة'},
  {sym:'2310',name:'المتقدمة للحفر',sector:'الطاقة'},
  {sym:'2380',name:'بابكو',sector:'الطاقة'},
  {sym:'2001',name:'المصافي',sector:'المواد'},
  {sym:'2010',name:'سابك',sector:'المواد'},
  {sym:'2020',name:'الصناعات الكيماوية',sector:'المواد'},
  {sym:'2050',name:'سافكو',sector:'المواد'},
  {sym:'2060',name:'ينساب',sector:'المواد'},
  {sym:'2070',name:'المجموعة السعودية',sector:'المواد'},
  {sym:'2080',name:'الدمام للأنابيب',sector:'المواد'},
  {sym:'2090',name:'ميبكو',sector:'المواد'},
  {sym:'2100',name:'أميانتيت',sector:'المواد'},
  {sym:'2130',name:'المتحدة للأسمنت',sector:'المواد'},
  {sym:'2150',name:'ينبع للأسمنت',sector:'المواد'},
  {sym:'2160',name:'الجوف للأسمنت',sector:'المواد'},
  {sym:'2170',name:'أبو قير للأسمدة',sector:'المواد'},
  {sym:'2180',name:'الزامل للصناعة',sector:'المواد'},
  {sym:'2190',name:'سبكيم',sector:'المواد'},
  {sym:'2210',name:'نماء للكيماويات',sector:'المواد'},
  {sym:'2230',name:'صناعة الكابلات',sector:'المواد'},
  {sym:'2240',name:'زجاج',sector:'المواد'},
  {sym:'2300',name:'أسمنت القصيم',sector:'المواد'},
  {sym:'2330',name:'مجموعة الصناعات',sector:'المواد'},
  {sym:'2340',name:'الصناعات الوطنية',sector:'المواد'},
  {sym:'2350',name:'الحديد والصلب',sector:'المواد'},
  {sym:'2360',name:'سالكو',sector:'المواد'},
  {sym:'2381',name:'بي إس إف',sector:'المواد'},
  {sym:'4110',name:'أسمنت',sector:'المواد'},
  {sym:'4320',name:'أنابيب',sector:'المواد'},
  {sym:'4001',name:'الاتصالات السعودية',sector:'الاتصالات'},
  {sym:'4004',name:'موبايلي',sector:'الاتصالات'},
  {sym:'4007',name:'زين السعودية',sector:'الاتصالات'},
  {sym:'4031',name:'بيانات',sector:'الاتصالات'},
  {sym:'4020',name:'دار الأركان',sector:'العقارات'},
  {sym:'4090',name:'المملكة القابضة',sector:'العقارات'},
  {sym:'4220',name:'إعمار',sector:'العقارات'},
  {sym:'4230',name:'التعمير',sector:'العقارات'},
  {sym:'4240',name:'اعمار المدينة',sector:'العقارات'},
  {sym:'4250',name:'البلد',sector:'العقارات'},
  {sym:'4260',name:'أملاك',sector:'العقارات'},
  {sym:'4261',name:'روشن',sector:'العقارات'},
  {sym:'4270',name:'طيبة',sector:'العقارات'},
  {sym:'4280',name:'ديار',sector:'العقارات'},
  {sym:'4003',name:'جرير',sector:'التجزئة'},
  {sym:'4008',name:'بن داود',sector:'التجزئة'},
  {sym:'4009',name:'العثيم',sector:'التجزئة'},
  {sym:'4012',name:'المراكز العربية',sector:'التجزئة'},
  {sym:'4014',name:'ساكو',sector:'التجزئة'},
  {sym:'4190',name:'ألشيا',sector:'التجزئة'},
  {sym:'4192',name:'لازوردي',sector:'التجزئة'},
  {sym:'4193',name:'أسواق عبدالله',sector:'التجزئة'},
  {sym:'4040',name:'دله الصحية',sector:'الصحة'},
  {sym:'4130',name:'بوبا العربية',sector:'الصحة'},
  {sym:'4140',name:'نادك',sector:'الصحة'},
  {sym:'4160',name:'الحمادي',sector:'الصحة'},
  {sym:'4170',name:'المتقدمة الطبية',sector:'الصحة'},
  {sym:'4180',name:'الموارد الطبية',sector:'الصحة'},
  {sym:'4330',name:'سلامة',sector:'الصحة'},
  {sym:'6001',name:'النهدي الطبي',sector:'الصحة'},
  {sym:'2270',name:'المراعي',sector:'الأغذية'},
  {sym:'6010',name:'سافكو للزراعة',sector:'الأغذية'},
  {sym:'6013',name:'الزيتون',sector:'الأغذية'},
  {sym:'6050',name:'أنعام القابضة',sector:'الأغذية'},
  {sym:'6060',name:'نقاء للمياه',sector:'الأغذية'},
  {sym:'8010',name:'التعاونية',sector:'التأمين'},
  {sym:'8020',name:'ميد غلف',sector:'التأمين'},
  {sym:'8030',name:'الأهلي تكافل',sector:'التأمين'},
  {sym:'8040',name:'الإتحاد التجاري',sector:'التأمين'},
  {sym:'8050',name:'وفا تأمين',sector:'التأمين'},
  {sym:'8060',name:'الراجحي تكافل',sector:'التأمين'},
  {sym:'8070',name:'التأمين العام',sector:'التأمين'},
  {sym:'8080',name:'الخليجية للتأمين',sector:'التأمين'},
  {sym:'8100',name:'ملاذ',sector:'التأمين'},
  {sym:'8120',name:'الإعادة السعودية',sector:'التأمين'},
  {sym:'8140',name:'صالحية',sector:'التأمين'},
  {sym:'8150',name:'بوبا',sector:'التأمين'},
  {sym:'8160',name:'ريلاينس',sector:'التأمين'},
  {sym:'8170',name:'أيان',sector:'التأمين'},
  {sym:'8180',name:'سنبل',sector:'التأمين'},
  {sym:'8190',name:'سولا',sector:'التأمين'},
  {sym:'8200',name:'ساب تكافل',sector:'التأمين'},
  {sym:'8210',name:'السعودية للتأمين',sector:'التأمين'},
  {sym:'8230',name:'ضمان',sector:'التأمين'},
  {sym:'8240',name:'أليانز',sector:'التأمين'},
  {sym:'8250',name:'ساجر',sector:'التأمين'},
  {sym:'8260',name:'صروح',sector:'التأمين'},
  {sym:'8270',name:'إخلاص',sector:'التأمين'},
  {sym:'8280',name:'عناية',sector:'التأمين'},
  {sym:'2082',name:'أكوا باور',sector:'المرافق'},
  {sym:'5110',name:'كهرباء',sector:'المرافق'},
  {sym:'5111',name:'المياه الوطنية',sector:'المرافق'},
  {sym:'4080',name:'النقل الوطنية',sector:'النقل'},
  {sym:'4030',name:'ناقلات',sector:'النقل'},
  {sym:'1211',name:'رأس المال الأول',sector:'الاستثمار'},
  {sym:'1820',name:'مجموعة تداول',sector:'الاستثمار'},
  {sym:'3001',name:'النمر',sector:'البناء'},
  {sym:'3010',name:'المسيليح',sector:'البناء'},
  {sym:'3020',name:'أبناء حسن',sector:'البناء'},
  {sym:'3030',name:'الرواد',sector:'البناء'},
  {sym:'3040',name:'الثقة',sector:'البناء'},
  {sym:'3050',name:'المرشد',sector:'البناء'},
  {sym:'3060',name:'الزهراء',sector:'البناء'},
  {sym:'3090',name:'الحكير',sector:'البناء'},
  {sym:'6004',name:'موفنبيك',sector:'الفنادق'},
  {sym:'6005',name:'سمو',sector:'الفنادق'},
  {sym:'4500',name:'ثمار',sector:'الزراعة'},
  {sym:'4501',name:'العُلا للزراعة',sector:'الزراعة'},
  {sym:'4502',name:'الجوف',sector:'الزراعة'},
  {sym:'4503',name:'الروضة',sector:'الزراعة'},
  {sym:'4504',name:'نخيل',sector:'الزراعة'},
];

// ─── أوقات السوق ──────────────────────────────────────
function isSaudiMarketOpen() {
  const r = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Riyadh'}));
  const t = r.getHours()*60 + r.getMinutes();
  return r.getDay()>=0 && r.getDay()<=4 && t>=595 && t<935;
}

// ─── جلب شمعات ────────────────────────────────────────
async function fetchCandles(sym, period) {
  try {
    const to = new Date(), from = new Date();
    if      (period==='daily')   from.setFullYear(from.getFullYear()-2);
    else if (period==='weekly')  from.setFullYear(from.getFullYear()-7);
    else if (period==='monthly') from.setFullYear(from.getFullYear()-25);
    const url = `${BASE_URL}/historical/${sym}/?period=${period}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`;
    const res = await fetch(url,{headers:{'X-API-Key':API_KEY,'Accept':'application/json'},signal:AbortSignal.timeout(10000)});
    const text = await res.text();
    if(!text||text.trim().startsWith('<')) return null;
    const json = JSON.parse(text);
    const candles = json?.data||json?.results||json?.candles||[];
    if(candles.length<60) return null;
    const sorted = [...candles].sort((a,b)=>new Date(a.date)-new Date(b.date));

    // ── شمعة الإطار الحالية الحية ──
    try{
      const qRes=await fetch(`${BASE_URL}/quote/${sym}/`,{headers:{'X-API-Key':API_KEY,'Accept':'application/json'},signal:AbortSignal.timeout(5000)});
      const qText=await qRes.text();
      if(!qText.trim().startsWith('<')){
        const q=JSON.parse(qText);
        if(q?.price){
          const lp=parseFloat(q.price), lh=parseFloat(q.high||q.price), ll=parseFloat(q.low||q.price), lo=parseFloat(q.open||q.price);
          const today=new Date();
          const todayStr=today.toISOString().split('T')[0];
          const lastDate=(sorted[sorted.length-1]?.date||'').split('T')[0];

          if(period==='daily'){
            const live={date:todayStr,open:lo,high:lh,low:ll,close:lp};
            if(lastDate===todayStr) sorted[sorted.length-1]=live; else sorted.push(live);

          } else if(period==='weekly'){
            const dayOfWeek=today.getDay();
            const weekStart=new Date(today); weekStart.setDate(today.getDate()-dayOfWeek);
            const weekStartStr=weekStart.toISOString().split('T')[0];
            // جلب شمعات هذا الأسبوع
            const wRes=await fetch(`${BASE_URL}/historical/${sym}/?period=daily&from=${weekStartStr}&to=${todayStr}`,{headers:{'X-API-Key':API_KEY,'Accept':'application/json'},signal:AbortSignal.timeout(8000)});
            const wText=await wRes.text();
            let wHigh=lh,wLow=ll,wOpen=lo;
            if(!wText.trim().startsWith('<')){
              const wData=JSON.parse(wText);
              const wC=wData?.data||wData?.results||[];
              if(wC.length>0){wHigh=Math.max(...wC.map(c=>parseFloat(c.high)),lh);wLow=Math.min(...wC.map(c=>parseFloat(c.low)),ll);wOpen=parseFloat(wC[0].open);}
            }
            const live={date:weekStartStr,open:wOpen,high:wHigh,low:wLow,close:lp};
            if(lastDate>=weekStartStr) sorted[sorted.length-1]=live; else sorted.push(live);

          } else if(period==='monthly'){
            const monthStart=new Date(today.getFullYear(),today.getMonth(),1);
            const monthStartStr=monthStart.toISOString().split('T')[0];
            const mRes=await fetch(`${BASE_URL}/historical/${sym}/?period=daily&from=${monthStartStr}&to=${todayStr}`,{headers:{'X-API-Key':API_KEY,'Accept':'application/json'},signal:AbortSignal.timeout(8000)});
            const mText=await mRes.text();
            let mHigh=lh,mLow=ll,mOpen=lo;
            if(!mText.trim().startsWith('<')){
              const mData=JSON.parse(mText);
              const mC=mData?.data||mData?.results||[];
              if(mC.length>0){mHigh=Math.max(...mC.map(c=>parseFloat(c.high)),lh);mLow=Math.min(...mC.map(c=>parseFloat(c.low)),ll);mOpen=parseFloat(mC[0].open);}
            }
            const live={date:monthStartStr,open:mOpen,high:mHigh,low:mLow,close:lp};
            if(lastDate>=monthStartStr) sorted[sorted.length-1]=live; else sorted.push(live);
          }
        }
      }
    }catch(e){}

    return {closes:sorted.map(c=>parseFloat(c.close)),highs:sorted.map(c=>parseFloat(c.high)),lows:sorted.map(c=>parseFloat(c.low)),last:sorted[sorted.length-1]};
  } catch { return null; }
}

// ─── DMA(10,50,10) ────────────────────────────────────
function calcDMA(closes) {
  if(closes.length<62) return null;
  const sma=(arr,p,i)=>arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p;
  const dl=[];
  for(let i=49;i<closes.length;i++) dl.push(sma(closes,10,i)-sma(closes,50,i));
  if(dl.length<12) return null;
  const k=2/11; let sig=dl.slice(0,10).reduce((a,b)=>a+b,0)/10;
  const sl=[sig];
  for(let i=10;i<dl.length;i++){sig=dl[i]*k+sig*(1-k);sl.push(sig);}
  const n=dl.length-1,sn=sl.length-1;
  const isCrossover=dl[n-1]<sl[sn-1]&&dl[n]>sl[sn];
  return{curDma:dl[n],curSig:sl[sn],isPositive:dl[n]>sl[sn],isCrossover,isBearish:dl[n]<sl[sn]};
}

// ─── Stoch ────────────────────────────────────────────
function calcStoch(highs,lows,closes,kP=5,dP=3,sl=3) {
  const n=closes.length;
  if(n<kP+sl+dP+2) return null;
  const rawK=[];
  for(let i=kP-1;i<n;i++){
    const hh=Math.max(...highs.slice(i-kP+1,i+1));
    const ll=Math.min(...lows.slice(i-kP+1,i+1));
    rawK.push(hh===ll?50:((closes[i]-ll)/(hh-ll))*100);
  }
  const smoothK=[];
  for(let i=sl-1;i<rawK.length;i++)
    smoothK.push(rawK.slice(i-sl+1,i+1).reduce((a,b)=>a+b,0)/sl);
  const D=[];
  for(let i=dP-1;i<smoothK.length;i++)
    D.push(smoothK.slice(i-dP+1,i+1).reduce((a,b)=>a+b,0)/dP);
  if(smoothK.length<2||D.length<2) return null;
  const curK=smoothK[smoothK.length-1],prevK=smoothK[smoothK.length-2];
  const curD=D[D.length-1],prevD=D[D.length-2];
  return{curK,curD,prevK,prevD,
    isPositive:curK>curD,isCrossover:prevK<prevD&&curK>curD,isBearish:curK<curD};
}

// ─── SMA50 ────────────────────────────────────────────
function aboveSMA50(closes) {
  if(closes.length<50) return null;
  return closes[closes.length-1]>closes.slice(-50).reduce((a,b)=>a+b,0)/50;
}

// ─── فحص سهم بإعدادات استراتيجية معينة ───────────────
async function scanStockForStrategy(stock, strategy) {
  const {dmaTFs=[], stochTFs=[], dmaOn=false, stochOn=false,
         dmaSMAPerTF={}, stochSMAPerTF={},
         crossPerTF={}, stochK=5, stochD=3, stochS=3,
         triggerMode='both'} = strategy;

  // جمع كل الإطارات المطلوبة بدون تكرار
  const allTFs = [...new Set([
    ...(dmaOn?dmaTFs:[]),
    ...(stochOn?stochTFs:[])
  ])];

  const periodMap = {M:'monthly',W:'weekly',D:'daily'};

  // جلب البيانات
  const tfData = {};
  await Promise.all(allTFs.map(async tf => {
    tfData[tf] = await fetchCandles(stock.sym, periodMap[tf]);
  }));

  // إشارات DMA
  const dmaSigs = {};
  if(dmaOn) dmaTFs.forEach(tf => {
    const d = tfData[tf];
    dmaSigs[tf] = d ? calcDMA(d.closes) : null;
  });

  // إشارات Stoch
  const stochSigs = {};
  if(stochOn) stochTFs.forEach(tf => {
    const d = tfData[tf];
    stochSigs[tf] = d ? calcStoch(d.highs,d.lows,d.closes,stochK,stochD,stochS) : null;
  });

  // SMA50
  const sma50 = {};
  allTFs.forEach(tf => {
    const d = tfData[tf];
    sma50[tf] = d ? aboveSMA50(d.closes) : null;
  });

  // السعر والتغيير
  const dayData = tfData['D'] || tfData['W'] || tfData['M'];
  const price = dayData?.last ? parseFloat(dayData.last.close) : 0;
  const prev  = dayData ? dayData.closes[dayData.closes.length-2] : 0;
  const chg   = prev ? +((price-prev)/prev*100).toFixed(2) : 0;

  // ── تطبيق منطق MTF ──
  function checkIndicator(sigs, tfs, smaPerTF, crossPTF, isSMA) {
    if(!tfs||tfs.length===0) return null;
    const trigTF = tfs[tfs.length-1];
    const condTFs = tfs.slice(0,-1);

    // تقاطع على الزناد = شرط أساسي
    if(!sigs[trigTF]?.isCrossover) return false;

    // فلتر التقاطع (cross threshold للـ Stoch)
    if(crossPTF?.[trigTF]?.enabled) {
      if(sigs[trigTF].curK >= crossPTF[trigTF].val) return false;
    }

    // SMA50 على الزناد
    if(smaPerTF?.[trigTF] && sma50[trigTF]===false) return false;

    // الإطارات الأبطأ = شروط الاتجاه
    for(const tf of condTFs) {
      if(!sigs[tf]?.isPositive) return false;
      if(smaPerTF?.[tf] && sma50[tf]===false) return false;
    }
    return true;
  }

  const dmaPass   = dmaOn   ? checkIndicator(dmaSigs, dmaTFs, dmaSMAPerTF, null, true) : null;
  const stochPass = stochOn ? checkIndicator(stochSigs, stochTFs, stochSMAPerTF, crossPerTF, false) : null;

  // منطق triggerMode
  let hasSignal = false;
  if(triggerMode==='dma')   hasSignal = dmaPass===true;
  else if(triggerMode==='stoch') hasSignal = stochPass===true;
  else hasSignal = (dmaOn&&stochOn) ? (dmaPass===true&&stochPass===true) : (dmaPass===true||stochPass===true);

  if(!hasSignal) return null;

  // بناء تفاصيل الإشارة
  const signals = [];
  if(dmaPass===true) {
    const trigTF = dmaTFs[dmaTFs.length-1];
    signals.push({type:'DMA', tf:trigTF, detail:`DMA=${dmaSigs[trigTF]?.curDma?.toFixed(2)}`});
  }
  if(stochPass===true) {
    const trigTF = stochTFs[stochTFs.length-1];
    signals.push({type:'Stoch', tf:trigTF, detail:`K=${stochSigs[trigTF]?.curK?.toFixed(0)} D=${stochSigs[trigTF]?.curD?.toFixed(0)}`});
  }

  return {sym:stock.sym, name:stock.name, sector:stock.sector, price, chg, sma50, signals};
}

// ─── معالجة متوازية ───────────────────────────────────
async function parallelScan(stocks, strategy, concurrency=10) {
  const results = [];
  for(let i=0; i<stocks.length; i+=concurrency) {
    const batch = stocks.slice(i, i+concurrency);
    const settled = await Promise.allSettled(batch.map(s=>scanStockForStrategy(s,strategy)));
    settled.forEach(r=>{if(r.status==='fulfilled'&&r.value) results.push(r.value);});
    if(i+concurrency<stocks.length) await new Promise(r=>setTimeout(r,300));
  }
  return results;
}

// ─── إرسال إيميل ──────────────────────────────────────
async function sendAlert(toEmail, strategyName, signals, scanTime) {
  if(!EMAILJS_SID||!EMAILJS_TID||!toEmail||!signals.length) return false;
  const TF_AR = {M:'شهري',W:'أسبوعي',D:'يومي'};
  const list = signals.map((s,i)=>
    `${i+1}. ${s.sym} — ${s.name} (${s.sector})\n` +
    `   السعر: ${s.price?.toFixed(2)} ر.س | ${s.chg>=0?'+':''}${s.chg}%\n` +
    `   ${s.signals.map(x=>`⚡ ${x.type} ${TF_AR[x.tf]||x.tf}: ${x.detail}`).join(' | ')}`
  ).join('\n\n');

  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  try {
    const payload = {
      service_id:  EMAILJS_SID,
      template_id: EMAILJS_TID,
      template_params: {
        to_email:      toEmail,
        strategy_name: strategyName,
        scan_date:     new Date().toLocaleDateString('ar-SA'),
        scan_time:     scanTime,
        total_signals: signals.length,
        total_scanned: FULL_MARKET.length,
        stocks_list:   list,
        results_table: list,
        entry_signals: signals.length,
        total_results: signals.length,
      },
    };

    // Server-side يحتاج accessToken (Private Key)
    if(privateKey) payload.accessToken = privateKey;
    else payload.user_id = EMAILJS_PK;

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(`EmailJS [${res.status}]:`, text);
    return res.status === 200;
  } catch(e) {
    console.error('EmailJS error:', e.message);
    return false;
  }
}

// ─── MAIN ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const isCron   = !!req.headers['x-vercel-cron'];
  const isManual = req.method==='GET';
  if(!isCron&&!isManual) return res.status(401).json({error:'Unauthorized'});

  // تحقق من أوقات السوق (اسمح بالاختبار اليدوي دائماً)
  if(isCron && !isSaudiMarketOpen()) {
    return res.status(200).json({status:'skipped',reason:'السوق مغلق',time:new Date().toLocaleTimeString('ar-SA')});
  }

  if(!API_KEY) return res.status(500).json({error:'SAHMK_API_KEY غير مضبوط'});

  // ── جلب الاستراتيجيات من Upstash ──
  let strategies = [];
  try {
    const raw = await kvGet(STRAT_KEY);
    strategies = Array.isArray(raw) ? raw : [];
  } catch(e) {
    return res.status(500).json({error:'فشل قراءة الاستراتيجيات', details:e.message});
  }

  if(!strategies.length) {
    return res.status(200).json({
      status:'no_strategies',
      message:'لا توجد استراتيجيات محفوظة — لن يتم الفحص',
    });
  }

  const start = Date.now();
  const scanTime = new Date().toLocaleTimeString('ar-SA');
  const report = [];

  // ── فحص كل استراتيجية ──
  for(const strategy of strategies) {
    if(!strategy.active) continue;

    console.log(`[${scanTime}] فحص استراتيجية: ${strategy.name}`);
    const signals = await parallelScan(FULL_MARKET, strategy, 10);

    // ── تحقق من الإشارات الجديدة فقط ──
    const prevKey = `prev_signals_${strategy.id}`;
    let newSignals = signals;
    try {
      const prevRaw = await kvGet(prevKey);
      const prevSyms = Array.isArray(prevRaw) ? prevRaw : [];
      // الإشارات الجديدة = أسهم لم تكن في الفحص السابق
      newSignals = signals.filter(s => !prevSyms.includes(s.sym));
      console.log(`[${scanTime}] ${strategy.name}: ${signals.length} إشارة، ${newSignals.length} جديدة`);
    } catch(e) {
      // لو فشل القراءة، أرسل كل الإشارات
      newSignals = signals;
    }

    // احفظ الإشارات الحالية للمقارنة في الفحص القادم
    try {
      await kvSet(prevKey, signals.map(s => s.sym));
    } catch(e) {}

    let emailSent = false;
    if(newSignals.length > 0 && strategy.alertEmail) {
      emailSent = await sendAlert(strategy.alertEmail, strategy.name, newSignals, scanTime);
    }

    report.push({
      strategy:    strategy.name,
      email:       strategy.alertEmail,
      signals:     signals.length,
      new_signals: newSignals.length,
      email_sent:  emailSent,
      results:     newSignals,
    });

    console.log(`[${scanTime}] ${strategy.name}: ${signals.length} إشارة، ${newSignals.length} جديدة${emailSent?' — إيميل أُرسل':''}`);
  }

  const elapsed = ((Date.now()-start)/1000).toFixed(1);

  return res.status(200).json({
    status:'ok', time:scanTime, elapsed:`${elapsed}s`,
    strategies_checked: strategies.length,
    report,
  });
}
