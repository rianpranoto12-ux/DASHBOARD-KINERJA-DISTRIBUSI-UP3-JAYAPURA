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
 rkap:'Rentang target sesuai kontrak 95–100%.',
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
const values=(u,m,k)=>dataset.records[u+'|'+m+'|'+k]??[null,null];
const targetText=(k,v)=>k==='rkap'&&v!=null?'95–100':fmt(v);
function status(k,t,a){
 if(a==null)return ['Belum ada data','muted'];
 if(t==null)return ['Target kosong','muted'];
 const polarity=meta.get(k)[3];
 const ok=polarity==='range'?a>=95&&a<=100:polarity==='up'?a>=t:a<=t;
 return ok?['Tercapai','good']:['Di luar target','bad'];
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
 if(selected==='rkap')markup+='<path d="M64 '+y(100)+'H584" stroke="#527795" stroke-dasharray="3 4"/>';
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
  return '<tr><td><button data-kpi="'+k+'" aria-pressed="'+(k===selected)+'">'+name+'<small>'+satuan+'</small></button></td><td>'+targetText(k,t)+'</td><td><strong>'+fmt(a)+'</strong></td><td class="'+cls+'">'+label+'</td></tr>';
 }).join('');
 const [,name,satuan]=meta.get(selected);
 $('title').textContent=name;
 $('basis').textContent=descriptions[selected]??'Satuan '+satuan+' · nilai periode sesuai rekap workbook.';
 for(const button of $('views').querySelectorAll('button'))button.setAttribute('aria-pressed',String(view===button.dataset.view));
 const points=view==='trend'?months.map((label,i)=>({label,short:label.slice(0,3),values:values(unit(),i+1,selected)})):
  dataset.units.slice(1).map(u=>({label:u,short:u.slice(4),values:values(u,month(),selected)}));
 $('axis').textContent=view==='trend'?'Bulan':'Unit';
 $('chart').innerHTML=chart(points);
 $('chartTable').innerHTML=points.map(p=>'<tr><td>'+p.label+'</td><td>'+targetText(selected,p.values[0])+'</td><td>'+fmt(p.values[1])+'</td></tr>').join('');
}
for(const id of ['unit','month','type'])$(id).onchange=render;
$('groups').onclick=e=>{const b=e.target.closest('[data-group]');if(b){group=Number(b.dataset.group);selected=dataset.groups[group][1][0][0];render();$('groups').querySelector('[aria-pressed=true]').focus()}};
$('kpis').onclick=e=>{const b=e.target.closest('[data-kpi]');if(b){selected=b.dataset.kpi;render();$('kpis').querySelector('[aria-pressed=true]').focus()}};
$('views').onclick=e=>{const b=e.target.closest('[data-view]');if(b){view=b.dataset.view;render()}};
$('print').onclick=()=>window.print();
render();
