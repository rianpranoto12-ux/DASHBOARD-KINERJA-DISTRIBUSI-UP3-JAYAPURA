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
 if(page==='ulp'){renderUlp();return}
 if(page==='detail'){renderDetail();return}
 $('groups').innerHTML=dataset.groups.map(([name],i)=>'<button data-group="'+i+'" aria-pressed="'+(i===group)+'">'+name+'</button>').join('');
 $('kpis').innerHTML=items.map(([k,name,satuan])=>{
  const [t,a]=values(unit(),month(),k);
  return '<tr><td><button data-kpi="'+k+'" aria-pressed="'+(k===selected)+'">'+name+'<small>'+satuan+'</small></button></td><td>'+targetText(k,t)+'</td><td><strong>'+fmt(a)+'</strong></td>'+achievementCell(k,t,a)+'</tr>';
 }).join('');
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
const detailKinds={
 asset:{label:'Data aset',sheet:'Aset',fields:['periode','unit','penyulang','jtm_kms','jtr_kms','gd','recloser','lbs','lbs_threeway']},
 performance:{label:'Grafik per ULP',sheet:'Kinerja',fields:columns},
 fault:{label:'Detail gangguan',sheet:'Gangguan',fields:['periode','unit','id','aset','nama_aset','rating','merek','jenis_gangguan','kode_penyebab','penyebab','jumlah']},
 cause:{label:'Penyebab SAIDI, SAIFI & ENS',sheet:'Penyebab',fields:['periode','unit','id','indikator','kategori_pemadaman','sumber_eksternal','kelompok_penyebab','kode_penyebab','penyebab','kontribusi']},
 map:{label:'Peta ULP'}
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
let detailOverrides={asset:{},fault:{},cause:{}};
try{
 const saved=JSON.parse(localStorage.getItem(detailStorage)||'{}');
 for(const k of Object.keys(detailOverrides))if(saved[k]&&typeof saved[k]==='object'&&!Array.isArray(saved[k]))detailOverrides[k]=saved[k];
}catch{}
let detailTab='asset';
const periodText=()=> '2026-'+String(month()).padStart(2,'0');
const ehtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const detailRows=kind=>Object.values(detailOverrides[kind]).filter(r=>r.periode===periodText()&&r.unit===unit());
function decodeDetail(rows,kind){
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
const assetLabels=['Penyulang (unit)','Panjang JTM (kms)','Panjang JTR (kms)','GD (unit)','Recloser (unit)','LBS (unit)','LBS Threeway (unit)'];
const detailFilters={kpi:'rating',asset:'',kind:'',brand:'',rating:'',metric:'SAIDI',outage:'',causeGroup:''};
const selectDetail=(key,label,options,blank)=>'<label>'+label+'<select data-detail-filter="'+key+'">'+(blank?option('',blank):'')+options.map(([v,t])=>'<option value="'+v+'" '+(detailFilters[key]===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
const choices=values=>values.map(v=>[v,v]);
function renderDetail(){
 $('detailTabs').innerHTML=Object.entries(detailKinds).map(([k,v])=>'<button data-detail-tab="'+k+'" aria-pressed="'+(k===detailTab)+'">'+v.label+'</button>').join('');
 const body=$('detailBody');
 if(detailTab==='asset'){
  body.innerHTML='<h2>Data aset · '+unit()+'</h2>'+detailTable(['Aset','Jumlah / panjang'],detailKinds.asset.fields.slice(2).map((f,i)=>[assetLabels[i],fmt(assetValues(unit(),month())[f])]));
  return;
 }
 if(detailTab==='performance'){
  const k=detailFilters.kpi, metaRow=meta.get(k);
  const points=dataset.units.slice(1).map(u=>({label:u,short:u.slice(4),values:values(u,month(),k)}));
  body.innerHTML='<div class="detail-filters">'+selectDetail('kpi','Indikator',Array.from(meta.values(),r=>[r[0],r[1]]))+'</div><p class="muted">'+ehtml(metaRow[2])+' · Hijau kebiruan: realisasi · Biru: target</p><div class="detail-chart scroll">'+chart(points)+'</div><div class="scroll"><table><thead><tr><th>ULP</th><th>Target</th><th>Realisasi</th><th>Pencapaian</th></tr></thead><tbody>'+points.map(p=>'<tr><td>'+p.label+'</td><td>'+fmt(p.values[0])+'</td><td>'+fmt(p.values[1])+'</td>'+achievementCell(k,...p.values)+'</tr>').join('')+'</tbody></table></div>';
  return;
 }
 if(detailTab==='map'){body.innerHTML=renderDetailMap();return}
 const f=detailFilters;
 if(detailTab==='fault'){
  const rows=detailRows('fault').filter(r=>(!f.asset||r.aset===f.asset)&&(!f.kind||r.jenis_gangguan===f.kind)&&r.merek.toLowerCase().includes(f.brand.toLowerCase())&&r.rating.toLowerCase().includes(f.rating.toLowerCase()));
  body.innerHTML='<div class="detail-filters">'+selectDetail('asset','Aset',choices(assets),'Semua aset')+selectDetail('kind','Sifat gangguan',choices(['Temporary','Permanent']),'Semua sifat')+'<label>Merek<input data-detail-filter="brand" value="'+ehtml(f.brand)+'"></label><label>Rating teknis<input data-detail-filter="rating" value="'+ehtml(f.rating)+'"></label></div><div class="detail-grid">'+
   detailTotals(rows,r=>[r.merek,r.rating].filter(Boolean).join(' / '),'jumlah','Jumlah gangguan menurut merek dan rating')+
   detailTotals(rows,r=>r.jenis_gangguan,'jumlah','Jumlah menurut sifat gangguan')+
   detailTotals(rows,r=>r.kode_penyebab?r.kode_penyebab+' · '+faultCodes[r.kode_penyebab]:r.penyebab,'jumlah','Jumlah menurut penyebab')+'</div>'+
   detailTable(['ID','Aset','Nama aset','Rating','Merek','Sifat','Kode','Penyebab','Jumlah'],rows.map(r=>[r.id,r.aset,r.nama_aset,r.rating,r.merek,r.jenis_gangguan,r.kode_penyebab,r.penyebab,fmt(r.jumlah)]));
  return;
 }
 const rows=detailRows('cause').filter(r=>r.indikator===f.metric&&(!f.outage||r.kategori_pemadaman===f.outage)&&(!f.causeGroup||r.kelompok_penyebab===f.causeGroup));
 const [,actual]=values(unit(),month(),f.metric.toLowerCase());
 const total=rows.reduce((sum,r)=>sum+r.kontribusi,0);
 body.innerHTML='<div class="detail-filters">'+selectDetail('metric','Indikator',choices(['SAIDI','SAIFI','ENS']))+selectDetail('outage','Kategori pemadaman',choices(outages),'Semua kategori')+selectDetail('causeGroup','Kelompok penyebab',choices(['Internal','Eksternal']),'Semua kelompok')+'</div><p class="muted">Kontribusi rincian terfilter '+(rows.length?fmt(total):'—')+' · Realisasi KPI '+fmt(actual)+' · '+meta.get(f.metric.toLowerCase())[2]+'. Kedua kategori merangkum kontribusi yang sama.</p><div class="detail-grid">'+
 detailTotals(rows,r=>[r.kategori_pemadaman,r.sumber_eksternal].filter(Boolean).join(' · '),'kontribusi','Kategori pemadaman')+
 detailTotals(rows,r=>r.kelompok_penyebab,'kontribusi','Kelompok penyebab')+
 detailTotals(rows,r=>r.kode_penyebab?r.kode_penyebab+' · '+faultCodes[r.kode_penyebab]:r.penyebab,'kontribusi','Rincian penyebab')+'</div>'+
 detailTable(['ID','Pemadaman','Sumber eksternal','Kelompok','Kode','Penyebab','Kontribusi'],rows.map(r=>[r.id,r.kategori_pemadaman,r.sumber_eksternal,r.kelompok_penyebab,r.kode_penyebab,r.penyebab,fmt(r.kontribusi)]));
}
function assetValues(u,m){
 const k='2026-'+String(m).padStart(2,'0')+'|'+u;
 return {...assetBase[k],...detailOverrides.asset[k]};
}
const places=[
 [-2.5333,140.7,35,-26],[-2.5964,140.6324,50,20],[-2.5684,140.5052,-48,24],
 [-2.9028,140.7657,12,23],[-2.5791,140.1495,-20,23],[-1.8547,138.7493,0,-21]
];
function renderDetailMap(){
 const world=256*2**9;
 const xy=(lat,lon)=>[(lon+180)/360*world,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*world];
 const center=xy(-2.36,139.77),left=center[0]-450,top=center[1]-200;
 let tiles='',lines='';
 for(let x=Math.floor(left/256);x<=Math.floor((left+899)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+399)/256);y++){
  tiles+='<img alt="" loading="lazy" src="https://tile.openstreetmap.org/9/'+x+'/'+y+'.png" style="left:'+((x*256-left)/9)+'%;top:'+((y*256-top)/4)+'%">';
 }
 const k=detailFilters.kpi;
 const pins=places.map(([lat,lon,dx,dy],i)=>{
  const [px,py]=xy(lat,lon),x=px-left,y=py-top,u=dataset.units[i+1],pair=values(u,month(),k);
  lines+='<line x1="'+x+'" y1="'+y+'" x2="'+(x+dx)+'" y2="'+(y+dy)+'"/><circle cx="'+x+'" cy="'+y+'" r="5"/>';
  return '<button class="map-pin" data-map-unit="'+(i+1)+'" style="left:'+((x+dx)/9)+'%;top:'+((y+dy)/4)+'%">'+icon(...status(k,...pair))+' '+u.slice(4)+' · '+fmt(pair[1])+'</button>';
 }).join('');
 return '<div class="detail-filters">'+selectDetail('kpi','Indikator',Array.from(meta.values(),r=>[r[0],r[1]]))+'</div><p class="muted">Penanda menunjukkan pusat lokalitas. Klik ULP untuk melihat kinerjanya. Peta dasar memerlukan internet.</p><div class="scroll"><div class="map-frame">'+tiles+'<svg viewBox="0 0 900 400" aria-hidden="true">'+lines+'</svg>'+pins+'</div></div><p class="muted"><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></p>';
}
$('detailTabs').onclick=e=>{
 const b=e.target.closest('[data-detail-tab]');if(!b)return;
 detailTab=b.dataset.detailTab;renderDetail();
 $('detailTabs').querySelector('[aria-pressed=true]')?.focus();
};
$('detailBody').onchange=e=>{
 const k=e.target.dataset.detailFilter;if(!k)return;
 detailFilters[k]=e.target.value;renderDetail();
 $('detailBody').querySelector('[data-detail-filter="'+k+'"]')?.focus();
};
$('detailBody').onclick=e=>{
 const b=e.target.closest('[data-map-unit]');if(!b)return;
 $('unit').value=dataset.units[Number(b.dataset.mapUnit)];
 changePage('ulp');
};
function csvDownload(rows,name){
 const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=name;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadDetail(kind,blank){
 const schema=detailKinds[kind];
 let rows=[];
 if(kind==='asset'){
  for(const u of dataset.units)for(let m=1;m<=12;m++){
   const row=blank?{}:assetValues(u,m);
   rows.push(['2026-'+String(m).padStart(2,'0'),u,...schema.fields.slice(2).map(f=>row[f])]);
  }
 }else if(!blank)rows=Object.values(detailOverrides[kind]).map(row=>schema.fields.map(f=>row[f]));
 else rows=[['2026-10','UP3 JAYAPURA']];
 csvDownload([schema.fields,...rows],(blank?'Template_':'Ekspor_')+schema.sheet+'_UP3_Jayapura_2026.csv');
}
$('detailExport').onclick=()=>{
 if(detailTab==='performance'||detailTab==='map')downloadTable(false);
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
async function xlsxRows(buffer,kind){
 const read=workbookReader(buffer);
 const sheets=tags(parseXml(await read('xl/workbook.xml')),'sheet');
 const preferred=kind==='performance'?['kinerja','data']:[detailKinds[kind].sheet.toLowerCase()];
 const sheet=sheets.find(s=>preferred.includes(s.getAttribute('name').toLowerCase()))??sheets[0];
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
  if(kind!=='performance'){
   const changes=decodeDetail(rows,kind),keys=Object.keys(changes);
   if(keys.some(k=>Object.hasOwn(detailOverrides[kind],k)||(kind==='asset'&&Object.hasOwn(assetBase,k)))&&!confirm('Perbarui entri yang sudah ada?')){feedback.textContent='Impor dibatalkan.';return}
   const updated={...detailOverrides[kind]};
   for(const key of keys)updated[key]={...updated[key],...changes[key]};
   const next={...detailOverrides,[kind]:updated};
   localStorage.setItem(detailStorage,JSON.stringify(next));
   detailOverrides=next;
   const first=changes[keys[0]];
   detailTab=kind;changePage('detail');
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
  if(nextGroup<0){detailFilters.kpi=k;detailTab='performance';changePage('detail')}else{group=nextGroup;selected=k;}
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

render();
