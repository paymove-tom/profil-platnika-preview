import sys, json
from playwright.sync_api import sync_playwright
OLD=sys.argv[1]; NEW=sys.argv[2]; OUT=sys.argv[3]
R=[x['h'] for x in json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'typo_routes.json')))]
if len(sys.argv)>4: R=[x for x in R if x in sys.argv[4].split(',')]
P=['font-family','font-size','font-weight','line-height','letter-spacing','color','text-transform','font-style','font-variant-numeric','font-feature-settings','word-spacing','text-wrap','text-decoration-line','white-space','font-stretch','-webkit-text-fill-color','text-shadow','font-optical-sizing','font-kerning','text-rendering','font-synthesis']
JS="""(P)=>{const out={};const seen={};
const els=[...document.querySelectorAll('body *')].filter(e=>{if(e.closest('.pm-foot,.dn-tip,script,style,svg'))return false;
 if(['INPUT','TEXTAREA','BUTTON','SELECT'].includes(e.tagName))return true;
 return [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.replace(/[\\s\\u00a0]/g,'').length)});
for(const e of els){const si=e.closest('.states-item'); if(si&&si.getAttribute('href')===location.hash)continue;
 const txt=(e.tagName==='INPUT'||e.tagName==='TEXTAREA')?('['+(e.placeholder||e.value||'')+']'):[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
 let norm=txt.replace(/[\\s\\u00a0\\u202f\\u2009\\u2060]+/g,' ').trim().slice(0,60); if(!norm)norm='@'+(e.getAttribute('aria-label')||e.className);
 let tg=e.tagName.toLowerCase(); if(tg==='button')tg='a'; let k=tg+'|'+norm; seen[k]=(seen[k]||0)+1; k+='#'+seen[k];
 const cs=getComputedStyle(e);const o={};for(const p of P)o[p]=cs.getPropertyValue(p);o.__raw=txt.trim().slice(0,80);out[k]=o}
return out}"""
ALIAS={'#/portfel/dodaj-blik':'#/onboarding/3','#/portfel/dodaj-blik/info':'#/onboarding/3/info','#/portfel/dodaj-blik/checkout':'#/onboarding/3/checkout'}
def grab(b,base,r):
    c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1,reduced_motion='reduce')
    pg=c.new_page(); pg.goto(base+'?demo=1&shot=1'+r); pg.wait_for_timeout(1400)
    d=pg.evaluate(JS,P); h=pg.evaluate('location.hash'); c.close(); return d,h
res={'routes':{},'total_diff':0,'only_old':0,'only_new':0,'text_raw_diff':0}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for r in R:
        o,ho=grab(b,OLD,ALIAS.get(r,r)); n,hn=grab(b,NEW,r)
        diffs=[];raw=[]
        for k in o:
            if k in n:
                dd={pp:[o[k][pp],n[k][pp]] for pp in P if o[k][pp]!=n[k][pp]}
                if dd: diffs.append({'el':k,'d':dd})
                if o[k]['__raw']!=n[k]['__raw']: raw.append([k,o[k]['__raw'],n[k]['__raw']])
        oo=[k for k in o if k not in n]; on=[k for k in n if k not in o]
        res['routes'][r]={'hash':[ho,hn],'diffs':diffs,'raw':raw,'only_old':oo,'only_new':on}
        res['total_diff']+=len(diffs);res['only_old']+=len(oo);res['only_new']+=len(on);res['text_raw_diff']+=len(raw)
        print(r,len(diffs),'raw',len(raw),'old-only',len(oo),'new-only',len(on),flush=True)
    b.close()
json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
print('TOTAL',res['total_diff'],'raw',res['text_raw_diff'],'only_old',res['only_old'],'only_new',res['only_new'])
