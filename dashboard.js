const $=id=>document.getElementById(id);
const fmt=v=>v==null?'—':new Intl.NumberFormat('id-ID',{maximumFractionDigits:3}).format(v);
const months=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('id-ID',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1))));
const meta=new Map(dataset.groups.flatMap(([,items])=>items.map(row=>[row[0],row])));
const descriptions={
 sales:'Target dan realisasi penjualan total kumulatif (GWh).',
 trafo:'Jumlah gangguan trafo bulanan dari tab Keandalan JTM.',
 kubikel:'Jumlah gangguan kubikel bulanan dari tab Keandalan JTM.',
 switch:'Data switching tersendiri belum tersedia pada workbook.',
 inv:'Data penyerapan investasi distribusi tersendiri belum tersedia pada workbook.',
 op:'Data penyerapan operasi distribusi tersendiri belum tersedia pada workbook.',
 rkap:'Pencapaian RKAP mengikuti rumus Range pada workbook.',
 mvod:'Nilai KPI dalam persen, mengikuti satuan kontrak.',
 mttr:'Nilai KPI dalam persen, mengikuti satuan kontrak.'
};
let group=0, selected='sales', view='trend';
const option=(value,label)=>'<option value="'+value+'">'+label+'</option>';
$('unit').innerHTML=dataset.units.map(u=>option(u,u)).join('');
$('month').innerHTML=months.map((m,i)=>option(i+1,m+' 2026')).join('');
$('month').value='10';
const unit=()=>$('unit').value;
const month=()=>Number($('month').value);
const values=(u,m,k)=>overrides[u+'|'+m+'|'+k]??dataset.records[u+'|'+m+'|'+k]??[null,null];
const targetText=(k,v)=>fmt(v);
function achievement(k,t,a){
 if(t==null||a==null)return null;
 const polarity=meta.get(k)[3];
 if(polarity==='range'){
  if(t===0)return a===0?100:0;
  const ratio=a/t;
  return ratio>=.95&&ratio<=1?100:ratio*100;
 }
 if(polarity==='up')return t===0?110:a/t*100;
 if(a===0)return 110;
 return t===0?0:Math.max(0,2-a/t)*100;
}
const percent=value=>value==null?'—':new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(value)+'%';
function status(k,t,a){
 if(a==null)return ['Belum ada data','muted'];
 if(t==null)return ['Target kosong','muted'];
 const score=achievement(k,t,a);
 return score>=100?['Baik','good']:score>=95?['Hati-hati','warn']:['Masalah','bad'];
}
function chart(points){
 const nums=points.flatMap(p=>p.values).filter(v=>v!=null);
 if(!nums.length)return '<p class="empty">Belum ada angka untuk ditampilkan pada pilihan ini.</p>';
 const hi=Math.max(0,...nums),lo=Math.min(0,...nums);
 const min=lo*1.1,max=hi*1.1||1;
 const step=520/points.length,x=i=>64+(i+.5)*step,y=v=>209-174*(v-min)/(max-min);
 const type=$('type').value;
 let markup='<svg viewBox="0 0 610 242" role="img" aria-label="Grafik target dan realisasi">';
 for(let i=0;i<=4;i++){
  const v=min+(max-min)*i/4, p=y(v);
  markup+='<path d="M64 '+p+'H584" stroke="#dce6ed"/><text x="58" y="'+(p+4)+'" text-anchor="end" font-size="9" fill="#496477">'+fmt(v)+'</text>';
 }

 points.forEach((p,i)=>{markup+='<text x="'+x(i)+'" y="230" text-anchor="middle" font-size="10" fill="#496477">'+p.short+'</text>'});
 for(const [n,color] of [[0,'#527795'],[1,'#007b71']]){
  points.forEach((p,i)=>{
   const v=p.values[n];if(v==null)return;
   const label='<title>'+p.label+' · '+(n?'Realisasi':'Target')+' '+fmt(v)+'</title>';
   if(type==='bar'){
    const w=Math.min(17,step*.29), left=x(i)+(n-.5)*(w+2)-w/2;
    markup+='<rect x="'+left+'" y="'+Math.min(y(v),y(0))+'" width="'+w+'" height="'+Math.max(1,Math.abs(y(v)-y(0)))+'" fill="'+color+'">'+label+'</rect>';
    return;
   }
   const prev=points[i-1]?.values[n];
   if(type==='line'&&prev!=null)markup+='<path d="M'+x(i-1)+' '+y(prev)+'L'+x(i)+' '+y(v)+'" stroke="'+color+'" stroke-width="2.5" '+(n?'':'stroke-dasharray="5 4"')+'/>';
   markup+='<circle cx="'+(x(i)+(type==='dot'?(n-.5)*10:0))+'" cy="'+y(v)+'" r="4" fill="'+color+'">'+label+'</circle>';
  });
 }
 return markup+'</svg>';
}
function render(){
 const [groupTitle,items]=dataset.groups[group];
 $('groupTitle').textContent=groupTitle;
 $('periodLabel').textContent=months[month()-1]+' 2026 · '+unit();
 $('groups').innerHTML=dataset.groups.map(([name],i)=>'<button data-group="'+i+'" aria-pressed="'+(i===group)+'">'+name+'</button>').join('');
 $('kpis').innerHTML=items.map(([k,name,satuan])=>{
  const [t,a]=values(unit(),month(),k),[label,cls]=status(k,t,a);
  return '<tr><td><button data-kpi="'+k+'" aria-pressed="'+(k===selected)+'">'+name+'<small>'+satuan+'</small></button></td><td>'+targetText(k,t)+'</td><td><strong>'+fmt(a)+'</strong></td><td>'+percent(achievement(k,t,a))+'</td><td class="'+cls+'">'+label+'</td></tr>';
 }).join('');
 const [,name,satuan]=meta.get(selected);
 $('title').textContent=name;
 $('basis').textContent=descriptions[selected]??'Satuan '+satuan+' · nilai periode sesuai rekap workbook.';
 for(const button of $('views').querySelectorAll('button'))button.setAttribute('aria-pressed',String(view===button.dataset.view));
 const points=view==='trend'?months.map((label,i)=>({label,short:label.slice(0,3),values:values(unit(),i+1,selected)})):
  dataset.units.slice(1).map(u=>({label:u,short:u.slice(4),values:values(u,month(),selected)}));
 $('axis').textContent=view==='trend'?'Bulan':'Unit';
 $('chart').innerHTML=chart(points);
 $('chartTable').innerHTML=points.map(p=>'<tr><td>'+p.label+'</td><td>'+targetText(selected,p.values[0])+'</td><td>'+fmt(p.values[1])+'</td><td>'+percent(achievement(selected,...p.values))+'</td><td class="'+status(selected,...p.values)[1]+'">'+status(selected,...p.values)[0]+'</td></tr>').join('');
}
for(const id of ['unit','month','type'])$(id).onchange=render;
$('groups').onclick=e=>{const b=e.target.closest('[data-group]');if(b){group=Number(b.dataset.group);selected=dataset.groups[group][1][0][0];render();$('groups').querySelector('[aria-pressed=true]').focus()}};
$('kpis').onclick=e=>{const b=e.target.closest('[data-kpi]');if(b){selected=b.dataset.kpi;render();$('kpis').querySelector('[aria-pressed=true]').focus()}};
$('views').onclick=e=>{const b=e.target.closest('[data-view]');if(b){view=b.dataset.view;render()}};
$('print').onclick=()=>window.print();
const columns=['periode','unit','kode_indikator','indikator','satuan','target','realisasi','pencapaian_%','status'];
const overrides={};
const storageKey='up3-jayapura-distribusi-2026-import';
try {
 const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');
 for(const [key,pair] of Object.entries(stored||{})){
  if(Object.hasOwn(dataset.records,key)&&Array.isArray(pair)&&pair.length===2&&pair.every(v=>v===null||(Number.isFinite(v)&&v>=0)))overrides[key]=pair;
 }
}catch{}
function csvRows(text){
 text=text.replace(/^\uFEFF/,'');
 const sep=text.split(/\r?\n/,1)[0].includes(';')?';':',';
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'&&quoted&&text[i+1]==='"'){value+='"';i++;continue}
  if(c==='"'&&(quoted||value==='')){quoted=!quoted;continue}
  if(!quoted&&(c===sep||c==='\n'||c==='\r')){
   row.push(value);value='';
   if(c!==sep){rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++}
  }else value+=c;
 }
 if(quoted)throw Error('Kutipan pada CSV belum ditutup.');
 row.push(value);rows.push(row);
 return rows;
}
function decodeRows(rows){
 const nonempty=rows.filter(r=>r.some(v=>String(v??'').trim()));
 const headers=(nonempty.shift()||[]).map(v=>String(v??'').trim().toLowerCase());
 const mandatory=['periode','unit','kode_indikator','target','realisasi'];
 if(mandatory.some(k=>headers.indexOf(k)<0||headers.indexOf(k)!==headers.lastIndexOf(k)))throw Error('Gunakan kolom wajib pada template impor.');
 const changes={};
 for(const [index,row] of nonempty.entries()){
  const field=k=>String(row[headers.indexOf(k)]??'').trim();
  const period=field('periode').match(/^2026-(0[1-9]|1[0-2])$/);
  const u=field('unit').toUpperCase(), k=field('kode_indikator').toLowerCase();
  const key=u+'|'+Number(period?.[1])+'|'+k;
  const fail=message=>{throw Error('Baris data '+(index+1)+' · '+message)};
  if(!Object.hasOwn(dataset.records,key))fail('Periode, unit, atau kode indikator tidak dikenal.');
  const input=['target','realisasi'].map(field);
  if(input.every(v=>v===''))continue;
  if(Object.hasOwn(changes,key))fail('Kombinasi periode, unit, dan indikator duplikat.');
  changes[key]=input.map((v,i)=>{
   if(v==='')return values(u,Number(period[1]),k)[i];
   if(!/^\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i.test(v)||!Number.isFinite(Number(v.replace(',','.'))))fail('Gunakan angka tanpa pemisah ribuan.');
   return Number(v.replace(',','.'));
  });
 }
 if(!Object.keys(changes).length)throw Error('Isi minimal satu nilai target atau realisasi.');
 return changes;
}
function workbookReader(buffer){
 const data=new DataView(buffer);const files=new Map();
 let end=buffer.byteLength-22, lower=Math.max(0,end-65535);
 while(end>=lower&&data.getUint32(end,true)!==0x06054b50)end--;
 if(end<lower)throw Error('Arsip Excel tidak valid.');
 let p=data.getUint32(end+16,true);
 const decoder=new TextDecoder();
 for(let i=0;i<data.getUint16(end+10,true);i++){
  if(data.getUint32(p,true)!==0x02014b50)throw Error('Direktori Excel tidak valid.');
  const length=data.getUint16(p+28,true);
  const name=decoder.decode(new Uint8Array(buffer,p+46,length));
  files.set(name,[data.getUint32(p+42,true),data.getUint32(p+20,true),data.getUint32(p+24,true),data.getUint16(p+10,true)]);
  p+=46+length+data.getUint16(p+30,true)+data.getUint16(p+32,true);
 }
 return async name=>{
  if(!files.has(name))return null;
  const [offset,size,unpacked,method]=files.get(name);
  if(unpacked>16*1024*1024||data.getUint32(offset,true)!==0x04034b50)throw Error('Komponen Excel terlalu besar atau tidak valid.');
  const start=offset+30+data.getUint16(offset+26,true)+data.getUint16(offset+28,true);
  const bytes=new Uint8Array(buffer,start,size);
  if(method===0)return decoder.decode(bytes);
  if(method!==8)throw Error('Kompresi Excel tidak didukung.');
  let inflate;
  try{inflate=new DecompressionStream('deflate-raw')}catch{throw Error('Gunakan Chrome atau Edge terbaru untuk membuka XLSX, atau simpan sebagai CSV.')}
  return new Response(new Blob([bytes]).stream().pipeThrough(inflate)).text();
 };
}
const tags=(doc,name)=>Array.from(doc.getElementsByTagNameNS('*',name));
function parseXml(text){
 if(!text)throw Error('Komponen Excel tidak lengkap.');
 const doc=new DOMParser().parseFromString(text,'application/xml');
 if(tags(doc,'parsererror').length)throw Error('Isi Excel tidak valid.');
 return doc;
}
async function xlsxRows(buffer){
 const read=workbookReader(buffer);
 const sheets=tags(parseXml(await read('xl/workbook.xml')),'sheet');
 const sheet=sheets.find(s=>s.getAttribute('name').toLowerCase()==='data')??sheets[0];
 if(!sheet)throw Error('Lembar data Excel tidak ditemukan.');
 const id=Array.from(sheet.attributes).find(a=>a.localName==='id')?.value;
 const links=tags(parseXml(await read('xl/_rels/workbook.xml.rels')),'Relationship');
 const path=links.find(link=>link.getAttribute('Id')===id)?.getAttribute('Target');
 if(!path)throw Error('Tautan lembar Excel tidak ditemukan.');
 const doc=parseXml(await read(new URL(path,'https://xlsx.invalid/xl/workbook.xml').pathname.slice(1)));
 const shared=await read('xl/sharedStrings.xml');
 const str=node=>tags(node,'t').map(t=>t.textContent).join('');
 const strings=shared?tags(parseXml(shared),'si').map(str):[];
 return tags(doc,'row').map(row=>{
  const result=[];
  for(const cell of tags(row,'c')){
   const col=cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0];if(!col)continue;
   const index=[...col].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
   const type=cell.getAttribute('t'), v=tags(cell,'v')[0]?.textContent??'';
   result[index]=type==='s'?strings[Number(v)]??'':type==='inlineStr'?str(cell):v;
  }
  return result;
 });
}
function spreadsheetUrl(value){
 const url=new URL(value);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Gunakan tautan HTTP atau HTTPS tanpa kredensial.');
 if(url.hostname!=='docs.google.com')return url;
 const gid=url.searchParams.get('gid')??new URLSearchParams(url.hash.slice(1)).get('gid')??'0';
 const published=url.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]+)\//);
 const normal=url.pathname.match(/^\/spreadsheets\/d\/([\w-]+)\//);
 if(published)return new URL('/spreadsheets/d/e/'+published[1]+'/pub?output=csv&gid='+encodeURIComponent(gid),url.origin);
 if(normal)return new URL('/spreadsheets/d/'+normal[1]+'/gviz/tq?tqx=out:csv&gid='+encodeURIComponent(gid),url.origin);
 return url;
}
async function readImport(blob,name){
 if(blob.size>10*1024*1024)throw Error('Ukuran file maksimal 10 MB.');
 if(/\.xlsx$/i.test(name)||blob.type.includes('spreadsheetml'))return xlsxRows(await blob.arrayBuffer());
 const text=await blob.text();
 if(text.trimStart().startsWith('<'))throw Error('Tautan membuka halaman web. Gunakan tautan ekspor CSV atau unggah file.');
 return csvRows(text);
}
async function importFrom(load){
 const feedback=$('importFeedback');
 const buttons=$('importDialog').querySelectorAll('button');
 buttons.forEach(b=>b.disabled=true);
 feedback.textContent='Membaca data…';
 try{
  const changes=decodeRows(await load()), keys=Object.keys(changes);
  const existing=keys.filter(k=>(overrides[k]??dataset.records[k]).some(v=>v!==null)).length;
  if(existing&&!confirm(existing+' entri dengan nilai yang sudah ada akan diperbarui. Lanjutkan?')){feedback.textContent='Impor dibatalkan.';return}
  localStorage.setItem(storageKey,JSON.stringify({...overrides,...changes}));
  Object.assign(overrides,changes);
  const [u,m,k]=keys[0].split('|');
  $('unit').value=u;$('month').value=m;
  group=dataset.groups.findIndex(([,items])=>items.some(([id])=>id===k));selected=k;
  render();$('importDialog').close();
  $('notice').textContent=keys.length+' entri diimpor dan disimpan di browser ini.';
 }catch(error){feedback.textContent=error.message||'Impor gagal.'}
 finally{buttons.forEach(b=>b.disabled=false)}
}
function downloadTable(blank){
 const rows=[columns];
 for(const u of dataset.units)for(let m=1;m<=12;m++)for(const [k,name,unit] of meta.values()){
  const [t,a]=blank?[null,null]:values(u,m,k);
  rows.push(['2026-'+String(m).padStart(2,'0'),u,k,name,unit,t,a,achievement(k,t,a),blank?'':status(k,t,a)[0]]);
 }
 const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=blank?'Template_Impor_UP3_Jayapura_2026.csv':'Ekspor_Kinerja_UP3_Jayapura_2026.csv';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('import').onclick=()=>{$('importFeedback').textContent='';$('importDialog').showModal()};
$('importClose').onclick=()=>$('importDialog').close();
$('importFileButton').onclick=()=>$('importFile').click();
$('template').onclick=()=>downloadTable(true);
$('export').onclick=()=>downloadTable(false);
$('importFile').onchange=e=>{
 const file=e.target.files[0];e.target.value='';
 if(file)importFrom(()=>readImport(file,file.name));
};
$('linkForm').onsubmit=e=>{
 e.preventDefault();
 importFrom(async()=>{
  const url=spreadsheetUrl($('sheetLink').value);
  let response;
  try{response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(20000)})}
  catch{throw Error('Tautan tidak dapat dibaca. Periksa akses atau unggah file Excel/CSV.')}
  if(!response.ok)throw Error('Spreadsheet mengembalikan HTTP '+response.status+'.');
  return readImport(await response.blob(),url.pathname);
 });
};

render();
