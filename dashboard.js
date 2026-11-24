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
let group=0, selected='sales', view='trend', page='summary';
let lastUlp=dataset.units[1];
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
const statusIcons={good:'✓',warn:'!',bad:'×',muted:'—'};
function icon(label,cls){
 return '<span class="status-icon '+cls+'" role="img" aria-label="'+label+'" title="'+label+'">'+statusIcons[cls]+'</span>';
}
function achievementCell(k,t,a){
 const [label,cls]=status(k,t,a);
 return '<td class="achievement-cell"><span class="achievement-badge '+cls+'">'+icon(label,cls)+'<strong>'+percent(achievement(k,t,a))+'</strong></span></td>';
}
$('statusLegend').innerHTML=[['Baik','good'],['Hati-hati','warn'],['Masalah','bad'],['Belum dinilai','muted']].map(([label,cls])=>'<span>'+icon(label,cls)+' '+label+'</span>').join('');
function renderUlp(){
 $('ulpTitle').textContent='Kinerja '+unit()+' · '+months[month()-1]+' 2026';
 $('ulpRows').innerHTML=dataset.groups.map(([name,items])=>'<tr class="group-row"><th scope="rowgroup" colspan="5">'+name+'</th></tr>'+items.map(([k,label,satuan])=>{
  const [t,a]=values(unit(),month(),k);
  return '<tr><td><button data-ulp-kpi="'+k+'" title="Buka grafik">'+label+'</button></td><td>'+satuan+'</td><td>'+fmt(t)+'</td><td><strong>'+fmt(a)+'</strong></td>'+achievementCell(k,t,a)+'</tr>';
 }).join('')).join('');
}
function changePage(next){
 const current=unit();
 if(current!==dataset.units[0])lastUlp=current;
 page=next;
 $('unit').innerHTML=(page==='ulp'?dataset.units.slice(1):dataset.units).map(u=>option(u,u)).join('');
 $('unit').value=page==='ulp'?lastUlp:current;
 $('summaryPage').hidden=page!=='summary';
 $('ulpPage').hidden=page!=='ulp';
 $('detailPage').hidden=page!=='detail';
 $('mapPage').hidden=page!=='map';
 $('content').scrollTop=0;
 for(const b of $('pages').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.page===page));
 render();
}
$('pages').onclick=e=>{
 const button=e.target.closest('[data-page]');
 if(button)changePage(button.dataset.page);
};
$('ulpRows').onclick=e=>{
 const button=e.target.closest('[data-ulp-kpi]');
 if(!button)return;
 selected=button.dataset.ulpKpi;
 group=dataset.groups.findIndex(([,items])=>items.some(([k])=>k===selected));
 view='trend';
 changePage('summary');
 $('kpis').querySelector('[aria-pressed=true]')?.focus();
};
function chart(points,series=['Target','Realisasi'],showCounts=false){
 const nums=points.flatMap(p=>p.values).filter(v=>v!=null);
 if(!nums.length)return '<p class="empty">Belum ada angka untuk ditampilkan pada pilihan ini.</p>';
 const hi=Math.max(0,...nums),lo=Math.min(0,...nums);
 const min=lo*1.1,max=hi*1.1||1;
 const step=520/points.length,x=i=>64+(i+.5)*step,y=v=>209-174*(v-min)/(max-min);
 const type=$('type').value;
 let markup='<svg viewBox="0 0 610 242" role="img" aria-label="Grafik '+series.join(' dan ')+'">';
 for(let i=0;i<=4;i++){
  const v=min+(max-min)*i/4, p=y(v);
  markup+='<path d="M64 '+p+'H584" stroke="#dce6ed"/><text x="58" y="'+(p+4)+'" text-anchor="end" font-size="9" fill="#496477">'+fmt(v)+'</text>';
 }

 points.forEach((p,i)=>{markup+='<text x="'+x(i)+'" y="230" text-anchor="middle" font-size="10" fill="#496477">'+p.short+'</text>'});
 for(const [n,color] of [[0,'#527795'],[1,'#007b71']]){
  points.forEach((p,i)=>{
   const v=p.values[n];if(v==null)return;
   const label='<title>'+p.label+' · '+series[n]+' '+fmt(v)+'</title>';
   if(showCounts){
    const dx=(n-.5)*(type==='bar'?Math.min(17,step*.29)+2:11);
    const close=p.values[1-n]!=null&&Math.abs(y(v)-y(p.values[1-n]))<13;
    const ty=y(v)-(close&&n===1?18:6);
    markup+='<text class="fg-count" x="'+(x(i)+dx)+'" y="'+ty+'" text-anchor="middle" fill="'+color+'" font-size="11">'+fmt(v)+'</text>';
   }
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
 requestAnimationFrame(fitSummaryDetail);
 const [groupTitle,items]=dataset.groups[group];
 $('groupTitle').textContent=groupTitle;
 $('periodLabel').textContent=months[month()-1]+' 2026 · '+unit();
 if(page==='ulp'){renderUlp();return}
 if(page==='detail'){renderDetail();return}
 if(page==='map'){$('mapBody').innerHTML=renderUlpMap();return}
 $('groups').innerHTML=dataset.groups.map(([name],i)=>'<button data-group="'+i+'" aria-pressed="'+(i===group)+'">'+name+'</button>').join('');
 $('kpis').innerHTML=items.map(([k,name,satuan])=>{
  const [t,a]=values(unit(),month(),k);
  return '<tr><td><button data-kpi="'+k+'" aria-pressed="'+(k===selected)+'">'+name+'<small>'+satuan+'</small></button></td><td>'+targetText(k,t)+'</td><td><strong>'+fmt(a)+'</strong></td>'+achievementCell(k,t,a)+'</tr>';
 }).join('');
 $('summaryNotes').innerHTML=noteBox(selected);
 const [,name,satuan]=meta.get(selected);
 $('title').textContent=name;
 $('basis').textContent=descriptions[selected]??'Satuan '+satuan+' · nilai periode sesuai rekap workbook.';
 for(const button of $('views').querySelectorAll('button'))button.setAttribute('aria-pressed',String(view===button.dataset.view));
 const points=view==='trend'?months.map((label,i)=>({label,short:label.slice(0,3),values:values(unit(),i+1,selected)})):
  dataset.units.slice(1).map(u=>({label:u,short:u.slice(4),values:values(u,month(),selected)}));
 $('axis').textContent=view==='trend'?'Bulan':'Unit';
 $('chart').innerHTML=chart(points);
 $('chartTable').innerHTML=points.map(p=>'<tr><td>'+p.label+'</td><td>'+targetText(selected,p.values[0])+'</td><td>'+fmt(p.values[1])+'</td>'+achievementCell(selected,...p.values)+'</tr>').join('');
}
for(const id of ['unit','month','type'])$(id).onchange=render;
$('groups').onclick=e=>{const b=e.target.closest('[data-group]');if(b){group=Number(b.dataset.group);selected=dataset.groups[group][1][0][0];render();$('groups').querySelector('[aria-pressed=true]').focus()}};
$('kpis').onclick=e=>{const b=e.target.closest('[data-kpi]');if(b){selected=b.dataset.kpi;render();$('kpis').querySelector('[aria-pressed=true]').focus()}};
$('views').onclick=e=>{const b=e.target.closest('[data-view]');if(b){view=b.dataset.view;render()}};
$('print').onclick=()=>window.print();
const columns=['periode','unit','kode_indikator','indikator','satuan','target','realisasi','pencapaian_%','status'];
const overrides={};
const storageKey='up3-jayapura-distribusi-2026-import';
const pdTeams=['Regu 1'];
const materialSources=['UP3 Jayapura - Distribusi','UP3 Jayapura - Niaga','UP3 Wamena','UPPK Papua'];
const materialTypes=['MDU','Non-MDU'];
let trafoYear='all',trafoMonth='all',trafoBrand='',trafoCapacity='',trafoCompare='all';
const detailKinds={
 trafo:{label:'Gangguan Trafo',sheet:'Gangguan_Trafo',fields:['BLTH','Gardu Rusak','ULP','Kapasitas (KVA)','Merk','Penyebab','Tahun']},
 hi:{label:"Health Index Penyulang"},
 fgmonthly:{sheet:"FGTM_Bulanan"},
 fglog:{sheet:"FGTM_Register"},
 fgtm:{label:"Monitoring Penyulang 2025–2026"},
 yodaily:{sheet:"YO_Harian",fields:['periode', 'unit', 'tanggal', 'id_petugas', 'nama_petugas', 'skor_performa', 'skor_produktivitas', 'skor_hari_kerja', 'po', 'wo']},
 yo:{label:"Yantek Optimization"},
 pdkb:{label:'PDKB',sheet:'PDKB',fields:['periode','unit','regu','pekerjaan_titik','ens_diselamatkan_mwh']},
 stock:{label:'Logistik',sheet:'Stok',fields:['periode','unit','sumber','kategori','kode_material','nama_material','satuan','stok']},
 ito:{sheet:'ITO',fields:['periode','unit','target_ito','realisasi_ito']},
 asset:{label:'Data aset',sheet:'Aset',fields:["periode", "unit", "penyulang", "jtm_kms", "jtr_kms", "gd_unit", "recloser", "lbs_motorize", "lbs_threeway", "lbs_manual"]},
 performance:{label:'Grafik per ULP',sheet:'Kinerja',fields:columns},
 fault:{label:'Detail gangguan',sheet:'Gangguan',fields:['periode','unit','id','aset','nama_aset','rating','merek','jenis_gangguan','kode_penyebab','penyebab','jumlah']},
 cause:{label:'Penyebab SAIDI, SAIFI & ENS',sheet:'Penyebab',fields:['periode','unit','id','indikator','kategori_pemadaman','sumber_eksternal','kelompok_penyebab','kode_penyebab','penyebab','kontribusi']}
};
const faultCodes={I1:'Komponen JTM',I2:'Peralatan JTM',I3:'Gardu',I4:'Tiang',E1:'Pohon',E2:'Bencana Alam',E3:'Hewan/Pihak ke-3',E4:'Layangan/Benda Asing'};
const assets=['Penyulang','Trafo','Kubikel','Recloser','LBS','LBS Threeway'];
const outages=['Terencana','Tidak terencana','Emergency','Eksternal'];
const extraKpis=[
 ['recloser','Gangguan / kerusakan Recloser','kali','down'],
 ['lbs','Gangguan / kerusakan LBS dan LBS Threeway','kali','down'],
 ['yantek_wo','Yantek Optimization · WO selesai','WO','up'],
 ['yantek_sla','Yantek Optimization · SLA kualitas','%','up']
];
for(const row of extraKpis)meta.set(row[0],row);
function kpiKey(u,m,k){return dataset.units.includes(u)&&Number.isInteger(m)&&m>=1&&m<=12&&meta.has(k)}
const detailStorage='up3-distribusi-detail-v1';
let detailOverrides={trafo:{...trafoBase},yodaily:{},asset:{...assetImportBase},fault:{},cause:{},pdkb:{...pdkbBase},stock:{...stockMatrixBase},ito:{...itoBase}};
try{
 const saved=JSON.parse(localStorage.getItem(detailStorage)||'{}');
 for(const k of Object.keys(detailOverrides))if(saved[k]&&typeof saved[k]==='object'&&!Array.isArray(saved[k]))detailOverrides[k]={...detailOverrides[k],...saved[k]};
}catch{}
let detailTab='asset';
const periodText=()=> '2026-'+String(month()).padStart(2,'0');
const ehtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const detailRows=kind=>Object.values(detailOverrides[kind]).filter(r=>r.periode===periodText()&&r.unit===unit());
function decodeDetail(rows,kind){
 if(kind==='trafo')return decodeTrafo(rows);
 if(kind==='asset')return decodeAsset(rows);
 if(kind==='stock'&&rows.some(r=>r.some(v=>String(v??'').trim().toUpperCase()==='NOMOR MATERIAL')))return decodeStockMatrix(rows);
 if(kind==='pdkb')return decodePdkb(rows);
 if(kind==='ito')return decodeIto(rows);
 const schema=detailKinds[kind].fields;
 const filled=rows.filter(row=>row.some(v=>String(v??'').trim()));
 const header=(filled.shift()||[]).map(v=>String(v??'').trim().toLowerCase());
 if(schema.some(f=>header.indexOf(f)<0||header.indexOf(f)!==header.lastIndexOf(f)))throw Error('Kolom file harus sesuai template '+detailKinds[kind].sheet+'.');
 const output={};
 for(const [i,row] of filled.entries()){
  const data=Object.fromEntries(schema.map(f=>[f,String(row[header.indexOf(f)]??'').trim()]));
  const fail=msg=>{throw Error('Baris data '+(i+1)+' · '+msg)};
  data.unit=data.unit.toUpperCase();
  if(!/^2026-(0[1-9]|1[0-2])$/.test(data.periode)||!dataset.units.includes(data.unit))fail('Periode atau unit tidak dikenali.');
  const numeric=(key,required=false,integer=false)=>{
   const value=data[key];
   if(!value&&!required){delete data[key];return}
   const number=Number(value.replace(',','.'));
   if(!/^\d+(?:[.,]\d+)?$/.test(value)||!Number.isFinite(number)||(integer&&!Number.isInteger(number)))fail('Periksa angka '+key+'.');
   data[key]=number;
  };
  let key=data.periode+'|'+data.unit;
  if(kind==='asset'){
   for(const f of schema.slice(2))numeric(f,false,!['jtm_kms','jtr_kms'].includes(f));
   if(Object.keys(data).length===2)continue;
  }else if(kind==='yodaily'){
   if(Object.values(data).slice(2).every(v=>v===''))continue;
   const date=new Date(data.tanggal+'T00:00:00Z');
   if(!/^2026-\d{2}-\d{2}$/.test(data.tanggal)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==data.tanggal||data.tanggal.slice(0,7)!==data.periode)fail('Tanggal harus valid (YYYY-MM-DD) dan sesuai periode.');
   if(data.unit===dataset.units[0]||!data.id_petugas||data.id_petugas.includes('|')||!data.nama_petugas)fail('Pilih ULP dan isi ID serta nama petugas.');
   key+='|'+data.tanggal+'|'+data.id_petugas;
   for(const field of yoDailyFields)numeric(field,false,field==='po'||field==='wo');
   if(!yoDailyFields.some(field=>Object.hasOwn(data,field)))fail('Isi minimal satu skor, PO, atau WO.');
  }else if(kind==='pdkb'){
   if(!pdTeams.includes(data.regu))fail('Gunakan Regu 1 (satu regu).');
   key+='|'+data.regu;
   numeric('pekerjaan_titik',false,true);numeric('ens_diselamatkan_mwh');
   if(Object.keys(data).length===3)continue;
  }else if(kind==='stock'){
   if(!materialSources.includes(data.sumber)||!materialTypes.includes(data.kategori))fail('Periksa sumber dan kategori material.');
   if(!data.stok&&!data.kode_material&&!data.nama_material&&!data.satuan)continue;
   if(!data.kode_material||data.kode_material.includes('|')||!data.nama_material||!data.satuan)fail('Isi kode, nama, dan satuan material.');
   key+='|'+data.sumber+'|'+data.kategori+'|'+data.kode_material.toUpperCase();
   numeric('stok',true);
  }else if(kind==='ito'){
   numeric('target_ito');numeric('realisasi_ito');
   if(Object.keys(data).length===2)continue;
  }else{
   if(Object.values(data).slice(2).every(v=>v===''))continue;
   if(!data.id||data.id.includes('|')||!data.penyebab)fail('Isi ID unik dan penyebab.');
   key+='|'+data.id;
   data.kode_penyebab=data.kode_penyebab.toUpperCase();
   if(data.kode_penyebab&&!Object.hasOwn(faultCodes,data.kode_penyebab))fail('Kode penyebab harus I1–I4 atau E1–E4.');
   if(kind==='fault'){
    if(!assets.includes(data.aset)||!data.nama_aset)fail('Pilih jenis aset dan isi nama aset.');
    if(data.aset==='Penyulang'&&!['Temporary','Permanent'].includes(data.jenis_gangguan))fail('Penyulang memerlukan kategori Temporary atau Permanent.');
    numeric('jumlah',true,true);
    if(data.jumlah<1)fail('Jumlah kejadian minimal 1.');
   }else{
    data.indikator=data.indikator.toUpperCase();
    if(!['SAIDI','SAIFI','ENS'].includes(data.indikator)||!outages.includes(data.kategori_pemadaman)||!['Internal','Eksternal'].includes(data.kelompok_penyebab))fail('Periksa indikator dan kedua kategori penyebab.');
    if(data.kategori_pemadaman==='Eksternal'?!['KIT','Transmisi','GI'].includes(data.sumber_eksternal):Boolean(data.sumber_eksternal))fail('Isi KIT, Transmisi, atau GI hanya untuk pemadaman Eksternal.');
    if(data.kode_penyebab&&data.kode_penyebab[0]!==data.kelompok_penyebab[0])fail('Kode tidak sesuai kelompok penyebab.');
    numeric('kontribusi',true);
   }
  }
  if(Object.hasOwn(output,key))fail('Entri duplikat.');
  output[key]=data;
 }
 if(!Object.keys(output).length)throw Error('Belum ada isian untuk diimpor.');
 return output;
}
function detailTable(headers,rows){
 if(!rows.length)return '<p class="empty">Belum ada data pada pilihan ini.</p>';
 return '<div class="scroll"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+ehtml(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+ehtml(v??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function detailTotals(rows,groupBy,field,title){
 const totals=new Map();
 for(const row of rows){const label=groupBy(row)||'Belum dikategorikan';totals.set(label,(totals.get(label)||0)+row[field]);}
 if(!totals.size)return '';
 const max=Math.max(1,...totals.values());
 return '<section class="detail-totals"><h3>'+title+'</h3>'+[...totals].sort((a,b)=>b[1]-a[1]).map(([label,n])=>'<div><span>'+ehtml(label)+'</span><progress value="'+n+'" max="'+max+'"></progress><strong>'+fmt(n)+'</strong></div>').join('')+'</section>';
}
let assetMetric='penyulang';
const assetLabels=['Penyulang (unit)','Panjang JTM (kms, sesuai header sumber)','Panjang JTR (kms, sesuai header sumber)','GD (unit)','Recloser (unit)','LBS Motorize (unit)','LBS Threeway (unit)','LBS Manual (unit)'];
const detailFilters={source:'',materialType:'',kpi:'rating',asset:'',kind:'',brand:'',rating:'',metric:'SAIDI',outage:'',causeGroup:''};
const selectDetail=(key,label,options,blank)=>'<label>'+label+'<select data-detail-filter="'+key+'">'+(blank?option('',blank):'')+options.map(([v,t])=>'<option value="'+v+'" '+(detailFilters[key]===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
const choices=values=>values.map(v=>[v,v]);
let causeView='history',causeMetric=0,causeMode='monthly',causeScope='all';
const causeColors=['#527795','#d58b25','#008579'];
const causeLabels=['Tidak terencana · Gardu Induk','Tidak terencana · Penyulang','Tidak terencana · Gardu Distribusi','Tidak terencana · JTR','Tidak terencana · Sambungan / APP','Terencana · Gardu Induk','Terencana · Penyulang','Terencana · Gardu Distribusi','Terencana · JTR','Terencana · Sambungan / APP','Bencana alam · Gardu Induk','Bencana alam · Penyulang','Bencana alam · Gardu Distribusi','Bencana alam · JTR','Bencana alam · Sambungan / APP','Transmisi · Tidak terencana','Transmisi · Terencana','Pembangkit · Tidak terencana','Pembangkit · Terencana'];
function causeViewTabs(){return '<div class="tabs"><button data-cause-view="history" aria-pressed="'+(causeView==='history')+'">Perbandingan 2024–2026</button><button data-cause-view="manual" aria-pressed="'+(causeView==='manual')+'">Rincian impor manual</button></div>'}
function causeIncluded(i){return causeScope==='all'||(causeScope==='dist'&&i<15)||(causeScope==='trans'&&i>=15&&i<17)||(causeScope==='kit'&&i>=17)}
function causeCum(y,m,i,k){
 const d=reliabilityHistory.data[unit()]?.[y];if(!d)return null;
 if(y===2026)return d[m]?.[i]?.[k]??null;
 let sum=0;for(let b=1;b<=m;b++){const v=d[b]?.[i]?.[k];if(v==null)return null;sum+=v}return sum;
}
function causeVal(y,m,i,k){const v=causeCum(y,m,i,k);if(causeMode==='cumulative'||m===1)return v;const prev=causeCum(y,m-1,i,k);return v==null||prev==null?null:v-prev}
function causeTotal(y,m,k){
 if(unit()==='UP3 JAYAPURA'&&causeScope==='all'&&((y===2025&&k===2)||y===2026)){
 const get=b=>y===2025?reliabilityHistory.ens25[b]??null:reliabilityHistory.totals26[b]?.[k]??null;
 const v=get(m),prev=m===1?0:get(m-1);return causeMode==='cumulative'?v:v==null||prev==null?null:v-prev;
 }
 const a=causeLabels.flatMap((_,i)=>causeIncluded(i)?[causeVal(y,m,i,k)]:[]);return a.some(v=>v==null)?null:a.reduce((a,b)=>a+b,0);
}
function causeTrend(){
 const points=months.map((label,i)=>({label,short:label.slice(0,3),values:[2024,2025,2026].map(y=>causeTotal(y,i+1,causeMetric))}));
 const nums=points.flatMap(p=>p.values).filter(v=>v!=null);if(!nums.length)return '<p>Data belum tersedia untuk pilihan ini.</p>';
 const max=Math.max(...nums,1)*1.12,min=Math.min(0,...nums)*1.1;const x=i=>65+(i+.5)*44,y=v=>215-180*(v-min)/(max-min);
 let out='<svg viewBox="0 0 620 255" role="img" aria-label="Perbandingan 2024 2025 2026">';
 for(let n=0;n<5;n++){const v=min+(max-min)*n/4;out+='<path d="M65 '+y(v)+'H600" stroke="#dce6ed"/><text x="59" y="'+y(v)+'" text-anchor="end" font-size="10">'+fmt(v)+'</text>'}
 points.forEach((p,i)=>{out+='<text x="'+x(i)+'" y="240" text-anchor="middle" font-size="10">'+p.short+'</text>';p.values.forEach((v,j)=>{if(v==null)return;const title='<title>'+p.label+' '+(2024+j)+': '+fmt(v)+'</title>';if($('type').value==='bar')out+='<rect x="'+(x(i)+(j-1)*11-5)+'" y="'+Math.min(y(v),y(0))+'" width="9" height="'+Math.max(1,Math.abs(y(v)-y(0)))+'" fill="'+causeColors[j]+'">'+title+'</rect>';else {const prev=points[i-1]?.values[j];if($('type').value==='line'&&prev!=null)out+='<path d="M'+x(i-1)+' '+y(prev)+'L'+x(i)+' '+y(v)+'" stroke="'+causeColors[j]+'" stroke-width="2"/>';out+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3" fill="'+causeColors[j]+'">'+title+'</circle>'}})});return out+'</svg>';
}
function renderCauseHistory(){
 const sel=(key,label,opts,val)=>'<label>'+label+'<select data-cause-filter="'+key+'">'+opts.map(([v,t])=>'<option value="'+v+'" '+(String(val)===String(v)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
 const k=causeMetric,measure=['SAIDI · menit/pelanggan','SAIFI · kali/pelanggan','ENS · MWh'][k];
 const legend=[2024,2025,2026].map((y,i)=>'<span style="color:'+causeColors[i]+'">● '+y+'</span>').join(' &nbsp; ');
 const vals=causeLabels.map((label,i)=>({label,i,v:[2024,2025,2026].map(y=>causeVal(y,month(),i,k))})).filter(r=>causeIncluded(r.i));
 const max=Math.max(1,...vals.flatMap(r=>r.v).filter(v=>v!=null));
 const bars=vals.map(r=>'<div style="margin:16px 0"><strong>'+r.label+'</strong>'+r.v.map((v,j)=>'<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><small style="width:38px">'+(2024+j)+'</small><div style="width:65%;background:#edf3f6"><div style="height:10px;width:'+(v==null?0:Math.max(0,v)/max*100)+'%;background:'+causeColors[j]+'"></div></div><small>'+(v==null?'—':fmt(v))+'</small></div>').join('')+'</div>').join('');
 return causeViewTabs()+'<p role="note" style="padding:12px;background:#fff4cd;border-radius:8px">Validasi sumber: tanggal sheet 2024 tertulis 2025. Seluruh 798 baris ULP Januari–Juli 2024 identik dengan periode yang sama pada sheet 2025; tahun mengikuti nama sheet dan belum terverifikasi. SAIDI/SAIFI UP3 Maret 2026 belum valid. Tanda — berarti data tidak tersedia / belum valid.</p><h2>Penyebab SAIDI, SAIFI & ENS · 2024–2026</h2><div class="detail-filters">'+sel('metric','Indikator',[[0,'SAIDI'],[1,'SAIFI'],[2,'ENS']],k)+sel('mode','Data grafik',[['monthly','Bulanan'],['cumulative','Kumulatif']],causeMode)+sel('scope','Lingkup',[['all','Keseluruhan'],['dist','Distribusi'],['trans','Transmisi'],['kit','Pembangkit']],causeScope)+'</div><p>'+ehtml(unit())+' · '+measure+' · '+legend+'</p><div class="detail-grid"><section><h3>Tren '+(causeMode==='monthly'?'bulanan':'kumulatif')+'</h3>'+causeTrend()+'<p>Rincian penyebab: '+months[month()-1]+(causeMode==='cumulative'?' (Januari–periode terpilih)':'')+'. Ubah Unit dan Periode pada menu utama.</p>'+[2024,2025,2026].map(y=>'<p><b>'+y+'</b>: '+(causeTotal(y,month(),k)==null?'— belum tersedia / belum valid':fmt(causeTotal(y,month(),k)))+'</p>').join('')+'</section><section><h3>Perbandingan kontribusi penyebab</h3>'+bars+'</section></div><details open><summary>Catatan sumber dan kualitas data</summary><p>2024 mengikuti nama sheet; tanggal di sheet sumber tertulis 2025 dan perlu konfirmasi. 2024/2025 berupa bulanan; 2026 kumulatif, nilai bulanan dihitung dari selisih bulan berurutan. SAIDI/SAIFI UP3 Maret 2026 memiliki anomali skala dan ditandai belum valid; selisih April juga tidak ditampilkan. ENS 2026 tetap tersedia.</p><p>UP3 2024/2025 tersedia Januari–Oktober; ENS total UP3 2025 dari rekap tersedia Januari–Desember, tanpa rincian penyebab ENS. UP3 2024 tidak memuat ENS. ULP 2024 Januari–Juli, ULP 2025 Januari–Oktober, ULP 2026 Januari–Agustus tanpa Juni. Kekosongan ditampilkan —, bukan nol. ENS register dikonversi dari kWh ke MWh; ENS rekap 2025 mengikuti MWh. Total UP3 2026 memakai baris Keseluruhan; selisih kecil rincian dapat terjadi akibat pembulatan. Nilai bulanan negatif menunjukkan revisi/penurunan kumulatif pada sumber dan perlu verifikasi. Kategori komponen mengikuti workbook; kode I/E tidak ditebak.</p></details>';
}
function exportCauseHistory(){csvDownload([['Unit','Tahun','Bulan','Mode','Indikator','Penyebab','Nilai'],...[2024,2025,2026].flatMap(y=>months.flatMap((m,b)=>[[''+unit(),y,b+1,causeMode,['SAIDI','SAIFI','ENS'][causeMetric],'TOTAL',causeTotal(y,b+1,causeMetric)??''],...causeLabels.flatMap((label,i)=>causeIncluded(i)?[[unit(),y,b+1,causeMode,['SAIDI','SAIFI','ENS'][causeMetric],label,causeVal(y,b+1,i,causeMetric)??'']]:[])]))], 'Penyebab_SAIDI_SAIFI_ENS_2024-2026.csv')}
$('detailBody').addEventListener('click',e=>{const v=e.target.dataset.causeView;if(v){causeView=v;renderDetail()}});
$('detailBody').addEventListener('change',e=>{const f=e.target.dataset.causeFilter;if(!f)return;if(f==='metric')causeMetric=Number(e.target.value);if(f==='mode')causeMode=e.target.value;if(f==='scope')causeScope=e.target.value;renderDetail()});

function renderDetail(){
 $('detailTabs').innerHTML=Object.entries(detailKinds).filter(([,v])=>v.label).map(([k,v])=>'<button data-detail-tab="'+k+'" aria-pressed="'+(k===detailTab)+'">'+v.label+'</button>').join('');
 const body=$('detailBody');
 if(detailTab==='cause'&&causeView==='history'){body.innerHTML=renderCauseHistory();return}
 if(detailTab==='trafo'){body.innerHTML=renderTrafo();return}
 if(detailTab==='hi'){body.innerHTML=renderHealthIndex();return}
 if(detailTab==='fgtm'){body.innerHTML=renderFeederMonitoring();return}
 if(detailTab==='yo'){
  body.innerHTML=renderYo();
  const date=$('yoDate'),officer=$('yoOfficer');
  if(date&&Array.from(date.options).some(option=>option.value===yoDate))date.value=yoDate;
  if(officer&&Array.from(officer.options).some(option=>option.value===yoOfficer))officer.value=yoOfficer;
  return;
 }
 if(detailTab==='pdkb'){body.innerHTML=renderPdkb();return}
 if(detailTab==='stock'){body.innerHTML=renderLogistics();return}
 if(detailTab==='asset'){
  body.innerHTML=renderAssets();
  return;
 }
 if(detailTab==='performance'){
  const k=detailFilters.kpi, metaRow=meta.get(k);
  const points=dataset.units.slice(1).map(u=>({label:u,short:u.slice(4),values:values(u,month(),k)}));
  body.innerHTML='<div class="detail-filters">'+selectDetail('kpi','Indikator',Array.from(meta.values(),r=>[r[0],r[1]]))+'</div><p class="muted">'+ehtml(metaRow[2])+' · Hijau kebiruan: realisasi · Biru: target</p><div class="detail-chart scroll">'+chart(points)+'</div><div class="scroll"><table><thead><tr><th>ULP</th><th>Target</th><th>Realisasi</th><th>Pencapaian</th></tr></thead><tbody>'+points.map(p=>'<tr><td>'+p.label+'</td><td>'+fmt(p.values[0])+'</td><td>'+fmt(p.values[1])+'</td>'+achievementCell(k,...p.values)+'</tr>').join('')+'</tbody></table></div>'+noteBox(k);
  return;
 }
 const f=detailFilters;
 if(detailTab==='fault'){
  const rows=detailRows('fault').filter(r=>(!f.asset||r.aset===f.asset)&&(!f.kind||r.jenis_gangguan===f.kind)&&r.merek.toLowerCase().includes(f.brand.toLowerCase())&&r.rating.toLowerCase().includes(f.rating.toLowerCase()));
  body.innerHTML=faultCharts()+'<p><button type="button" data-open-fgtm>Lihat register FGTM dan monitoring penyulang 2025–2026</button></p><div class="detail-filters">'+selectDetail('asset','Aset',choices(assets),'Semua aset')+selectDetail('kind','Sifat gangguan',choices(['Temporary','Permanent']),'Semua sifat')+'<label>Merek<input data-detail-filter="brand" value="'+ehtml(f.brand)+'"></label><label>Rating teknis<input data-detail-filter="rating" value="'+ehtml(f.rating)+'"></label></div><div class="detail-grid">'+
   detailTotals(rows,r=>[r.merek,r.rating].filter(Boolean).join(' / '),'jumlah','Jumlah gangguan menurut merek dan rating')+
   detailTotals(rows,r=>r.jenis_gangguan,'jumlah','Jumlah menurut sifat gangguan')+
   detailTotals(rows,r=>r.kode_penyebab?r.kode_penyebab+' · '+faultCodes[r.kode_penyebab]:r.penyebab,'jumlah','Jumlah menurut penyebab')+'</div>'+
   detailTable(['ID','Aset','Nama aset','Rating','Merek','Sifat','Kode','Penyebab','Jumlah'],rows.map(r=>[r.id,r.aset,r.nama_aset,r.rating,r.merek,r.jenis_gangguan,r.kode_penyebab,r.penyebab,fmt(r.jumlah)]));
  return;
 }
 body.innerHTML='';
 const rows=detailRows('cause').filter(r=>r.indikator===f.metric&&(!f.outage||r.kategori_pemadaman===f.outage)&&(!f.causeGroup||r.kelompok_penyebab===f.causeGroup));
 const [,actual]=values(unit(),month(),f.metric.toLowerCase());
 const total=rows.reduce((sum,r)=>sum+r.kontribusi,0);
 body.innerHTML=causeViewTabs()+'<div class="detail-filters">'+selectDetail('metric','Indikator',choices(['SAIDI','SAIFI','ENS']))+selectDetail('outage','Kategori pemadaman',choices(outages),'Semua kategori')+selectDetail('causeGroup','Kelompok penyebab',choices(['Internal','Eksternal']),'Semua kelompok')+'</div><p class="muted">Kontribusi rincian terfilter '+(rows.length?fmt(total):'—')+' · Realisasi KPI '+fmt(actual)+' · '+meta.get(f.metric.toLowerCase())[2]+'. Kedua kategori merangkum kontribusi yang sama.</p><div class="detail-grid">'+
 detailTotals(rows,r=>[r.kategori_pemadaman,r.sumber_eksternal].filter(Boolean).join(' · '),'kontribusi','Kategori pemadaman')+
 detailTotals(rows,r=>r.kelompok_penyebab,'kontribusi','Kelompok penyebab')+
 detailTotals(rows,r=>r.kode_penyebab?r.kode_penyebab+' · '+faultCodes[r.kode_penyebab]:r.penyebab,'kontribusi','Rincian penyebab')+'</div>'+
 detailTable(['ID','Pemadaman','Sumber eksternal','Kelompok','Kode','Penyebab','Kontribusi'],rows.map(r=>[r.id,r.kategori_pemadaman,r.sumber_eksternal,r.kelompok_penyebab,r.kode_penyebab,r.penyebab,fmt(r.kontribusi)]));
}
const monthKey=m=>'2026-'+String(m).padStart(2,'0')+'|'+unit();
let pdkbYear='2026',pdkbTeam='Regu 1',pdkbMetric='pekerjaan_titik';
function renderPdkb(){
 const metrics={pekerjaan_titik:['Pekerjaan','titik','persen_titik'],ens_diselamatkan_mwh:['ENS diselamatkan','MWh (sesuai file)','persen_ens'],rp_terselamatkan:['Rupiah terselamatkan','Rp','persen_rp']};
 const [label,satuan,percent]=metrics[pdkbMetric];
 const row=(y,m,team=pdkbTeam)=>detailOverrides.pdkb[y+'-'+String(m).padStart(2,'0')+'|'+unit()+'|'+team]||{};
 const pct=r=>r[pdkbMetric]==null?null:r[percent]??(r['target_'+pdkbMetric]>0?r[pdkbMetric]/r['target_'+pdkbMetric]*100:null);
 const picker=(key,title,options,current)=>'<label>'+title+'<select data-pdkb-filter="'+key+'">'+options.map(([v,t])=>'<option value="'+v+'" '+(v===current?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
 const points=months.map((label,i)=>{const r=row(pdkbYear,i+1);return {label,short:label.slice(0,3),values:[r['target_'+pdkbMetric],r[pdkbMetric]]}});
 const summary=pdTeams.map(team=>{const r=row(pdkbYear,month(),team);return [team,...Object.keys(metrics).flatMap(k=>{const perc=r[k]==null?null:r[metrics[k][2]]??(r['target_'+k]>0?r[k]/r['target_'+k]*100:null);return [fmt(r['target_'+k]),fmt(r[k]),perc==null?'—':fmt(perc)+'%']})]});
 return '<h2>Realisasi PDKB · '+unit()+'</h2><div class="detail-filters">'+picker('year','Tahun',[['2026','2026'],['2025','2025']],pdkbYear)+picker('metric','Indikator',Object.entries(metrics).map(([k,v])=>[k,v[0]]),pdkbMetric)+'</div><p>'+months[month()-1]+' '+pdkbYear+' · Target, realisasi, dan persentase per regu</p>'+detailTable(['Regu','Target titik','Realisasi titik','Pencapaian titik','Target ENS','Realisasi ENS','Pencapaian ENS','Target Rp','Realisasi Rp','Pencapaian Rp'],summary)+'<p class="muted">Data PDKB menggunakan satu regu per tahun dan bulan. ENS mengikuti header ens_diselamatkan_mwh tanpa konversi; besaran dan satuan perlu dikonfirmasi bila laporan asli menggunakan kWh. Angka nol Desember 2026 dipertahankan sesuai file.</p><h3>Perbandingan realisasi · '+months[month()-1]+'</h3>'+pdkbComparisonTable(Object.entries(metrics).map(([k,v])=>({label:v[0],a:row(2025,month())[k],b:row(2026,month())[k]})))+'<p class="muted">Ikon membandingkan realisasi 2026 terhadap bulan yang sama tahun 2025: ↑ UP (naik), → STUCK (tetap), ↓ DOWN (turun). — jika salah satu tahun belum tersedia.</p><div class="detail-grid"><section><h3>'+label+' · '+pdkbTeam+' · '+pdkbYear+'</h3><p><span style="color:#527795">● Target</span> &nbsp; <span style="color:#007b71">● Realisasi</span> · '+satuan+'</p><div class="scroll">'+chart(points)+'</div></section><section><h3>Perbandingan realisasi 2025–2026</h3><p><span style="color:#527795">● 2025</span> &nbsp; <span style="color:#007b71">● 2026</span> · '+satuan+'</p><div class="scroll">'+chart(months.map((label,i)=>({label,short:label.slice(0,3),values:[row(2025,i+1)[pdkbMetric],row(2026,i+1)[pdkbMetric]]})),['2025','2026'])+'</div></section></div><h3>Riwayat bulanan · '+pdkbTeam+'</h3>'+pdkbComparisonTable(months.map((m,i)=>({label:m,a:row(2025,i+1)[pdkbMetric],b:row(2026,i+1)[pdkbMetric],target:row(pdkbYear,i+1)['target_'+pdkbMetric],pct:pct(row(pdkbYear,i+1))})),pdkbYear,satuan)+'<p class="muted">Persentase sumber dipertahankan. Jika kolom persentase dikosongkan, dashboard menghitung realisasi ÷ target × 100%. Data berasal dari Template_PDKB_.xlsx; kedua lembar tahun dibaca saat impor Excel.</p>'+noteBox('pdkb');
}
$('detailBody').addEventListener('change',e=>{const k=e.target.dataset.pdkbFilter;if(!k)return;if(k==='year')pdkbYear=e.target.value;if(k==='team')pdkbTeam=e.target.value;if(k==='metric')pdkbMetric=e.target.value;renderDetail()});
const stockLocs=['DIS','AGA','TEL','UP2K PAPUA','UP2K P PEG','WAMENA','TOTAL GD UP3','ULP ABEPURA','ULP JAYAPURA','ULP SENTANI','ULP ARSO','ULP GENYEM','ULP SARMI','TOTAL GD UP3 & ULP'];
let stockGroup='',stockClass='',stockMeasure='BH',stockLocation='',stockSearch='',stockPeriod='latest';
function stockAvailablePeriods(){return [...new Set(Object.values(detailOverrides.stock).filter(r=>r.format==='matrix').map(r=>r.periode))].sort().reverse()}
function stockSelectedPeriod(){return stockPeriod==='latest'?stockAvailablePeriods()[0]:stockPeriod}
function stockMatrixRows(){return Object.values(detailOverrides.stock).filter(r=>r.format==='matrix'&&r.periode===stockSelectedPeriod())}
function stockMatrixFiltered(){return stockMatrixRows().filter(r=>(!stockGroup||r.material===stockGroup)&&(!stockClass||r.kategori===stockClass)&&(!stockSearch||(r.kode_material+' '+r.nama_material+' '+r.material).toLowerCase().includes(stockSearch.toLowerCase())))}
function stockSum(values){return values.every(v=>v!=null)?values.reduce((a,b)=>a+b,0):null}
function stockReconcile(r){const a=stockSum(r.values.slice(0,6)),b=stockSum([...r.values.slice(0,6),...r.values.slice(7,13)]);return (a!=null&&r.values[6]!=null&&Math.abs(a-r.values[6])>1e-6)||(b!=null&&r.values[13]!=null&&Math.abs(b-r.values[13])>1e-6)}
function renderStockMatrix(){
 const all=stockMatrixRows(),rows=stockMatrixFiltered(),ulp=unit().startsWith('ULP ')?stockLocs.indexOf(unit()):-1;
 const measures=[...new Set(all.map(r=>r.satuan))];const measure=measures.includes(stockMeasure)?stockMeasure:measures[0];
 const picker=(key,title,opts,value)=>'<label>'+title+'<select data-stock-filter="'+key+'">'+opts.map(([v,t])=>'<option value="'+ehtml(v)+'" '+(value===v?'selected':'')+'>'+ehtml(t)+'</option>').join('')+'</select></label>';
 const locs=ulp>=0?[ulp]:stockLocation?[Number(stockLocation)]:[0,1,2,3,4,5,7,8,9,10,11,12];
 const same=rows.filter(r=>r.satuan===measure),graph=locs.map(i=>[stockLocs[i],[same.length?stockSum(same.map(r=>r.values[i])):null]]).filter(([,v])=>v[0]!=null);
 const flags=rows.filter(stockReconcile).length;
 const columns=ulp>=0?[ulp]:stockLocation?[Number(stockLocation)]:Array.from({length:14},(_,i)=>i);
 return '<h2>Logistik · Stok material · '+ehtml(unit())+'</h2><p>Posisi stok '+(all.length?ehtml([...new Set(all.map(r=>r.tanggal_stok))].sort().join(', ')):'belum tersedia untuk periode ini')+' · '+rows.length+' jenis material</p><p class="muted">Periode stok: '+ehtml(stockSelectedPeriod()||'—')+' · pilihan tersendiri dari periode KPI utama '+ehtml(periodText())+'.</p><div class="detail-filters">'+picker('period','Periode stok',[['latest','Data terbaru (otomatis)'],...stockAvailablePeriods().map(v=>[v,v])],stockPeriod)+picker('group','Kelompok material',[['','Semua kelompok'],...[...new Set(all.map(r=>r.material))].map(v=>[v,v])],stockGroup)+picker('class','Kategori',[['','Semua kategori'],['MDU','MDU'],['Non-MDU','Non-MDU'],['Belum diklasifikasikan','Belum diklasifikasikan']],stockClass)+(ulp<0?picker('location','Lokasi gudang',[['','Semua lokasi'],...stockLocs.map((v,i)=>[String(i),v])],stockLocation):'')+picker('measure','Satuan grafik',measures.map(v=>[v,v]),measure)+'<label>Cari kode / deskripsi<input data-stock-filter="search" value="'+ehtml(stockSearch)+'"></label><button type="button" data-stock-reset>Reset filter</button></div><p class="muted">Nama DIS, AGA, TEL, UP2K PAPUA, UP2K P PEG dan WAMENA mengikuti file sumber. Kategori MDU/non-MDU belum tersedia pada sumber. Grafik hanya menjumlahkan material bersatuan sama; total gudang tidak dihitung dua kali.</p>'+(flags?'<p class="empty">'+flags+' baris memiliki selisih antara total sumber dan penjumlahan rincian. Periksa total GD UP3 dan total gabungan.</p>':'')+stockSummaryCharts(rows,ulp,measure)+(same.length?metricBars('Stok per lokasi · '+ehtml(measure),graph,[['Stok','#007b71']]):'<p class="empty">Belum ada material sesuai filter. Gunakan Reset filter untuk menampilkan seluruh material.</p>')+detailTable(['Material','Nomor material','Deskripsi','Kategori','Satuan',...columns.map(i=>stockLocs[i]),'Validasi total'],rows.map(r=>[r.material,r.kode_material,r.nama_material,r.kategori,r.satuan,...columns.map(i=>fmt(r.values[i])),stockReconcile(r)?'Periksa selisih':'Sesuai / data tidak lengkap']))+'<p class="muted">Nilai kosong tetap —. Total pada sumber dipertahankan; total yang kosong saat impor dihitung bila seluruh rincian tersedia. Data baru memperbarui snapshot bulan terkait.</p>';
}
$('detailBody').addEventListener('change',e=>{const k=e.target.dataset.stockFilter;if(!k)return;if(k==='period')stockPeriod=e.target.value;if(k==='group')stockGroup=e.target.value;if(k==='class')stockClass=e.target.value;if(k==='measure')stockMeasure=e.target.value;if(k==='location')stockLocation=e.target.value;if(k==='search')stockSearch=e.target.value;renderDetail()});
function stockMatrixTemplate(blank){const current=stockMatrixRows();const rows=current.length||!blank?current:Object.values(stockMatrixBase);return [['tanggal_stok','kategori','MATERIAL','NOMOR MATERIAL','DESKRIPSI MATERIAL','SATUAN',...stockLocs],...rows.map(r=>[r.tanggal_stok,r.kategori,r.material,r.kode_material,r.nama_material,r.satuan,...r.values.map(v=>blank?'':v??'')])];}
function decodeStockMatrix(rows){
 const normalize=v=>String(v??'').replace(/\s+/g,' ').trim().toUpperCase();
 const hi=rows.findIndex(r=>r.some(v=>normalize(v)==='NOMOR MATERIAL'));if(hi<0)throw Error('Header stok tidak ditemukan.');
 const h=Array.from(rows[hi],normalize),idx=name=>h.indexOf(name);const ids=['MATERIAL','NOMOR MATERIAL','DESKRIPSI MATERIAL','SATUAN',...stockLocs];if(ids.some(n=>idx(n)<0))throw Error('Kolom stok tidak sesuai template Logistik.');
 const toDate=v=>{const s=String(v??'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(s)){const d=s.slice(0,10),dt=new Date(d+'T00:00:00Z');return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===d?d:null}if(/^\d+(?:\.\d+)?$/.test(s)&&Number(s)>40000&&Number(s)<70000)return new Date(Date.UTC(1899,11,30)+Math.floor(Number(s))*86400000).toISOString().slice(0,10);return null};
 const defaultDate=rows.slice(0,hi).flatMap(r=>Array.from(r)).map(toDate).find(Boolean);let material='';const output={};
 for(const [i,row] of rows.slice(hi+1).entries()){
 const get=name=>String(row[idx(name)]??'').trim();const code=get('NOMOR MATERIAL');if(!/^\d+$/.test(code))continue;
 if(get('MATERIAL'))material=get('MATERIAL');const date=toDate(get('TANGGAL_STOK'))||defaultDate;if(!date||!date.startsWith('2026-'))throw Error('Baris '+(hi+i+2)+': tanggal_stok YYYY-MM-DD tahun 2026 wajib diisi.');
 const category=get('KATEGORI')||'Belum diklasifikasikan';if(!['MDU','Non-MDU','Belum diklasifikasikan'].includes(category))throw Error('Kategori harus MDU, Non-MDU, atau Belum diklasifikasikan.');
 if(!material||!get('DESKRIPSI MATERIAL')||!get('SATUAN'))throw Error('Lengkapi material, deskripsi, dan satuan.');
 const vals=stockLocs.map(n=>{const v=get(n);if(!v)return null;if(!/^\d+(?:[.,]\d+)?$/.test(v))throw Error('Baris '+(hi+i+2)+': angka stok '+n+' tidak valid.');return Number(v.replace(',','.'))});
 if(vals[6]==null)vals[6]=stockSum(vals.slice(0,6));if(vals[13]==null)vals[13]=stockSum([...vals.slice(0,6),...vals.slice(7,13)]);
 const r={format:'matrix',periode:date.slice(0,7),tanggal_stok:date,unit:'UP3 JAYAPURA',kategori:category,material,kode_material:code,nama_material:get('DESKRIPSI MATERIAL'),satuan:get('SATUAN'),values:vals};const key=r.periode+'|UP3 JAYAPURA|matrix|'+code;if(output[key])throw Error('Nomor material duplikat: '+code);output[key]=r;
 }
 if(!Object.keys(output).length)throw Error('Tidak ada baris material yang valid.');return output;
}

let logisticsView='stock';
function renderLogistics(){
 const tabs='<div class="toolbar"><button data-log-view="stock" aria-pressed="'+(logisticsView==='stock')+'">Stok MDU / Non-MDU</button><button data-log-view="ito" aria-pressed="'+(logisticsView==='ito')+'">Perputaran material (ITO)</button></div>';
 if(logisticsView==='ito'){
  const points=year=>months.map((label,i)=>{const r=itoRow(year,i+1);return {label,short:label.slice(0,3),values:[r.target_ito,r.realisasi_ito]}});
  const yearChart=year=>'<section><h3>Target & realisasi '+year+'</h3><p><span style="color:#527795">● Target</span> &nbsp; <span style="color:#007b71">● Realisasi</span></p><div class="detail-chart scroll">'+chart(points(year))+'</div></section>';
  return tabs+'<h2>Perputaran material (ITO) · '+unit()+'</h2><p class="muted">Target dan realisasi per periode dalam kali. Persentase mengikuti file impor; tidak dijumlahkan antarbulan. — berarti realisasi belum tersedia.</p><div class="detail-grid">'+yearChart(2026)+yearChart(2025)+'</div><h3>Perbandingan realisasi 2025–2026</h3><p><span style="color:#527795">● 2025</span> &nbsp; <span style="color:#007b71">● 2026</span></p><div class="detail-chart scroll">'+chart(months.map((label,i)=>({label,short:label.slice(0,3),values:[itoRow(2025,i+1).realisasi_ito,itoRow(2026,i+1).realisasi_ito]})),['2025','2026'])+'</div>'+detailTable(['Bulan','Target 2026','Realisasi 2026','Pencapaian 2026','Target 2025','Realisasi 2025','Pencapaian 2025'],months.map((label,i)=>[label,...[2026,2025].flatMap(y=>{const r=itoRow(y,i+1);return [fmt(r.target_ito),fmt(r.realisasi_ito),r.realisasi_ito==null?'—':fmt(itoPercent(r))+'%']})]))+'<p class="muted">Persentase sumber dapat berbeda dari pembagian target/realisasi yang sudah dibulatkan. Kolom persentase boleh dikosongkan saat impor untuk dihitung otomatis. Sumber awal: Template_ITO.csv (24 periode).</p>'+noteBox('ito');
 }
 const {source,materialType}=detailFilters;
 const rows=detailRows('stock').filter(r=>r.format!=='matrix').filter(r=>(!source||source===r.sumber)&&(!materialType||materialType===r.kategori));
 return tabs+renderStockMatrix()+'<details><summary>Stok dari format impor lama</summary><h2>Stok material · '+unit()+'</h2><div class="detail-filters">'+selectDetail('source','Sumber material',choices(materialSources),'Semua sumber')+selectDetail('materialType','Kategori',choices(materialTypes),'Semua kategori')+'</div>'+
 detailTable(['Sumber material','Kategori','Kode material','Nama material','Stok','Satuan'],rows.map(r=>[r.sumber,r.kategori,r.kode_material,r.nama_material,fmt(r.stok),r.satuan]))+'</details>';
}
function templateRows(kind){
 const period='2026-10',u='UP3 JAYAPURA';
 if(kind==='pdkb')return months.flatMap((_,i)=>pdTeams.map(team=>['2026-'+String(i+1).padStart(2,'0'),u,team,'','']));
 if(kind==='ito')return months.map((_,i)=>['2026-'+String(i+1).padStart(2,'0'),u,'','']);
 return materialSources.flatMap(source=>materialTypes.map(type=>[period,u,source,type,'','','','']));
}
$('detailBody').onclick=e=>{
 const b=e.target.closest('[data-log-view]');
 if(b){logisticsView=b.dataset.logView;render();$('detailBody').querySelector('[aria-pressed=true]')?.focus()}
};
function assetValues(u,m){
 const k='2026-'+String(m).padStart(2,'0')+'|'+u;
 const row={...assetBase[k],...detailOverrides.asset[k]};return {...row,gd_unit:row.gd_unit!==undefined?row.gd_unit:row.gd,gd:row.gd_unit!==undefined?row.gd_unit:row.gd,lbs_motorize:row.lbs_motorize!==undefined?row.lbs_motorize:row.lbs,lbs:row.lbs_motorize!==undefined?row.lbs_motorize:row.lbs};
}
const places=[
 [-2.5333,140.7,790,70],[-2.5964,140.6324,790,215],[-2.5684,140.5052,580,75],
 [-2.9028,140.7657,790,342],[-2.5791,140.1495,540,320],[-1.8547,138.7493,123,78]
];
const mapMetrics=[['sales','Penjualan'],['loss','Susut'],['saidi','SAIDI'],['tm','Gangguan TM']];
function renderUlpMap(){
 const showingHi=mapMode==='hi', hi=showingHi?hiForPeriod():null;
 const world=256*2**9;
 const xy=(lat,lon)=>[(lon+180)/360*world,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*world];
 const center=xy(-2.36,139.77),left=center[0]-450,top=center[1]-200;
 let tiles='',lines='';
 for(let x=Math.floor(left/256);x<=Math.floor((left+899)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+399)/256);y++){
  tiles+='<img alt="" loading="lazy" src="https://tile.openstreetmap.org/9/'+x+'/'+y+'.png" style="left:'+((x*256-left)/9)+'%;top:'+((y*256-top)/4)+'%">';
 }
 const cards=places.map(([lat,lon,cx,cy],i)=>{
  const [px,py]=xy(lat,lon),x=px-left,y=py-top,u=dataset.units[i+1];
  lines+='<line x1="'+x+'" y1="'+y+'" x2="'+cx+'" y2="'+cy+'"/><circle cx="'+x+'" cy="'+y+'" r="5"/>';
  const metrics=showingHi?hiBands.map(([id,label,color])=>'<span class="map-metric hi-map-row" style="--hi-color:'+color+'"><span>'+label+'</span><b>'+(hi?hi.filter(r=>r.ulp===u.slice(4)&&r.band[0]===id).length:'—')+'</b></span>').join(''):mapMetrics.map(([k,label])=>{
   const [target,actual]=values(u,month(),k),[,name,satuan]=meta.get(k);
   const value=actual==null?'—':fmt(actual)+(satuan==='%'?'%':' '+satuan);
   return '<span class="map-metric" title="'+ehtml(name)+' · Target '+fmt(target)+' · Pencapaian '+percent(achievement(k,target,actual))+'"><span>'+label+'</span><span><b>'+value+'</b> '+icon(...status(k,target,actual))+'</span></span>';
  }).join('');
  return '<button class="map-pin map-kpis" data-map-unit="'+(i+1)+'" style="left:'+(cx/9)+'%;top:'+(cy/4)+'%"><strong>'+u+'</strong>'+metrics+'</button>';
 }).join('');
 const controls='<div class="detail-filters"><label>Data peta<select id="mapMode"><option value="kpi" '+(!showingHi?'selected':'')+'>Kinerja ULP</option><option value="hi" '+(showingHi?'selected':'')+'>Health Index Penyulang</option></select></label>'+(showingHi?hiYearPicker()+hiBasisPicker():'')+'</div>';
 const note=showingHi?'Jumlah penyulang per kategori · '+hiPeriodLabel()+'. Klik kartu untuk membuka rincian HI ULP.':'Realisasi '+months[month()-1]+' 2026. Klik kartu untuk membuka kinerja ULP.';
 return controls+(showingHi?hiLegend():'')+'<p class="muted">'+note+'</p><div class="scroll" tabindex="0" aria-label="Peta enam ULP, dapat digulir mendatar"><div class="map-frame">'+tiles+'<svg viewBox="0 0 900 400" aria-hidden="true">'+lines+'</svg>'+cards+'</div></div><p class="muted">Penanda menunjukkan pusat lokalitas. Peta dasar memerlukan internet. <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></p>';
}
$('detailTabs').onclick=e=>{
 const b=e.target.closest('[data-detail-tab]');if(!b)return;
 detailTab=b.dataset.detailTab;render();
 $('detailTabs').querySelector('[aria-pressed=true]')?.focus();
};
$('detailBody').onchange=e=>{
 const k=e.target.dataset.detailFilter;if(!k)return;
 detailFilters[k]=e.target.value;renderDetail();
 $('detailBody').querySelector('[data-detail-filter="'+k+'"]')?.focus();
};
$('mapBody').onchange=e=>{
 if(e.target.id!=='mapMode')return;
 mapMode=e.target.value;render();$('mapMode')?.focus();
};
$('mapBody').onclick=e=>{
 const b=e.target.closest('[data-map-unit]');if(!b)return;
 $('unit').value=dataset.units[Number(b.dataset.mapUnit)];
 if(mapMode==='hi'){detailTab='hi';hiFilter='';changePage('detail')}else changePage('ulp');
};
function csvDownload(rows,name){
 const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=name;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadDetail(kind,blank){
 if(kind==='trafo'){csvDownload([detailKinds.trafo.fields,...(blank?[]:trafoScope().map(trafoExportRow))],(blank?'Template_':'Ekspor_')+'Gangguan_Trafo.csv');return}
 if(kind==='stock'&&(blank||stockMatrixRows().length)){csvDownload(stockMatrixTemplate(blank),(blank?'Template_':'Ekspor_')+'Logistik.csv');return}
 if(kind==='pdkb'){csvDownload(pdkbTemplateRows(blank),(blank?'Template_':'Ekspor_')+'PDKB_2025-2026.csv');return}
 if(kind==='ito'){downloadIto(blank);return}
 if(kind==='fgmonthly'){
  csvDownload([fgMonthlyFields,...months.map(m=>[m,'',''])],'Template_FGTM_Bulanan.csv');
  return;
 }
 if(kind==='fglog'){
  csvDownload([fgFields.map(([,label])=>label)],'Template_FGTM_Register.csv');
  return;
 }
 const schema=detailKinds[kind];
 let rows=[];
 if(blank&&['pdkb','stock','ito'].includes(kind))rows=templateRows(kind);
 else if(kind==='asset'){
  for(const u of dataset.units)for(let m=1;m<=12;m++){
   const row=blank?{}:assetValues(u,m);
   rows.push(['2026-'+String(m).padStart(2,'0'),u,...schema.fields.slice(2).map(f=>row[f])]);
  }
 }else if(!blank)rows=Object.values(detailOverrides[kind]).map(row=>schema.fields.map(f=>row[f]));
 else if(kind==='yodaily')rows=dataset.units.slice(1).map(u=>['2026-10',u,...Array(8).fill('')]);
 else rows=[['2026-10','UP3 JAYAPURA']];
 csvDownload([schema.fields,...rows],(blank?'Template_':'Ekspor_')+schema.sheet+'_UP3_Jayapura_2026.csv');
}
$('detailExport').onclick=()=>{
 if(detailTab==='cause'&&causeView==='history'){exportCauseHistory();return}
 if(detailTab==='hi'){
  const rows=(hiForPeriod()||[]).filter(r=>(unit()===dataset.units[0]||unit().slice(4)===r.ulp)&&(!hiFilter||hiFilter===r.band[0]));
  csvDownload([['Tahun','Bulan','ULP','Penyulang','Jumlah trip','Kategori HI'],...rows.map(r=>[hiYear,hiBasis==='monthly'?month():'Rekap workbook',r.ulp,r.name,r.trips,r.band[1]])],'Health_Index_Penyulang.csv');
  return;
 }
 if(detailTab==='fgtm'){
  const rows=fgScope().rows;
  csvDownload([fgFields.map(([,label])=>label),...rows.map(r=>fgFields.map(([k])=>r[k]))],'Ekspor_FGTM_2025-2026.csv');
  return;
 }
 if(detailTab==='yo'&&yoView!=='monthly')downloadDetail('yodaily',false);
 else if(detailTab==='performance'||detailTab==='yo')downloadTable(false);
 else if(detailTab==='stock')downloadDetail(logisticsView,false);
 else downloadDetail(detailTab,false);
};

try {
 const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');
 for(const [key,pair] of Object.entries(stored||{})){
  if(kpiKey(...key.split('|').map((v,i)=>i===1?Number(v):v))&&Array.isArray(pair)&&pair.length===2&&pair.every(v=>v===null||(Number.isFinite(v)&&v>=0)))overrides[key]=pair;
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
  if(!kpiKey(u,Number(period?.[1]),k))fail('Periode, unit, atau kode indikator tidak dikenal.');
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
async function xlsxRows(buffer,kind,sheetName=null){
 const read=workbookReader(buffer);
 const sheets=tags(parseXml(await read('xl/workbook.xml')),'sheet');
 if(kind==='pdkb'&&!sheetName){const names=sheets.map(s=>s.getAttribute('name')).filter(n=>/pdkb/i.test(n));if(names.length)return (await Promise.all(names.map(n=>xlsxRows(buffer,kind,n)))).flat()}
 const preferred=kind==='performance'?['kinerja','data']:[detailKinds[kind].sheet.toLowerCase()];
 const sheet=(sheetName?sheets.find(s=>s.getAttribute('name')===sheetName):sheets.find(s=>preferred.includes(s.getAttribute('name').toLowerCase())))??sheets[0];
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
async function readImport(blob,name,kind){
 if(blob.size>10*1024*1024)throw Error('Ukuran file maksimal 10 MB.');
 if(/\.xlsx$/i.test(name)||blob.type.includes('spreadsheetml'))return xlsxRows(await blob.arrayBuffer(),kind);
 const text=await blob.text();
 if(text.trimStart().startsWith('<'))throw Error('Tautan membuka halaman web. Gunakan tautan ekspor CSV atau unggah file.');
 return csvRows(text);
}
async function importFrom(load,kind){
 const feedback=$('importFeedback');
 const buttons=$('importDialog').querySelectorAll('button');
 buttons.forEach(b=>b.disabled=true);
 feedback.textContent='Membaca data…';
 try{
  const rows=await load();
  if(kind==='fgmonthly'||kind==='fglog'){
   if(fgImport(rows,kind)){
    $('importDialog').close();
    $('notice').textContent='Data FGTM berhasil diimpor.';
   }else feedback.textContent='Impor dibatalkan.';
   return;
  }
  if(kind!=='performance'){
   const changes=decodeDetail(rows,kind),keys=Object.keys(changes);
   if(keys.some(k=>Object.hasOwn(detailOverrides[kind],k)||(kind==='asset'&&Object.hasOwn(assetBase,k)))&&!confirm('Perbarui entri yang sudah ada?')){feedback.textContent='Impor dibatalkan.';return}
   const updated={...detailOverrides[kind]};
   for(const key of keys)updated[key]={...updated[key],...changes[key]};
   const next={...detailOverrides,[kind]:updated};
   localStorage.setItem(detailStorage,JSON.stringify(next));
   detailOverrides=next;
   const first=changes[keys[0]];
   detailTab=kind==='ito'?'stock':kind==='yodaily'?'yo':kind;
   if(kind==='yodaily'){yoView='officer';yoDate=first.tanggal;yoOfficer='';}
   if(kind==='ito'||kind==='stock')logisticsView=kind;
   if(kind==='pdkb')pdkbYear=first.periode.slice(0,4);
   if(kind==='trafo'){trafoYear='all';trafoMonth='all';trafoBrand='';trafoCapacity='';trafoCompare='all';}
   changePage('detail');
   $('unit').value=first.unit;$('month').value=String(Number(first.periode.slice(-2)));
   render();$('importDialog').close();
   $('notice').textContent=keys.length+' entri detail tersimpan di browser ini.';
   return;
  }
  const changes=decodeRows(rows), keys=Object.keys(changes);
  const existing=keys.filter(k=>(overrides[k]??dataset.records[k]??[]).some(v=>v!==null)).length;
  if(existing&&!confirm(existing+' entri dengan nilai yang sudah ada akan diperbarui. Lanjutkan?')){feedback.textContent='Impor dibatalkan.';return}
  localStorage.setItem(storageKey,JSON.stringify({...overrides,...changes}));
  Object.assign(overrides,changes);
  const [u,m,k]=keys[0].split('|');
  if(page==='ulp'&&u===dataset.units[0])changePage('summary');
  $('unit').value=u;$('month').value=m;
  const nextGroup=dataset.groups.findIndex(([,items])=>items.some(([id])=>id===k));
  if(nextGroup<0){detailFilters.kpi=k;detailTab=yoIds.includes(k)?'yo':'performance';if(detailTab==='yo')yoSelected=k;changePage('detail')}else{group=nextGroup;selected=k;}
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
$('template').onclick=()=>{const kind=$('importKind').value;if(kind==='performance')downloadTable(true);else downloadDetail(kind,true)};
$('export').onclick=()=>downloadTable(false);
$('importFile').onchange=e=>{
 const file=e.target.files[0];e.target.value='';
 const kind=$('importKind').value;
 if(file)importFrom(()=>readImport(file,file.name,kind),kind);
};
$('linkForm').onsubmit=e=>{
 e.preventDefault();
 const kind=$('importKind').value;
 importFrom(async()=>{
  const url=spreadsheetUrl($('sheetLink').value);
  let response;
  try{response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(20000)})}
  catch{throw Error('Tautan tidak dapat dibaca. Periksa akses atau unggah file Excel/CSV.')}
  if(!response.ok)throw Error('Spreadsheet mengembalikan HTTP '+response.status+'.');
  return readImport(await response.blob(),url.pathname,kind);
 },kind);
};

const slides=[
 ...dataset.groups.map(([label],index)=>({label,page:'summary',group:index})),
 {label:'Kinerja per ULP',page:'ulp'},
 ...Object.entries(detailKinds).filter(([,kind])=>kind.label).map(([key,kind])=>({label:kind.label,page:'detail',detail:key})),
 {label:'Perputaran material (ITO)',page:'detail',detail:'stock',logistics:'ito'},
 {label:'Peta ULP',page:'map'}
];
let presenting=false;
function activeSlide(){
 return slides.findIndex(slide=>{
  if(slide.page!==page)return false;
  if(page==='summary')return slide.group===group;
  if(page==='detail')return slide.detail===detailTab&&(detailTab!=='stock'||(slide.logistics??'stock')===logisticsView);
  return true;
 });
}
function openSlide(index){
 const slide=slides[index];
 if(!slide)return;
 if(slide.page==='summary'){
  group=slide.group;
  selected=dataset.groups[group][1][0][0];
  view='trend';
 }
 if(slide.page==='detail'){
  detailTab=slide.detail;
  if(detailTab==='stock')logisticsView=slide.logistics??'stock';
 }
 changePage(slide.page);
}
let panelCollapsed=false;
function setPanelCollapsed(collapsed){
 panelCollapsed=collapsed;
 $('panelExpanded').hidden=collapsed;
 if(collapsed)$('compactTools').append($('zoomControls'));
 else $('heroTools').insertBefore($('zoomControls'),$('panelToggle'));
 $('panelToggle').setAttribute('aria-expanded',String(!collapsed));
 $('compactTitle').hidden=!collapsed;
 $('panelOpen').setAttribute('aria-expanded',String(!collapsed));
 document.body.classList.toggle('panel-collapsed',collapsed);
 requestAnimationFrame(fitSummaryDetail);
}
$('panelToggle').onclick=()=>{setPanelCollapsed(true);$('panelOpen').focus()};
$('panelOpen').onclick=()=>{setPanelCollapsed(false);$('panelToggle').focus()};
function togglePresentation(){
 presenting=!presenting;
 $('slideFull').hidden=!presenting;
 $('presentationBrand').hidden=!presenting;
 document.body.classList.toggle('presentation',presenting);
 $('present').setAttribute('aria-pressed',String(presenting));
 $('present').textContent=presenting?'Keluar paparan':'Mode paparan';
 if(!presenting&&document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
 setPanelCollapsed(presenting);
 (presenting?$('panelOpen'):$('present')).focus();
}
$('present').onclick=togglePresentation;
$('slideFull').onclick=async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
 }catch{alert('Layar penuh tidak tersedia di browser ini.')}
};
document.addEventListener('fullscreenchange',()=>{
 const label=document.fullscreenElement?'Keluar layar penuh':'Layar penuh';
 $('slideFull').setAttribute('aria-label',label);
 $('slideFull').title=label;
});
let touchStart=null;
const content=$('content');
content.addEventListener('touchstart',event=>{
 touchStart=null;
 if(!presenting||event.touches.length!==1||event.target.closest('input,select,textarea,[contenteditable]'))return;
 const scroller=event.target.closest('.scroll');
 if(scroller&&scroller.scrollWidth>scroller.clientWidth+1)return;
 const touch=event.touches[0];
 touchStart={x:touch.clientX,y:touch.clientY,id:touch.identifier};
},{passive:true});
content.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
content.addEventListener('touchend',event=>{
 const start=touchStart;
 touchStart=null;
 if(!presenting||!start||event.touches.length)return;
 const touch=Array.from(event.changedTouches).find(point=>point.identifier===start.id);
 if(!touch)return;
 const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
 if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.6)return;
 const next=activeSlide()+(dx<0?1:-1);
 if(!slides[next])return;
 if(event.cancelable)event.preventDefault();
 openSlide(next);
},{passive:false});
document.addEventListener('keydown',event=>{
 if($('importDialog').open||$('noteDialog').open||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.target?.closest?.('input,select,textarea,[contenteditable],.scroll'))return;
 if(event.key.toLowerCase()==='m'){event.preventDefault();setPanelCollapsed(!panelCollapsed);(panelCollapsed?$('panelOpen'):$('panelToggle')).focus();return}
 if(!presenting)return;
 if(event.key==='Escape'&&!document.fullscreenElement){togglePresentation();return}
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 event.preventDefault();
 openSlide(activeSlide()+(event.key==='ArrowLeft'?-1:1));
});

let dataZoom=100;
function setDataZoom(percent){
 dataZoom=Math.max(50,Math.min(150,percent));
 const scale=String(dataZoom/100);
 $('zoomNavigation').style.zoom=scale;
 $('dataCanvas').style.zoom=scale;
 requestAnimationFrame(fitSummaryDetail);
 $('zoomReset').textContent=dataZoom+'%';
 $('zoomOut').disabled=dataZoom===50;
 $('zoomIn').disabled=dataZoom===150;
}
$('zoomOut').onclick=()=>setDataZoom(dataZoom-10);
$('zoomIn').onclick=()=>setDataZoom(dataZoom+10);
$('zoomReset').onclick=()=>setDataZoom(100);

const noteFields=[['analysis','Analisa'],['evaluation','Evaluasi'],['mitigation','Rencana mitigasi']];
const noteStorage='up3-distribusi-notes-v1';
let notes={};
try{const saved=JSON.parse(localStorage.getItem(noteStorage));if(saved&&typeof saved==='object'&&!Array.isArray(saved))notes=saved}catch{}
const noteTitle=k=>({pdkb:'Realisasi PDKB',ito:'Perputaran material (ITO)'}[k]||meta.get(k)?.[1]);
const noteKey=k=>[unit(),month(),k,...(k==='pdkb'&&pdkbYear!=='2026'?[pdkbYear]:[])].join('|');
function noteBox(k){
 const record=notes[noteKey(k)]||{};
 return '<section class="notes-box"><div class="detail-head"><h3>Catatan kinerja</h3><button type="button" data-edit-notes="'+ehtml(k)+'">Edit catatan</button></div><div class="notes-grid">'+noteFields.map(([field,label])=>'<div><strong>'+label+'</strong><p>'+ehtml(record[field]||'—')+'</p></div>').join('')+'</div></section>';
}
let editingNote;
$('content').addEventListener('click',event=>{
 const trigger=event.target.closest('[data-edit-notes]');
 if(!trigger)return;
 const k=trigger.dataset.editNotes;
 editingNote={k,u:unit(),m:month(),key:noteKey(k)};
 $('noteContext').textContent=noteTitle(k)+' · '+unit()+' · '+months[month()-1]+' '+(k==='pdkb'?pdkbYear:'2026');
 for(const [field] of noteFields)$('note-'+field).value=notes[editingNote.key]?.[field]||'';
 $('noteFeedback').textContent='';
 $('noteDialog').showModal();
});
$('noteCancel').onclick=()=>$('noteDialog').close();
function noteDraft(k,u,m){
 const period=(k==='pdkb'?pdkbYear:'2026')+'-'+String(m).padStart(2,'0')+'|'+u;
 if(k==='pdkb'){
  const reports=pdTeams.map(team=>detailOverrides.pdkb[period+'|'+team]||{});
  return {
   analysis:pdTeams.map((team,i)=>team+': '+fmt(reports[i].pekerjaan_titik)+' titik, ENS diselamatkan '+fmt(reports[i].ens_diselamatkan_mwh)+' MWh.').join(' '),
   evaluation:reports.every(r=>r.pekerjaan_titik!=null&&r.ens_diselamatkan_mwh!=null)?'Realisasi regu tersedia. Telaah penyelesaian pekerjaan dan kontribusi ENS.':'Lengkapi realisasi pekerjaan dan ENS regu.',
   mitigation:'Verifikasi angka dengan laporan PDKB dan prioritaskan pekerjaan berikutnya berdasarkan potensi ENS yang diselamatkan.'
  };
 }
 if(k==='ito'){
  const {target_ito:t,realisasi_ito:a}=detailOverrides.ito[period]||{};
  return {
   analysis:'ITO tercatat '+fmt(a)+' kali dengan target '+fmt(t)+' kali.',
   evaluation:t==null||a==null?'Lengkapi target dan realisasi ITO.':'Selisih realisasi terhadap target '+fmt(a-t)+' kali.',
   mitigation:'Tinjau material dengan perputaran rendah dan cocokkan jadwal pengadaan dengan kebutuhan penggunaan.'
  };
 }
 const [t,a]=values(u,m,k), [,name,satuan,polarity]=meta.get(k);
 const score=achievement(k,t,a);
 const [label]=status(k,t,a);
 const gap=t==null||a==null?null:a-t;
 const action={
  sales:'Periksa selisih penjualan per segmen dan konfirmasi perubahan pemakaian pelanggan utama.',
  loss:'Rekonsiliasi neraca energi, lalu periksa titik ukur dan lokasi dengan selisih terbesar.',
  saidi:'Urutkan kejadian berdasarkan kontribusi menit-pelanggan dan kaji durasi pemulihan.',
  saifi:'Telusuri kejadian berulang per penyulang dan periksa penyebab dominan.',
  ens:'Identifikasi kejadian dengan kontribusi ENS terbesar dan kaji opsi pemulihan pasokan.',
  rating:'Kelompokkan keluhan berulang dan tinjau tindak lanjut tiket bersama ULP.',
  response:'Tinjau waktu penugasan dan perjalanan regu pada tiket dengan respons terlama.',
  dispatch:'Periksa tiket gagal auto dispatch dan validasi lokasi, cakupan regu, serta aturan penugasan.',
  yantek_wo:'Tinjau backlog dan distribusi WO per regu. Prioritaskan WO yang melewati tenggat.',
  yantek_sla:'Tinjau sampel WO gagal SLA dan tindak lanjuti temuan kualitas yang berulang.',
  rkap:'Rekonsiliasi realisasi dengan pagu dan jadwal pembayaran RKAP.',
  inv:'Cocokkan penyerapan dengan progres fisik dan jadwal pembayaran pekerjaan.',
  op:'Rekonsiliasi realisasi biaya operasi dengan rencana periode dan periksa pos dengan deviasi terbesar.'
 }[k]||(polarity==='down'?'Telusuri kejadian dengan dampak terbesar dan verifikasi penyebab sebelum menetapkan tindakan.':'Periksa komponen yang paling memengaruhi selisih terhadap target.');
 return {
  analysis:name+' mencatat realisasi '+fmt(a)+' '+satuan+' dengan target '+fmt(t)+' '+satuan+(gap===null?'.':'. Selisih realisasi terhadap target '+(gap>0?'+':'')+fmt(gap)+(satuan==='%'?' poin persentase':' '+satuan)+'.'),
  evaluation:score===null?'Pencapaian belum dapat dinilai. Lengkapi target atau realisasi sesuai laporan sumber.':'Pencapaian '+percent(score)+' berstatus '+label.toLowerCase()+'. '+(label==='Baik'?'Pantau konsistensi hasil pada periode berikutnya.':'Periksa penyebab deviasi dan tetapkan prioritas tindak lanjut.'),
  mitigation:score===null?'Validasi data sumber dan lengkapi angka yang kosong. '+action:action+' Tetapkan PIC dan tenggat, lalu cek hasil pada periode berikutnya.'
 };
}
$('noteSuggest').onclick=()=>{
 const {k,u,m}=editingNote;
 const draft=noteDraft(k,u,m);
 if(noteFields.some(([field])=>$('note-'+field).value.trim())&&!confirm('Ganti isi formulir dengan draf rekomendasi?'))return;
 for(const [field] of noteFields)$('note-'+field).value=draft[field];
 $('noteFeedback').textContent='Draf dari data indikator. Tinjau dan sesuaikan sebelum menyimpan.';
};
$('noteForm').onsubmit=event=>{
 event.preventDefault();
 if(!editingNote)return;
 const updated={...notes,[editingNote.key]:Object.fromEntries(noteFields.map(([field])=>[field,$('note-'+field).value]))};
 try{localStorage.setItem(noteStorage,JSON.stringify(updated))}
 catch{$('noteFeedback').textContent='Catatan gagal disimpan di browser.';return}
 notes=updated;
 $('noteDialog').close();
 render();
};
const yoIds=['yantek_wo','yantek_sla'];
let yoSelected=yoIds[0];
const yoScores=['skor_performa','skor_produktivitas','skor_hari_kerja'];
const yoDailyHeaders=['Skor performa','Skor produktivitas','Skor hari kerja','PO harian','WO harian'];
const yoDailyFields=[...yoScores,'po','wo'];
const yoDailyMetrics=row=>yoDailyFields.map(field=>fmt(row[field]));
let yoView='monthly',yoDate='',yoOfficer='';
function yoAggregate(rows){
 return yoDailyFields.map(field=>{
  const reported=rows.map(row=>row[field]).filter(Number.isFinite);
  if(!reported.length)return null;
  const sum=reported.reduce((a,b)=>a+b,0);
  return yoScores.includes(field)?sum/reported.length:sum;
 });
}
function renderYoDaily(){
 const prefix=periodText()+'-';
 const monthly=Object.values(detailOverrides.yodaily).filter(row=>row.tanggal.startsWith(prefix));
 const dates=[...new Set(monthly.map(row=>row.tanggal))].sort().reverse();
 const date=dates.includes(yoDate)?yoDate:dates[0]||'';
 const daily=monthly.filter(row=>row.tanggal===date);
 const byUlp=yoView==='ulp';
 const unitRows=daily.filter(row=>unit()===dataset.units[0]||row.unit===unit());
 const officers=new Map(unitRows.map(row=>[row.unit+'|'+row.id_petugas,row.nama_petugas+' · '+row.id_petugas+' · '+row.unit]));
 const officerPicker=byUlp?'':'<label>Petugas<select id="yoOfficer">'+option('','Semua petugas')+[...officers].map(([key,label])=>option(ehtml(key),ehtml(label))).join('')+'</select></label>';
 const selected=daily.length?'<div class="detail-filters"><label>Tanggal<select id="yoDate">'+dates.map(d=>option(d,d)).join('')+'</select></label>'+officerPicker+'</div>':'';
 let table;
 if(byUlp){
  const rows=dataset.units.slice(1).map(u=>{
   const reports=daily.filter(row=>row.unit===u);
   return [u,fmt(reports.length),...yoAggregate(reports).map(fmt)];
  });
  table=detailTable(['ULP','Petugas tercatat',...yoDailyHeaders],rows);
 }else{
  const rows=unitRows.filter(row=>!officers.has(yoOfficer)||row.unit+'|'+row.id_petugas===yoOfficer)
   .sort((a,b)=>a.unit.localeCompare(b.unit)||a.nama_petugas.localeCompare(b.nama_petugas));
  table=detailTable(['ULP','ID petugas','Nama petugas',...yoDailyHeaders],rows.map(row=>[row.unit,row.id_petugas,row.nama_petugas,...yoDailyMetrics(row)]));
 }
 const dailyTotals=dates.map(d=>{
  const reports=monthly.filter(row=>row.tanggal===d&&(byUlp||unit()===dataset.units[0]||row.unit===unit())&&(byUlp||!officers.has(yoOfficer)||row.unit+'|'+row.id_petugas===yoOfficer));
  return [d,...yoAggregate(reports).slice(3).map(fmt)];
 });
 return '<h3>'+ (byUlp?'Perbandingan enam ULP':'Rincian per petugas')+'</h3>'+selected+table+
 '<p class="muted">'+(byUlp?'Skor ULP adalah rata-rata skor yang terisi. PO dan WO dijumlahkan dari laporan petugas. ':'Skor petugas mengikuti nilai yang diimpor. ')+'Tanda — berarti belum ada nilai.</p>'+
 '<h3>Realisasi PO dan WO menurut tanggal'+(byUlp?' · seluruh ULP':'')+'</h3>'+detailTable(['Tanggal','PO','WO'],dailyTotals)+
 '<p class="muted">Pilih Impor data → YO Harian untuk memperbarui laporan.</p>';
}
function renderYo(){
 const tabs='<div class="toolbar" aria-label="Tampilan YO">'+[['monthly','Tren bulanan'],['ulp','Per ULP'],['officer','Per petugas']].map(([v,label])=>'<button data-yo-view="'+v+'" aria-pressed="'+(v===yoView)+'">'+label+'</button>').join('')+'</div>';
 if(yoView!=='monthly')return '<h2>Yantek Optimization</h2>'+tabs+renderYoDaily();
 const k=yoSelected, [,name,satuan]=meta.get(k);
 const points=months.map((label,i)=>({label,short:label.slice(0,3),values:values(unit(),i+1,k)}));
 return '<h2>Yantek Optimization · '+unit()+'</h2>'+tabs+'<div class="scroll"><table><thead><tr><th>Indikator</th><th>Target</th><th>Realisasi</th><th>Pencapaian</th></tr></thead><tbody>'+yoIds.map(id=>{
  const [t,a]=values(unit(),month(),id);
  return '<tr><td><button data-yo="'+id+'" aria-pressed="'+(id===k)+'">'+(id===yoIds[0]?'WO selesai':'SLA kualitas')+'</button></td><td>'+fmt(t)+'</td><td>'+fmt(a)+'</td>'+achievementCell(id,t,a)+'</tr>';
 }).join('')+'</tbody></table></div><h3>'+name+'</h3><p class="muted">Satuan '+satuan+' · Target biru · Realisasi hijau</p><div class="detail-chart scroll">'+chart(points)+'</div>'+noteBox(k)+'<p class="muted">Isi target dan realisasi melalui Impor data → Kinerja. Gunakan kode yantek_wo atau yantek_sla.</p>';
}
$('detailBody').addEventListener('click',event=>{
 const viewButton=event.target.closest('[data-yo-view]');
 if(viewButton){
  yoView=viewButton.dataset.yoView;renderDetail();
  $('detailBody').querySelector('[data-yo-view="'+yoView+'"]').focus();
  return;
 }
 const button=event.target.closest('[data-yo]');
 if(button){yoSelected=button.dataset.yo;renderDetail();$('detailBody').querySelector('[data-yo="'+yoSelected+'"]').focus()}
});

$('detailBody').addEventListener('change',event=>{
 if(event.target.id==='yoDate'){yoDate=event.target.value;yoOfficer=''}
 else if(event.target.id==='yoOfficer')yoOfficer=event.target.value;
 else return;
 renderDetail();
 $(event.target.id)?.focus();
});
function fitSummaryDetail(){
 if(page!=='summary')return;
 const panel=$('summaryDetail'), content=$('content');
 const viewport=content.getBoundingClientRect();
 const panelTop=panel.getBoundingClientRect().top;
 const stacked=window.matchMedia('(max-width: 960px)').matches;
 const room=stacked?content.clientHeight:viewport.bottom-panelTop-content.clientTop+content.scrollTop;
 panel.style.setProperty('--summary-detail-height',Math.max(160,(room-8)/(dataZoom/100))+'px');
}
const detailSizeObserver=new ResizeObserver(()=>requestAnimationFrame(fitSummaryDetail));
for(const id of ['content','groups','statusLegend','notice'])detailSizeObserver.observe($(id));

const fgFields=[
 ['tanggal','Tanggal / BLTH'],['ulp','ULP'],['lokasi','Lokasi'],['penyulang','Penyulang'],
 ['pemutus','Nama pemutus'],['keypoint','Jenis keypoint'],['pekerjaan','Jenis pekerjaan'],
 ['kontrol','Kontrol Open'],['lama','Lama padam (sumber)'],['menit','Konversi waktu (menit)'],
 ['indikasi','Indikasi'],['cuaca','Cuaca'],['penyebab','Penyebab'],['detail','Detail penyebab'],['rct','RCT'],['baris','Baris sumber']
];
const fgState={mode:'',ulp:'',search:'',work:'',cause:''};
const fgNormalize=v=>String(v??'').trim().toLocaleUpperCase('id');
const fgMonthlyFields=['Bulan','2025 (kejadian)','2026 (kejadian)'];
const fgStorage='up3-fgtm-import-v1';
let fgImported={logs:{},monthly:{}};
try{
 const saved=JSON.parse(localStorage.getItem(fgStorage)||'null');
 if(saved?.logs&&saved?.monthly)fgImported=saved;
}catch{}
function fgAllRows(){
 return ['2025','2026'].flatMap(year=>fgImported.logs[year]??fgtmData.rows.filter(r=>r.tanggal.startsWith(year)));
}
function fgCutoff(year){
 return fgImported.logs[year]?.reduce((max,r)=>r.tanggal>max?r.tanggal:max,'')??fgtmData.cutoff[year];
}
function fgDecode(rows,kind){
 const filled=rows.filter(row=>row.some(v=>String(v??'').trim()));
 const header=(filled.shift()||[]).map(v=>String(v??'').trim().toLowerCase());
 const fields=kind==='fgmonthly'?fgMonthlyFields:fgFields.map(([,label])=>label);
 if(fields.slice(0,kind==='fgmonthly'?3:15).some(f=>!header.includes(f.toLowerCase())))throw Error('Gunakan struktur kolom pada template FGTM.');
 const output={};
 for(const [i,row] of filled.entries()){
  const read=label=>String(row[header.indexOf(label.toLowerCase())]??'').trim();
  const fail=msg=>{throw Error('Baris '+(i+2)+' · '+msg)};
  if(kind==='fgmonthly'){
   const label=fgNormalize(read('Bulan'));
   const month=months.findIndex(m=>fgNormalize(m)===label);
   if(month<0)fail('Nama bulan tidak dikenali.');
   for(const [n,year] of ['2025','2026'].entries()){
    const raw=read(fields[n+1]);
    if(raw==='')continue;
    const key=year+'-'+String(month+1).padStart(2,'0');
    if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))fail('Jumlah gangguan harus bilangan bulat.');
    if(Object.hasOwn(output,key))fail('Bulan dan tahun duplikat.');
    output[key]=Number(raw);
   }
   continue;
  }
  const record=Object.fromEntries(fgFields.map(([key,label])=>[key,read(label)]));
  const date=new Date(record.tanggal+'T00:00:00Z');
  if(!/^202[56]-\d{2}-\d{2}$/.test(record.tanggal)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==record.tanggal)fail('Gunakan tanggal 2025/2026 dengan format YYYY-MM-DD (teks).');
  record.ulp=fgNormalize(record.ulp).replace(/^ULP /,'');
  record.penyulang=fgNormalize(record.penyulang).replace(/\s+/g,' ');
  if(!dataset.units.slice(1).includes('ULP '+record.ulp)||!record.penyulang)fail('Isi ULP dan nama penyulang.');
  const year=record.tanggal.slice(0,4);
  (output[year]??=[]).push(record);
 }
 if(!Object.keys(output).length)throw Error('Belum ada data FGTM yang diisi.');
 return output;
}
function fgImport(rows,kind){
 const parsed=fgDecode(rows,kind);
 const isLog=kind==='fglog';
 if(!confirm(isLog?'Ganti seluruh register tahun '+Object.keys(parsed).join(' dan ')+' dengan file ini?':'Gunakan angka rekap impor pada grafik UP3 tanpa filter tambahan?'))return false;
 const next=isLog?{...fgImported,logs:{...fgImported.logs,...parsed}}:{...fgImported,monthly:{...fgImported.monthly,...parsed}};
 localStorage.setItem(fgStorage,JSON.stringify(next));
 fgImported=next;
 fgState.ulp='';fgState.search='';fgState.work='';fgState.cause='';
 detailTab='fgtm';changePage('detail');
 return true;
}

const fgChoices=(rows,field)=>[...new Set(rows.map(r=>r[field]).filter(Boolean))].sort();
function fgScope(){
 const matches=(u,name)=>(!fgState.ulp||u===fgState.ulp)&&fgNormalize(name).includes(fgNormalize(fgState.search));
 const all=fgAllRows();
 const pairs=new Map([...fgtmData.feeders,...all.map(r=>[r.ulp,r.penyulang])].map(pair=>[pair.join('|'),pair]));
 const feeders=[...pairs.values()].filter(([u,name])=>matches(u,name));
 const rows=all.filter(r=>matches(r.ulp,r.penyulang)&&(!fgState.work||r.pekerjaan===fgState.work)&&(!fgState.cause||r.penyebab===fgState.cause));
 return {feeders,rows,all};
}
function fgPoints(rows,useMonthly=false){
 const counts=new Map();
 for(const r of rows){
  const m=r.tanggal.slice(0,7);
  counts.set(m,(counts.get(m)||0)+1);
 }
 return months.map((label,i)=>{
  const mm=String(i+1).padStart(2,'0');
  return {label,short:label.slice(0,3),values:[2025,2026].map(y=>{
   const ym=y+'-'+mm;
   return useMonthly&&Object.hasOwn(fgImported.monthly,ym)?fgImported.monthly[ym]:ym>fgCutoff(y).slice(0,7)?null:counts.get(ym)||0;
  })};
 });
}
function fgPlotPoints(points){
 if(fgState.mode!=='cumulative')return points;
 const totals=[0,0];
 return points.map(p=>({...p,values:p.values.map((v,i)=>v===null?null:(totals[i]+=v))}));
}
const fgLegend='<div class="legend"><span><i style="background:#527795"></i>2025</span><span><i style="background:#007b71"></i>2026</span></div>';
const fgSelect=(field,label,items,empty)=>'<label>'+label+'<select data-fg-field="'+field+'">'+[['',empty],...items].map(([v,t])=>'<option value="'+ehtml(v)+'" '+(fgState[field]===v?'selected':'')+'>'+ehtml(t)+'</option>').join('')+'</select></label>';
function renderFeederMonitoring(){
 const {feeders,rows,all}=fgScope();
 const useMonthly=!fgState.ulp&&!fgState.search.trim()&&!fgState.work&&!fgState.cause;
 const points=fgPoints(rows,useMonthly);
 const cutoff=fgCutoff(2026);
 const monthTotal=(index,end)=>points.slice(0,end).reduce((sum,p)=>sum+(p.values[index]??0),0);
 const completeMonths=Number(cutoff.slice(5,7))-1;
 const rowMap=new Map();
 for(const r of rows){
  const key=r.ulp+'|'+r.penyulang;
  if(!rowMap.has(key))rowMap.set(key,[]);
  rowMap.get(key).push(r);
 }
 const cards=feeders.map(([u,name])=>{
  const events=rowMap.get(u+'|'+name)||[];
  const trend=fgPoints(events);
  const summary=[2025,2026].map(year=>events.filter(r=>r.tanggal.startsWith(String(year))).length);
  return '<article class="fg-card"><h3>'+ehtml(name)+'</h3><p class="muted">'+ehtml(u)+' · 2025: '+summary[0]+' · 2026: '+summary[1]+'</p>'+'<p class="muted">Jumlah gangguan (kali)</p>'+chart(fgPlotPoints(trend),['2025','2026'],true)+'</article>';
 }).join('');
 return '<div class="detail-head"><h2>Gangguan Penyulang · FGTM</h2></div><div class="detail-filters">'+fgSelect('mode','Data grafik',[['cumulative','Kumulatif']],'Bulanan')+fgSelect('ulp','Cakupan grafik',dataset.units.slice(1).map(u=>[u.slice(4),u]),'UP3 Jayapura · Semua ULP')+'<label>Cari penyulang<input data-fg-field="search" value="'+ehtml(fgState.search)+'" placeholder="Nama penyulang"></label>'+
 fgSelect('work','Jenis pekerjaan',choices(fgChoices(all,'pekerjaan')),'Semua jenis')+fgSelect('cause','Penyebab',choices(fgChoices(all,'penyebab')),'Semua penyebab')+'</div>'+
 '<p class="muted">Log 2026 tercatat sampai '+cutoff+'. Bulan terakhir dapat bersifat parsial. Satuan grafik: kali gangguan.</p>'+
 '<h3>Perbandingan '+(fgState.mode==='cumulative'?'kumulatif':'bulanan')+' 2025 vs 2026</h3>'+fgLegend+
 (useMonthly&&Object.keys(fgImported.monthly).length?'<p class="muted">Grafik UP3 memakai angka rekap impor pada bulan yang diisi. Grafik penyulang dan filter ULP memakai register.</p>':completeMonths>0?'<p class="muted">Januari–'+months[completeMonths-1]+': <strong>'+monthTotal(0,completeMonths)+' gangguan pada 2025</strong> dan <strong>'+monthTotal(1,completeMonths)+' pada 2026</strong>.</p>':'')+
 '<div class="detail-chart scroll">'+chart(fgPlotPoints(points),['2025','2026'],true)+'</div>'+
 '<h3>Monitoring per penyulang · '+feeders.length+' penyulang</h3><p class="muted">Grafik memakai skala masing-masing penyulang dan jumlah 2025/2026 mengikuti cakupan log.</p><div class="fg-grid">'+(cards||'<p>Belum ada penyulang yang cocok.</p>')+'</div>';
}
$('detailBody').addEventListener('change',event=>{
 const field=event.target.dataset.fgField;
 if(!field)return;
 fgState[field]=event.target.value;
 renderDetail();
 $('detailBody').querySelector('[data-fg-field="'+field+'"]')?.focus();
});
$('detailBody').addEventListener('click',event=>{
 if(!event.target.closest('[data-open-fgtm]'))return;
 detailTab='fgtm';$('content').scrollTop=0;
 renderDetail();
});

const hiBands=[
 ['kronis','Kronis','#9d2636','≥10 trip'],
 ['sakit','Sakit','#a74d15','4–9 trip'],
 ['sehat','Sehat','#216e48','1–3 trip'],
 ['sempurna','Sempurna','#16697e','0 trip']
];
let hiYear='2026',hiFilter='',mapMode='kpi',hiBasis='workbook',faultComparison='matched';
function hiForPeriod(){
 const period=hiYear+'-'+String(month()).padStart(2,'0');
 if(hiBasis==='monthly'&&period>fgCutoff(hiYear).slice(0,7))return null;
 const rows=fgAllRows(), counts=new Map();
 const importedHi=Object.keys(hiWorkbook[hiYear]||{}).map(k=>k.split('|'));
 const feeders=new Map([...fgtmData.feeders,...importedHi,...rows.map(r=>[r.ulp,r.penyulang])].map(pair=>[pair.join('|'),pair]));
 for(const r of rows){
  if(!r.tanggal.startsWith(period+'-')||fgNormalize(r.kontrol)!=='TRIP')continue;
  const key=r.ulp+'|'+r.penyulang;
  counts.set(key,(counts.get(key)||0)+1);
 }
 return [...feeders].map(([key,[ulp,name]])=>{
  const trips=(hiBasis==='workbook'?hiWorkbook[hiYear][key]:counts.get(key))??0;
  const band=hiBands[trips>=10?0:trips>=4?1:trips>0?2:3];
  return {ulp,name,trips,band};
 });
}
const hiLegend=()=>'<div class="hi-legend">'+hiBands.map(([,label,color,rule])=>'<span style="--hi-color:'+color+'">'+label+' · '+rule+'</span>').join('')+'</div>';
function hiYearPicker(){
 return '<label>Tahun HI<select data-hi-year><option '+(hiYear==='2025'?'selected':'')+'>2025</option><option '+(hiYear==='2026'?'selected':'')+'>2026</option></select></label>';
}
function hiPeriodNote(){
 if(hiBasis==='workbook'&&globalThis.up3HiDates?.[hiYear])return ' · Rekap s.d. '+globalThis.up3HiDates[hiYear];
 if(hiBasis==='workbook')return hiYear==='2026'?' · Rekap s.d. 16 November 2026':' · Rekap tahun 2025';
 const cutoff=fgCutoff(hiYear);
 const period=hiYear+'-'+String(month()).padStart(2,'0');
 return period===cutoff.slice(0,7)&&cutoff!==(period+'-'+new Date(Date.UTC(Number(hiYear),month(),0)).getUTCDate())
  ?' · Bulan terakhir pada register, data tercatat sampai '+cutoff:'';
}
function hiBasisPicker(){
 return '<label>Basis HI<select data-hi-basis><option value="workbook" '+(hiBasis==='workbook'?'selected':'')+'>Rekap workbook</option><option value="monthly" '+(hiBasis==='monthly'?'selected':'')+'>Trip bulanan FGTM</option></select></label>';
}
function hiPeriodLabel(){
 return (hiBasis==='monthly'?months[month()-1]+' ':'')+hiYear+hiPeriodNote();
}
function metricBars(title,rows,series){
 const max=Math.max(1,...rows.flatMap(([,values])=>values));
 return '<section class="fg-bar-chart"><h3>'+ehtml(title)+'</h3>'+(rows.length?rows.map(([label,values])=>'<div class="fg-bar-row"><div class="fg-bar-name">'+ehtml(label)+'</div><div>'+values.map((value,i)=>{
  const [name,color]=series[i];
  return '<div class="fg-bar-line" aria-label="'+ehtml(name+' '+fmt(value))+'"><span class="fg-bar-fill" style="width:'+(value/max*100)+'%;background:'+color+'"></span><strong>'+fmt(value)+'</strong></div>';
 }).join('')+'</div></div>').join(''):'<p class="empty">Belum ada data pada pilihan ini.</p>')+'</section>';
}
function renderHealthIndex(){
 const all=hiForPeriod(),picked=unit()===dataset.units[0]?'':unit().slice(4);
 const scope=(all||[]).filter(row=>!picked||picked===row.ulp);
 const rows=scope.filter(row=>!hiFilter||row.band[0]===hiFilter).sort((a,b)=>b.trips-a.trips||a.name.localeCompare(b.name));
 return '<h2>Health Index Penyulang · '+unit()+'</h2><div class="detail-filters">'+hiYearPicker()+hiBasisPicker()+
 '<label>Kategori<select id="hiFilter"><option value="">Semua kategori</option>'+hiBands.map(([id,label])=>'<option value="'+id+'" '+(hiFilter===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div>'+
 '<p class="muted">'+hiPeriodLabel()+' · '+(hiBasis==='workbook'?'Jumlah trip kumulatif dari tab rekap HI workbook. Pasangan ULP–penyulang yang tidak tercatat pada rekap dihitung 0.':'Jumlah trip pada bulan terpilih dari register FGTM aktif.')+'</p>'+hiLegend()+
 (all?'<div class="hi-charts">'+metricBars('Jumlah penyulang per kategori',hiBands.map(([id,label])=>[label,[scope.filter(r=>r.band[0]===id).length]]),[['Penyulang','#007b71']])+
 '<div class="hi-feeder-scroll" tabindex="0" aria-label="Grafik trip per penyulang">'+metricBars('Jumlah trip per penyulang',rows.map(r=>[r.name+' · '+r.ulp,[r.trips]]),[['Trip','#527795']])+'</div></div>':'<p class="empty">Data HI untuk periode ini belum tersedia.</p>');
}
function changeHiYear(event){
 if(event.target.matches('[data-hi-year]'))hiYear=event.target.value;
 else if(event.target.matches('[data-hi-basis]'))hiBasis=event.target.value;
 else return;
 const selector=event.target.matches('[data-hi-year]')?'[data-hi-year]':'[data-hi-basis]';
 render();
 (page==='map'?$('mapBody'):$('detailBody')).querySelector(selector)?.focus();
}
function faultCharts(){
 const u=unit()===dataset.units[0]?'':unit().slice(4);
 const limit=Math.max(0,Math.min(Number(fgCutoff(2025).slice(5,7)),Number(fgCutoff(2026).slice(5,7))-1));
 const rows=fgAllRows().filter(r=>(!u||u===r.ulp)&&(faultComparison==='all'||Number(r.tanggal.slice(5,7))<=limit));
 const series=[['2025','#527795'],['2026','#007b71']];
 const types=[['penyebab','Penyebab'],['indikasi','Indikasi'],['pekerjaan','Jenis pekerjaan'],['rct','RCT']];
 return '<h2>Perbandingan gangguan penyulang 2025 vs 2026</h2><div class="detail-filters"><label>Periode perbandingan<select id="faultComparison"><option value="matched" '+(faultComparison==='matched'?'selected':'')+'>Bulan setara</option><option value="all" '+(faultComparison==='all'?'selected':'')+'>Seluruh data tersedia</option></select></label></div>'+fgLegend+
 '<p class="muted">'+(faultComparison==='matched'&&limit?'Januari–'+months[limit-1]+' untuk kedua tahun. ':'Sesuai cakupan register masing-masing tahun. ')+'FGTM 2026 tercatat hingga '+fgCutoff(2026)+'. Satuan: kejadian. RCT mengikuti kategori sumber.</p><div class="hi-charts">'+types.map(([field,title])=>{
  const counts=new Map();
  for(const r of rows){
   const label=fgNormalize(r[field])||'BELUM DIISI';
   const pair=counts.get(label)||[0,0];
   pair[r.tanggal.startsWith('2025')?0:1]++;
   counts.set(label,pair);
  }
  return metricBars(title,[...counts].sort((a,b)=>(b[1][0]+b[1][1])-(a[1][0]+a[1][1])||a[0].localeCompare(b[0])),series);
 }).join('')+'</div>';
}
$('detailBody').addEventListener('change',event=>{
 changeHiYear(event);
 if(event.target.id==='faultComparison'){faultComparison=event.target.value;renderDetail();$('faultComparison')?.focus()}
 if(event.target.id==='hiFilter'){hiFilter=event.target.value;renderDetail();$('hiFilter')?.focus()}
});
$('mapBody').addEventListener('change',changeHiYear);

render();


function itoRow(year,m,u=unit()){return detailOverrides.ito[year+'-'+String(m).padStart(2,'0')+'|'+u]||{}}
function itoPercent(r){return r.pencapaian_ito??(r.target_ito>0&&r.realisasi_ito!=null?r.realisasi_ito/r.target_ito*100:null)}
function decodeIto(rows){
 const clean=rows.filter(row=>row.some(v=>String(v??'').trim()));
 const hi=clean.findIndex(row=>row.some(v=>String(v??'').trim().toLowerCase()==='periode'));
 if(hi<0)throw Error('Header ITO tidak ditemukan. Gunakan template ITO.');
 const header=clean[hi].map(v=>String(v??'').trim().toLowerCase());
 const blocks=[];
 header.forEach((v,i)=>{if(v!=='periode')return;const target=header[i+2],actual=header[i+3];if(header[i+1]!=='unit'||!/^target_ito(?:_202[56])?$/.test(target)||!/^realisasi_ito(?:_202[56])?$/.test(actual))throw Error('Kolom ITO tidak sesuai template.');const y=target.match(/_(202[56])$/)?.[1]||null;if(y&&actual!=='realisasi_ito_'+y)throw Error('Tahun kolom target dan realisasi berbeda.');blocks.push({i,y,pct:/^(presentase|persentase|pencapaian)/.test(header[i+4]||'')})});
 if(!blocks.length)throw Error('Kolom periode ITO belum tersedia.');
 const result={};
 for(const [n,row] of clean.slice(hi+1).entries())for(const {i,y,pct} of blocks){
  const cell=k=>String(row[i+k]??'').trim();if(![0,1,2,3,4].some(k=>cell(k)))continue;
  const periode=cell(0),u=cell(1).toUpperCase();
  if(!/^202[56]-(0[1-9]|1[0-2])$/.test(periode)||!dataset.units.includes(u)||(y&&periode.slice(0,4)!==y))throw Error('Baris '+(hi+n+2)+': periksa tahun, periode, dan unit ITO.');
  const number=(v,key,percent=false)=>{if(!v)return null;const text=percent?v.replace(/%$/,'').trim():v;if(!/^\d+(?:[.,]\d+)?$/.test(text))throw Error('Baris '+(hi+n+2)+': angka '+key+' tidak valid.');return Number(text.replace(',','.'))};
  const r={periode,unit:u,target_ito:number(cell(2),'target'),realisasi_ito:number(cell(3),'realisasi'),pencapaian_ito:pct?number(cell(4),'persentase',true):null};
  const key=periode+'|'+u;if(Object.hasOwn(result,key))throw Error('Periode dan unit ITO duplikat: '+key);result[key]=r;
 }
 if(!Object.keys(result).length)throw Error('Tidak ada baris data ITO.');return result;
}
function itoWideRows(blank=false){
 const u=unit();return [['Tahun 2026','','','','','','Tahun 2025','','','',''],['periode','unit','target_ITO_2026','realisasi_ITO_2026','Presentase %','','periode','unit','target_ITO_2025','realisasi_ITO_2025','Presentase %'],...months.map((_,i)=>[2026,2025].flatMap((y,j)=>{const r=itoRow(y,i+1,u);const num=v=>v==null?'':String(v).replace('.',',');return [...(j?['']:[]),y+'-'+String(i+1).padStart(2,'0'),u,blank?'':num(r.target_ito),blank?'':num(r.realisasi_ito),blank||r.realisasi_ito==null?'':num(itoPercent(r))+'%']}))];
}
function downloadIto(blank){
 const rows=itoWideRows(blank),csv=rows.map(row=>row.map(v=>String(v??'').includes(';')?'"'+String(v).replaceAll('"','""')+'"':v).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=blank?'Template_ITO.csv':'Ekspor_ITO_2025-2026.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const pdkbFields=['target_pekerjaan_titik','target_ens_diselamatkan_mwh','target_rp_terselamatkan','pekerjaan_titik','ens_diselamatkan_mwh','rp_terselamatkan','persen_titik','persen_ens','persen_rp'];
function decodePdkb(rows){
 let header=null,wide=false;const out={};
 for(const [i,row] of rows.entries()){
 const cells=Array.from(row,v=>String(v??'').trim());if(!cells.some(Boolean))continue;
 if(cells[0]?.toLowerCase()==='periode'){header=cells.map(v=>v.toLowerCase());wide=header.filter(v=>v==='pekerjaan_titik').length===2;if(wide&&(!['pekerjaan_titik','ens_diselamatkan_mwh','rp_terselamatkan'].every((v,k)=>header[k+3]===v&&header[k+6]===v)||header[1]!=='unit'||header[2]!=='regu'))throw Error('Header PDKB tidak sesuai template.');continue}
 if(!/^\d{4}-/.test(cells[0]||''))continue;
 if(!header)throw Error('Header PDKB belum ditemukan.');const period=cells[0],u=(cells[1]||'').toUpperCase(),regu=cells[2];
 if(regu==='Regu 2'&&cells.slice(3).every(v=>!v))continue;
 if(!/^202[56]-(0[1-9]|1[0-2])$/.test(period)||!dataset.units.includes(u)||!pdTeams.includes(regu))throw Error('Baris '+(i+1)+': periode, unit, atau regu tidak valid.');
 const data={periode:period,unit:u,regu};
 for(const [n,k] of pdkbFields.entries()){
 const col=wide?n+3:header.indexOf(k);let v=col<0?'':cells[col]||'';v=v.replace(/%$/,'').trim();if(!v){data[k]=null;continue}
 if(!/^\d+(?:[.,]\d+)?$/.test(v))throw Error('Baris '+(i+1)+': angka '+k+' tidak valid.');data[k]=Number(v.replace(',','.'));if(k.includes('pekerjaan_titik')&&!Number.isInteger(data[k]))throw Error('Pekerjaan harus bilangan bulat.');
 }
 if(!wide&&!header.includes('pekerjaan_titik'))throw Error('Kolom pekerjaan_titik tidak ditemukan.');const key=period+'|'+u+'|'+regu;if(out[key])throw Error('Entri PDKB duplikat: '+key);out[key]=data;
 }
 if(!Object.keys(out).length)throw Error('Tidak ada data PDKB.');return out;
}
function pdkbTemplateRows(blank){return [['PDKB UP3 JAYAPURA','','','Target','','','Realisasi','','','% Titik','% ENS','% Rp_Terselamatkan'],['periode','unit','regu','pekerjaan_titik','ens_diselamatkan_mwh','Rp_Terselamatkan','pekerjaan_titik','ens_diselamatkan_mwh','Rp_Terselamatkan','','',''],...[2026,2025].flatMap(y=>months.flatMap((_,i)=>pdTeams.map(regu=>{const periode=y+'-'+String(i+1).padStart(2,'0'),r=detailOverrides.pdkb[periode+'|'+unit()+'|'+regu]||{};return [periode,unit(),regu,...pdkbFields.map(k=>blank?'':r[k]??'')]})))];}

function pdkbTrend(a,b){
 if(a==null||b==null)return '<span class="muted" title="Data kedua tahun belum lengkap">—</span>';
 const diff=b-a,flat=Math.abs(diff)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
 const state=flat?'flat':diff>0?'up':'down',label=flat?'STUCK':diff>0?'UP':'DOWN',symbol=flat?'→':diff>0?'↑':'↓';
 const change=flat?'0%':a===0?'dari 0':(diff>0?'+':'')+fmt(diff/Math.abs(a)*100)+'%';
 return '<span class="pdkb-trend '+state+'" role="img" aria-label="'+label+' '+ehtml(change)+'" title="Realisasi 2026 dibanding 2025"><b aria-hidden="true">'+symbol+'</b> '+label+' <small>'+ehtml(change)+'</small></span>';
}
function pdkbComparisonTable(rows,year=null,satuan=''){
 const headings=[year?'Bulan':'Indikator',...(year?['Target '+year+' ('+satuan+')','Pencapaian '+year]:[]),'Realisasi 2025','Realisasi 2026','Perubahan 2026 vs 2025'];
 return '<div class="scroll"><table><thead><tr>'+headings.map(h=>'<th scope="col">'+ehtml(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th scope="row">'+ehtml(r.label)+'</th>'+(year?'<td>'+fmt(r.target)+'</td><td>'+(r.pct==null?'—':fmt(r.pct)+'%')+'</td>':'')+'<td>'+fmt(r.a)+'</td><td>'+fmt(r.b)+'</td><td>'+pdkbTrend(r.a,r.b)+'</td></tr>').join('')+'</tbody></table></div>';
}


function stockSummaryCharts(rows,ulp,measure){
 const col=ulp>=0?ulp:stockLocation?Number(stockLocation):13;
 const available=rows.filter(r=>r.values[col]!=null&&r.values[col]>0).length;
 const empty=rows.filter(r=>r.values[col]===0).length,unknown=rows.length-available-empty;
 const cards=[['Jenis material',rows.length],['Stok tersedia',available],['Stok kosong',empty],['Belum ada angka',unknown]].map(([label,n])=>'<div class="panel"><span class="muted">'+label+'</span><h2>'+fmt(n)+'</h2></div>').join('');
 const groups=new Map(),quantities=new Map();
 for(const r of rows){groups.set(r.material,(groups.get(r.material)||0)+1);if(r.satuan===measure){const vals=quantities.get(r.material)||[];vals.push(r.values[col]);quantities.set(r.material,vals)}}
 const sort=(a,b)=>(b[1][0]??0)-(a[1][0]??0);
 const qty=[...quantities].map(([k,v])=>[k,[stockSum(v)]]).filter(([,v])=>v[0]!=null).sort(sort);
 return '<div class="stock-summary-cards">'+cards+'</div><p class="muted">Ringkasan '+ehtml(stockLocs[col])+' · jumlah jenis material, bukan penjumlahan satuan berbeda.</p><div class="detail-grid">'+metricBars('Jenis material per kelompok',[...groups].map(([k,v])=>[k,[v]]).sort(sort),[['Jenis material','#527795']])+(qty.length?metricBars('Jumlah stok per kelompok · '+ehtml(measure),qty,[['Stok','#007b71']]):'<p>Belum ada data untuk satuan grafik ini.</p>')+'</div>';
}
$('detailBody').addEventListener('click',e=>{if(!e.target.closest('[data-stock-reset]'))return;stockGroup='';stockClass='';stockLocation='';stockSearch='';stockMeasure='BH';renderDetail()});

function renderAssets(){
 const fields=detailKinds.asset.fields.slice(2),v=assetValues(unit(),month()),index=fields.indexOf(assetMetric),label=assetLabels[index];
 const compare=dataset.units.slice(1).map(u=>[u,[assetValues(u,month())[assetMetric]??null]]);
 const points=months.map((label,i)=>({label,short:label.slice(0,3),values:[null,assetValues(unit(),i+1)[assetMetric]??null]}));
 return '<h2>Data aset · '+ehtml(unit())+' · '+months[month()-1]+' 2026</h2>'+detailTable(['Aset','Jumlah / panjang'],fields.map((f,i)=>[assetLabels[i],fmt(v[f])]))+'<p class="muted">Sumber Template_Aset.xlsx. Panjang JTM/JTR dipertahankan persis sesuai angka dan header kms pada file; skala/satuan perlu dikonfirmasi. JTM Genyem Januari–Maret 470.200, April–Mei 471; JTR Genyem Januari–Juni 418. Nol UP3 November–Desember dipertahankan dari sumber; data ULP bulan tersebut kosong ditampilkan —.</p><label>Indikator grafik<select data-asset-metric>'+fields.map((f,i)=>'<option value="'+f+'" '+(f===assetMetric?'selected':'')+'>'+ehtml(assetLabels[i])+'</option>').join('')+'</select></label><div class="detail-grid"><section><h3>Tren bulanan · '+ehtml(label)+'</h3><div class="legend"><span><i></i>Jumlah aset</span></div><div class="scroll">'+chart(points,['','Jumlah aset'])+'</div></section>'+metricBars('Perbandingan ULP · '+ehtml(label),compare.filter(([,v])=>v[0]!=null),[['Jumlah','#007b71']])+'</div><h3>Rincian per ULP</h3>'+detailTable(['Unit',...assetLabels],dataset.units.slice(1).map(u=>[u,...fields.map(f=>fmt(assetValues(u,month())[f]))]))+'<h3>Riwayat bulanan · '+ehtml(unit())+'</h3>'+detailTable(['Bulan',...assetLabels],months.map((m,i)=>[m,...fields.map(f=>fmt(assetValues(unit(),i+1)[f]))]));
}
$('detailBody').addEventListener('change',e=>{if(e.target.dataset.assetMetric!==undefined){assetMetric=e.target.value;renderDetail()}});
function decodeAsset(rows){
 const clean=rows.filter(r=>r.some(v=>String(v??'').trim()));const h=Array.from(clean.shift()||[],v=>String(v??'').trim().toLowerCase());
 const aliases={gd_unit:['gd_unit','gd'],lbs_motorize:['lbs_motorize','lbs']};const fields=detailKinds.asset.fields;const index=f=>(aliases[f]||[f]).map(k=>h.indexOf(k)).find(i=>i>=0)??-1;
 if(fields.filter(f=>f!=='lbs_manual').some(f=>index(f)<0))throw Error('Kolom tidak sesuai template Aset.');const out={};
 for(const [i,row] of clean.entries()){
 const val=f=>String(row[index(f)]??'').trim(),periode=val('periode'),u=val('unit').toUpperCase();if(!/^2026-(0[1-9]|1[0-2])$/.test(periode)||!dataset.units.includes(u))throw Error('Baris '+(i+2)+': periode/unit tidak valid.');
 const r={periode,unit:u};for(const f of fields.slice(2)){const v=val(f);if(!v){r[f]=null;continue}if(!/^\d+(?:[.,]\d+)?$/.test(v))throw Error('Baris '+(i+2)+': angka '+f+' tidak valid.');const n=Number(v.replace(',','.'));if(!['jtm_kms','jtr_kms'].includes(f)&&!Number.isInteger(n))throw Error(f+' harus bilangan bulat.');r[f]=n}
 const key=periode+'|'+u;if(out[key])throw Error('Periode/unit duplikat: '+key);out[key]=r;
 }
 if(!Object.keys(out).length)throw Error('Tidak ada data aset.');return out;
}

function decodeTrafo(rows){
 const filled=rows.filter(r=>r.some(v=>String(v??'').trim())),header=Array.from(filled.shift()||[],v=>String(v??'').trim().toLowerCase());
 const names=detailKinds.trafo.fields.map(v=>v.toLowerCase());if(names.some(n=>header.indexOf(n)<0))throw Error('Gunakan header pada template Gangguan Trafo.');
 const out={};
 for(const [i,row] of filled.entries()){
  const val=n=>String(row[header.indexOf(n.toLowerCase())]??'').trim();let date=val('BLTH');const dm=date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(dm)date=dm[3]+'-'+dm[2].padStart(2,'0')+'-'+dm[1].padStart(2,'0');
  else if(/^\d+(?:\.\d+)?$/.test(date)&&Number(date)>40000&&Number(date)<70000)date=new Date(Date.UTC(1899,11,30)+Math.floor(Number(date))*86400000).toISOString().slice(0,10);
  const dt=new Date(date+'T00:00:00Z'),y=Number(val('Tahun')),unitName='ULP '+val('ULP').toUpperCase().replace(/^ULP\s+/,''),gardu=val('Gardu Rusak');
  if(!/^202[56]-\d{2}-\d{2}$/.test(date)||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==date||Number(date.slice(0,4))!==y||!dataset.units.includes(unitName)||!gardu)throw Error('Baris '+(i+2)+': periksa tanggal, tahun, ULP, dan gardu.');
  const cap=val('Kapasitas (KVA)');if(cap&&(!/^\d+(?:[.,]\d+)?$/.test(cap)||Number(cap.replace(',','.'))<=0))throw Error('Baris '+(i+2)+': kapasitas kVA tidak valid.');
  const r={tanggal:date,periode:date.slice(0,7),unit:unitName,gardu,kapasitas_kva:cap?Number(cap.replace(',','.')):null,merek:val('Merk'),penyebab:val('Penyebab'),tahun:y};
  const key=date+'|'+unitName+'|'+gardu.toUpperCase();if(out[key])throw Error('Kejadian duplikat: '+gardu+' '+date);out[key]=r;
 }
 if(!Object.keys(out).length)throw Error('Tidak ada data Gangguan Trafo.');return out;
}
function trafoAll(){return Object.values(detailOverrides.trafo)}
function trafoLimit(){return Math.min(...[2025,2026].map(y=>Math.max(0,...trafoAll().filter(r=>r.tahun===y).map(r=>Number(r.tanggal.slice(5,7))))))}
function trafoScope(){return trafoAll().filter(r=>(unit()===dataset.units[0]||r.unit===unit())&&(trafoYear==='all'||String(r.tahun)===trafoYear)&&(trafoMonth==='all'||Number(r.tanggal.slice(5,7))===Number(trafoMonth))&&(!trafoBrand||(trafoBrand==='__missing'?(!r.merek||r.merek==='-'):r.merek===trafoBrand))&&(!trafoCapacity||String(r.kapasitas_kva??'unknown')===trafoCapacity)&&(trafoCompare!=='matched'||Number(r.tanggal.slice(5,7))<=trafoLimit()))}
function trafoExportRow(r){return [r.tanggal.split('-').reverse().join('/'),r.gardu,r.unit.slice(4),r.kapasitas_kva??'',r.merek,r.penyebab,r.tahun]}
function trafoCauses(text){const items=String(text||'').split(/\r?\n/).map(v=>v.replace(/^\s*\d+[.,]\s*/,'').trim()).filter(Boolean);return items.length?items:['Belum diisi']}
function trafoGroupChart(title,rows,key,multi=false){const map=new Map();for(const r of rows)for(const label of (multi?key(r):[key(r)])){const values=map.get(label)||[0,0];values[r.tahun===2025?0:1]++;map.set(label,values)}return metricBars(title,[...map].sort((a,b)=>b[1].reduce((s,v)=>s+v,0)-a[1].reduce((s,v)=>s+v,0)),[['2025','#527795'],['2026','#007b71']])}
function renderTrafo(){
 const rows=trafoScope(),all=trafoAll(),picker=(key,title,opts,val)=>'<label>'+title+'<select data-trafo-filter="'+key+'">'+opts.map(([v,t])=>'<option value="'+ehtml(v)+'" '+(val===String(v)?'selected':'')+'>'+ehtml(t)+'</option>').join('')+'</select></label>';
 const maxMonth=y=>Math.max(0,...all.filter(r=>r.tahun===y).map(r=>Number(r.tanggal.slice(5,7))));
 const points=months.map((label,i)=>({label,short:label.slice(0,3),values:[2025,2026].map(y=>{if((trafoYear!=='all'&&Number(trafoYear)!==y)||(trafoMonth!=='all'&&Number(trafoMonth)!==i+1)||i+1>maxMonth(y)||(trafoCompare==='matched'&&i+1>trafoLimit()))return null;return rows.filter(r=>r.tahun===y&&Number(r.tanggal.slice(5,7))===i+1).length})}));
 const last=y=>all.filter(r=>r.tahun===y).map(r=>r.tanggal).sort().at(-1)||'—';
 return '<h2>Gangguan Trafo · '+ehtml(unit())+'</h2><div class="detail-filters">'+picker('year','Tahun',[['all','2025 & 2026'],['2025','2025'],['2026','2026']],trafoYear)+picker('month','Bulan',[['all','Semua bulan'],...months.map((m,i)=>[String(i+1),m])],trafoMonth)+picker('compare','Perbandingan',[['all','Seluruh register'],['matched','Bulan setara']],trafoCompare)+picker('brand','Merek',[['','Semua merek'],...[...new Set(all.map(r=>r.merek&&r.merek!=='-'?r.merek:'__missing'))].map(v=>[v,v==='__missing'?'Belum diisi':v])],trafoBrand)+picker('capacity','Kapasitas (kVA)',[['','Semua kapasitas'],...[...new Set(all.map(r=>String(r.kapasitas_kva??'unknown')))].sort((a,b)=>Number(a)-Number(b)).map(v=>[v,v==='unknown'?'Belum diisi':v])],trafoCapacity)+'</div><div class="stock-summary-cards">'+[2025,2026].map(y=>'<div class="panel"><span>'+y+'</span><h2>'+rows.filter(r=>r.tahun===y).length+' kejadian</h2></div>').join('')+'<div class="panel"><span>Jumlah register terfilter</span><h2>'+rows.length+'</h2></div><div class="panel"><span>Kapasitas / merek / penyebab belum lengkap</span><h2>'+rows.filter(r=>r.kapasitas_kva==null||!r.merek||r.merek==='-'||!r.penyebab).length+'</h2></div></div><p class="muted">Batas kejadian dalam sumber: 2025 '+last(2025)+'; 2026 '+last(2026)+'. Bulan setelah batas register ditampilkan —, bukan nol. Bulan setara membatasi kedua tahun hingga '+months[Math.max(0,trafoLimit()-1)]+'. Jumlah berdasarkan kejadian, bukan penjumlahan kapasitas. Filter bulan/tahun di menu ini terpisah dari periode KPI utama.</p><h3>Perbandingan bulanan 2025–2026</h3><div class="legend"><span><i></i>2026</span><span><i></i>2025</span></div><div class="detail-chart scroll">'+chart(points,['2025','2026'],true)+'</div><div class="detail-grid">'+trafoGroupChart('Gangguan per ULP',rows,r=>r.unit)+trafoGroupChart('Gangguan menurut kapasitas (kVA)',rows,r=>r.kapasitas_kva==null?'Belum diisi':fmt(r.kapasitas_kva)+' kVA')+trafoGroupChart('Gangguan menurut merek',rows,r=>r.merek&&r.merek!=='-'?r.merek:'Belum diisi')+trafoGroupChart('Rekap kategori penyebab',rows,r=>trafoCauseCategories(r.penyebab),true)+'</div>'+trafoCausePies(rows)+'<p class="muted">Satu kejadian dihitung sekali pada setiap kategori yang terkait. Satu kejadian bisa memiliki beberapa kategori; persentase pie dihitung dari jumlah kontribusi kategori, bukan jumlah kejadian. Teks asli tetap pada register.</p><details><summary>Dasar pengelompokan penyebab</summary><p>Minyak/kebocoran: minyak, oli, rembes, packing. Beban/ketidakseimbangan: overload, underload, beban, unbalance. Isolasi/komponen: isolasi, insulasi, bushing, baut, short, belitan, mengembung. Pembumian/proteksi: grounding, pembumian, netral, LA. Umur/kondisi: umur, usia, trafo bekas. Petir/eksternal: petir, sambaran, mobilisasi, reposisi, safety. Teks tanpa kata kunci atau kosong masuk Lainnya / belum diisi. Penamaan mengikuti kata kunci pada sumber, bukan penetapan akar masalah baru.</p></details><h3>Register gangguan trafo</h3>'+detailTable(detailKinds.trafo.fields,[...rows].sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map(r=>trafoExportRow(r).map(v=>v===''?'—':v)));
}
$('detailBody').addEventListener('change',e=>{const k=e.target.dataset.trafoFilter;if(!k)return;const v=e.target.value;if(k==='year')trafoYear=v;if(k==='month')trafoMonth=v;if(k==='brand')trafoBrand=v;if(k==='capacity')trafoCapacity=v;if(k==='compare')trafoCompare=v;renderDetail()});

function trafoCategoryNames(){return ['Minyak / kebocoran','Beban / ketidakseimbangan','Isolasi / komponen','Pembumian / proteksi','Umur / kondisi','Petir / eksternal','Lainnya / belum diisi']}
function trafoCauseCategories(text){
 const labels=trafoCategoryNames(),found=new Set();
 for(const item of trafoCauses(text)){
  const v=item.toLowerCase();let matched=false;
  const rules=[/minyak|\boli\b|rembes|packing/,/over\s*load|under\s*load|beban|unbalance|tidak seimbang/,/isolasi|insulasi|bushing|baut|short|belitan|mengembung/,/grounding|pembumian|netral|\bla\b/,/umur|usia|trafo(?: merupakan)? (?:trafo )?bekas/,/petir|sambar|mobilisasi|reposisi|safety/];
  rules.forEach((rx,i)=>{if(rx.test(v)){found.add(labels[i]);matched=true}});if(!matched)found.add(labels[6]);
 }
 return [...found];
}
function trafoCausePies(rows){
 const labels=trafoCategoryNames(),colors=['#007b71','#527795','#d99c23','#8956a6','#c56344','#399eb5','#8795a1'];
 const pie=year=>{
  const counts=labels.map(label=>rows.filter(r=>r.tahun===year&&trafoCauseCategories(r.penyebab).includes(label)).length),total=counts.reduce((a,b)=>a+b,0);
  if(!total)return '<section class="panel"><h3>Komposisi penyebab '+year+'</h3><p class="empty">Belum ada data pada pilihan ini.</p></section>';
  let angle=-Math.PI/2,svg='<svg viewBox="0 0 240 240" role="img" aria-label="Diagram pie kategori penyebab '+year+'" style="min-width:0;max-width:260px;margin:auto">';
  counts.forEach((n,i)=>{if(!n)return;const end=angle+n/total*Math.PI*2,title='<title>'+ehtml(labels[i])+': '+n+' ('+fmt(n/total*100)+'%)</title>';if(n===total)svg+='<circle cx="120" cy="120" r="105" fill="'+colors[i]+'">'+title+'</circle>';else svg+='<path d="M120 120 L'+(120+105*Math.cos(angle))+' '+(120+105*Math.sin(angle))+' A105 105 0 '+(end-angle>Math.PI?1:0)+' 1 '+(120+105*Math.cos(end))+' '+(120+105*Math.sin(end))+' Z" fill="'+colors[i]+'" stroke="white" stroke-width="2">'+title+'</path>';angle=end});svg+='</svg>';
  return '<section class="panel"><h3>Komposisi penyebab '+year+'</h3>'+svg+'<p class="muted">'+rows.filter(r=>r.tahun===year).length+' kejadian · '+total+' kontribusi kategori</p><ul class="trafo-pie-legend">'+labels.flatMap((label,i)=>counts[i]?['<li><span style="background:'+colors[i]+'" aria-hidden="true"></span>'+ehtml(label)+' <b>'+counts[i]+' · '+fmt(counts[i]/total*100)+'%</b></li>']:[]).join('')+'</ul></section>';
 };
 return '<h3>Diagram pie kategori penyebab</h3><div class="detail-grid">'+pie(2025)+pie(2026)+'</div>';
}

// Preferensi ini terpisah dari minimize sidebar utama.
try{if(localStorage.getItem('up3-dashboard-actions-collapsed')==='1')$('dashboardActions').open=false}catch{}
$('dashboardActions').addEventListener('toggle',()=>{try{localStorage.setItem('up3-dashboard-actions-collapsed',$('dashboardActions').open?'0':'1')}catch{}});
