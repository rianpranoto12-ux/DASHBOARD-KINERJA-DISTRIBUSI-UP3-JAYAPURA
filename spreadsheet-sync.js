/* Satu workbook Google Sheets; setiap jenis data memiliki sheet sendiri. */
const syncDefinitions=[
 ['performance','Kinerja','Kinerja utama, YO bulanan, anggaran'],['asset','Aset','Aset per UP3 / ULP'],['fault','Gangguan','Kubikel, recloser, LBS dan gangguan lain'],['trafo','Gangguan_Trafo','Register kerusakan trafo'],['cause','Penyebab','Rincian kontribusi SAIDI / SAIFI / ENS'],['history','Keandalan_Historis','Perbandingan keandalan 2024–2026'],['fglog','FGTM_Register','Register gangguan penyulang'],['fgmonthly','FGTM_Bulanan','Rekap bulanan 2025 / 2026'],['hi','HI_Penyulang','Health Index penyulang'],['yodaily','YO_Harian','Skor petugas, PO dan WO harian'],['pdkb','PDKB','Target dan realisasi PDKB'],['stock','Stok','Stok material per gudang / ULP'],['ito','ITO','Target, realisasi dan persentase ITO'],['notes','Catatan','Analisa, evaluasi dan rencana mitigasi']
];
const syncConfigKey='up3-spreadsheet-config-v1',syncHistoryKey='up3-reliability-history-v1',syncHiKey='up3-health-index-v1';
const syncHistoryFields=['periode','unit','basis','kode_penyebab','saidi','saifi','ens_mwh'];
const syncHiFields=['tahun','ulp','penyulang','jumlah_trip','tanggal_rekap'];
const syncNoteFields=['periode','unit','kode_indikator','analisa','evaluasi','mitigasi'];
let syncStaged=null,syncBusy=false;
function syncClone(v){return JSON.parse(JSON.stringify(v))}
function sheetDataUrl(value,sheet){
 const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||u.username||u.password)throw Error('Gunakan link Google Sheets https://docs.google.com/spreadsheets/d/ID/edit.');
 const id=u.pathname.match(/^\/spreadsheets\/d\/([\w-]+)(?:\/|$)/)?.[1];if(!id||id==='e')throw Error('Gunakan link workbook biasa /d/ID/edit, bukan link publikasi /d/e/.');
 if(!sheet.trim())throw Error('Nama sheet wajib diisi.');const out=new URL('https://docs.google.com/spreadsheets/d/'+id+'/gviz/tq');out.searchParams.set('tqx','out:csv');out.searchParams.set('headers','1');out.searchParams.set('sheet',sheet.trim());return out.href;
}
function syncReadTable(rows,fields){
 const nonempty=rows.filter(r=>r.some(v=>String(v??'').trim()));const h=Array.from(nonempty.shift()||[],v=>String(v??'').trim().toLowerCase());
 if(fields.some(f=>h.indexOf(f)<0||h.indexOf(f)!==h.lastIndexOf(f)))throw Error('Kolom wajib: '+fields.join(', '));
 return nonempty.map(r=>Object.fromEntries(fields.map(f=>[f,String(r[h.indexOf(f)]??'').trim()])));
}
function syncNumber(v){if(v==='')return null;if(!/^\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i.test(v))throw Error('Angka harus nonnegatif tanpa pemisah ribuan: '+v);const n=Number(v.replace(',','.'));if(!Number.isFinite(n))throw Error('Angka terlalu besar.');return n}
function syncDecodeHistory(rows){
 const out=[];const seen=new Set();for(const r of syncReadTable(rows,syncHistoryFields)){
 if(!/^202[456]-(0[1-9]|1[0-2])$/.test(r.periode)||!dataset.units.includes(r.unit.toUpperCase()))throw Error('Periode/unit keandalan tidak valid.');r.unit=r.unit.toUpperCase();const year=Number(r.periode.slice(0,4));
 if(r.basis!==((year===2026||r.kode_penyebab==='TOTAL')?'kumulatif':'bulanan'))throw Error('Basis 2024/2025 bulanan, 2026 kumulatif; TOTAL selalu kumulatif.');
 if(!/^(?:[0-9]|1[0-8]|TOTAL)$/.test(r.kode_penyebab))throw Error('kode_penyebab harus 0–18 atau TOTAL.');
 if(r.kode_penyebab==='TOTAL'&&(r.unit!==dataset.units[0]||year===2024))throw Error('TOTAL khusus UP3 2025 (ENS) / 2026.');
 const k=r.periode+'|'+r.unit+'|'+r.kode_penyebab;if(seen.has(k))throw Error('Duplikat keandalan: '+k);seen.add(k);out.push({...r,values:['saidi','saifi','ens_mwh'].map(f=>syncNumber(r[f]))});
 }return out;
}
function syncDecodeHi(rows){const out=[],seen=new Set();for(const r of syncReadTable(rows,syncHiFields)){
 const ulp=r.ulp.toUpperCase().replace(/^ULP\s+/,'');if(!['2025','2026'].includes(r.tahun)||!dataset.units.includes('ULP '+ulp)||!r.penyulang||r.penyulang.includes('|')||!/^\d+$/.test(r.jumlah_trip))throw Error('Periksa tahun, ULP, penyulang dan jumlah_trip HI.');
 const d=new Date(r.tanggal_rekap+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==r.tanggal_rekap||!r.tanggal_rekap.startsWith(r.tahun+'-'))throw Error('tanggal_rekap HI harus YYYY-MM-DD sesuai tahun.');
 const k=r.tahun+'|'+ulp+'|'+r.penyulang.toUpperCase();if(seen.has(k))throw Error('Penyulang HI duplikat.');seen.add(k);out.push({...r,ulp,penyulang:r.penyulang.toUpperCase(),jumlah_trip:Number(r.jumlah_trip)});
 }return out;}
function syncDecodeNotes(rows){const out={};for(const r of syncReadTable(rows,syncNoteFields)){
 if(!/^202[56]-(0[1-9]|1[0-2])$/.test(r.periode)||!dataset.units.includes(r.unit)||(!meta.has(r.kode_indikator)&&!['pdkb','ito'].includes(r.kode_indikator))||(r.periode.startsWith('2025')&&r.kode_indikator!=='pdkb'))throw Error('Periode, unit, atau kode catatan tidak valid.');
 const key=[r.unit,Number(r.periode.slice(5)),r.kode_indikator,...(r.periode.startsWith('2025')?['2025']:[])].join('|');if(out[key])throw Error('Catatan duplikat.');if([r.analisa,r.evaluasi,r.mitigasi].some(v=>v.length>3000))throw Error('Catatan maksimal 3000 karakter per kolom.');out[key]={analysis:r.analisa,evaluation:r.evaluasi,mitigation:r.mitigasi};
 }return out;}
function syncDecode(kind,rows){if(kind==='performance')return decodeRows(rows);if(['fglog','fgmonthly'].includes(kind))return fgDecode(rows,kind);if(kind==='hi')return syncDecodeHi(rows);if(kind==='history')return syncDecodeHistory(rows);if(kind==='notes')return syncDecodeNotes(rows);return decodeDetail(rows,kind)}
function syncHasData(rows){return rows.slice(1).some(r=>r.some(v=>String(v??'').trim()))}
function syncCount(kind,data){return kind==='fglog'?Object.values(data).reduce((n,r)=>n+r.length,0):Array.isArray(data)?data.length:Object.keys(data).length}
function syncSettings(){return {url:$('syncUrl').value.trim(),sheets:syncDefinitions.map(([kind,name])=>({kind,name:$('sync-name-'+kind).value.trim()||name,enabled:$('sync-use-'+kind).checked}))}}
function syncInvalidate(){syncStaged=null;$('syncApply').disabled=true}
function syncStatus(kind,msg){$('sync-status-'+kind).textContent=msg}
async function syncCheck(){
 if(syncBusy)return;syncInvalidate();syncBusy=true;$('syncCheck').disabled=true;const settings=syncSettings(),staged=[];let failed=0;
 try{
 sheetDataUrl(settings.url,'Kinerja');localStorage.setItem(syncConfigKey,JSON.stringify(settings));
 const choices=settings.sheets.filter(s=>s.enabled);if(!choices.length)throw Error('Pilih minimal satu sheet.');
 for(const s of settings.sheets)syncStatus(s.kind,s.enabled?'Menunggu':'Tidak dipilih');
 $('syncFeedback').textContent='Membaca dan memeriksa sheet…';
 // bounded concurrency, one URL per sheet, abort timeout for each request
 let cursor=0;async function worker(){while(cursor<choices.length){const s=choices[cursor++];syncStatus(s.kind,'Membaca…');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{
 const response=await fetch(sheetDataUrl(settings.url,s.name),{signal:controller.signal,credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const blob=await response.blob();if(blob.size>10*1024*1024)throw Error('Maksimal 10 MB per sheet.');const text=await blob.text();if(/^\s*</.test(text)||/google\.visualization\.Query\.setResponse/.test(text.trimStart().slice(0,100)))throw Error('Sheet tidak terbaca sebagai CSV. Periksa nama sheet dan akses pembaca.');const rows=csvRows(text);if(!syncHasData(rows)){syncStatus(s.kind,'Kosong — dilewati');continue}const parsed=syncDecode(s.kind,rows),count=syncCount(s.kind,parsed);staged.push({kind:s.kind,name:s.name,data:parsed,count});syncStatus(s.kind,count+' entri valid');
 }catch(e){failed++;syncStatus(s.kind,'Gagal: '+(e.name==='AbortError'?'waktu habis':e.message))}finally{clearTimeout(timer)}}}
 await Promise.all([worker(),worker(),worker()]);
 if(JSON.stringify(syncSettings())!==JSON.stringify(settings))throw Error('Pengaturan berubah saat pemeriksaan. Klik Periksa sheet kembali.');
 if(failed){$('syncFeedback').textContent=failed+' sheet gagal. Belum ada data dashboard yang diubah. Perbaiki atau nonaktifkan sheet tersebut lalu periksa kembali.';return}
 if(!staged.length){$('syncFeedback').textContent='Semua sheet kosong; tidak ada data yang diterapkan.';return}
 syncStaged=staged;$('syncApply').disabled=false;$('syncFeedback').textContent=staged.length+' sheet valid. Klik Terapkan data untuk memperbarui dashboard. Entri detail digabung menurut ID/periode; register FGTM mengganti seluruh tahun yang disertakan. Data yang tidak disertakan tetap tersimpan.';
 }catch(e){$('syncFeedback').textContent=e.message}finally{syncBusy=false;$('syncCheck').disabled=false}
}
function syncPrepare(staged){
 const next={kpi:{...overrides},detail:syncClone(detailOverrides),fg:syncClone(fgImported),history:syncClone(reliabilityHistory),hi:syncClone(hiWorkbook),hiDates:{...(globalThis.up3HiDates||{})},notes:syncClone(notes)};
 for(const {kind,data} of staged){if(kind==='performance')Object.assign(next.kpi,data);else if(kind==='fglog')Object.assign(next.fg.logs,data);else if(kind==='fgmonthly')Object.assign(next.fg.monthly,data);else if(kind==='notes')Object.assign(next.notes,data);else if(kind==='hi')for(const r of data){next.hi[r.tahun]??={};next.hi[r.tahun][r.ulp+'|'+r.penyulang]=r.jumlah_trip;next.hiDates[r.tahun]=r.tanggal_rekap}else if(kind==='history')for(const r of data){const y=Number(r.periode.slice(0,4)),m=Number(r.periode.slice(5));if(r.kode_penyebab==='TOTAL'){if(y===2026)next.history.totals26[m]=r.values;else next.history.ens25[m]=r.values[2];}else{next.history.data[r.unit]??={};next.history.data[r.unit][y]??={};next.history.data[r.unit][y][m]??={};next.history.data[r.unit][y][m][r.kode_penyebab]=r.values;}}else Object.assign(next.detail[kind],data)}return next;
}
function syncPersist(next){
 const writes=[[storageKey,next.kpi],[detailStorage,next.detail],[fgStorage,next.fg],[syncHistoryKey,next.history],[syncHiKey,{data:next.hi,dates:next.hiDates}],[noteStorage,next.notes]],old=writes.map(([k])=>[k,localStorage.getItem(k)]);try{for(const [k,v] of writes)localStorage.setItem(k,JSON.stringify(v))}catch(e){for(const [k,v] of old)try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{}throw Error('Penyimpanan browser gagal; perubahan dibatalkan.')}
 Object.assign(overrides,next.kpi);detailOverrides=next.detail;fgImported=next.fg;Object.assign(reliabilityHistory,next.history);for(const y of ['2025','2026'])hiWorkbook[y]=next.hi[y];globalThis.up3HiDates=next.hiDates;notes=next.notes;
}
$('syncOpen').onclick=()=>{$('importDialog').close();$('syncDialog').showModal()};
$('syncClose').onclick=()=>{if(!syncBusy)$('syncDialog').close()};
$('syncCheck').onclick=syncCheck;
$('syncApply').onclick=()=>{if(!syncStaged||syncBusy)return;try{syncPersist(syncPrepare(syncStaged));const n=syncStaged.length;syncInvalidate();render();$('syncFeedback').textContent=n+' sheet berhasil diterapkan · '+new Date().toLocaleString('id-ID',{timeZone:'Asia/Jayapura'})+' WIT. Tersimpan di browser ini.';$('notice').textContent='Data diperbarui dari satu spreadsheet ('+n+' sheet).'}catch(e){$('syncFeedback').textContent=e.message}};
$('syncDialog').addEventListener('cancel',e=>{if(syncBusy)e.preventDefault()});
$('syncDialog').addEventListener('change',syncInvalidate);
$('syncDialog').addEventListener('input',syncInvalidate);
(function initSpreadsheetSync(){
 $('syncSheetRows').innerHTML=syncDefinitions.map(([kind,name,label])=>'<tr><td><input id="sync-use-'+kind+'" type="checkbox" checked aria-label="Gunakan '+ehtml(name)+'"></td><td>'+ehtml(label)+'</td><td><input id="sync-name-'+kind+'" value="'+ehtml(name)+'" aria-label="Nama sheet '+ehtml(name)+'"></td><td id="sync-status-'+kind+'">Belum diperiksa</td></tr>').join('');
 try{const c=JSON.parse(localStorage.getItem(syncConfigKey)||'null');if(c){$('syncUrl').value=c.url||'';for(const s of c.sheets||[]){if($('sync-name-'+s.kind)){$('sync-name-'+s.kind).value=s.name;$('sync-use-'+s.kind).checked=!!s.enabled}}}const h=JSON.parse(localStorage.getItem(syncHistoryKey)||'null');if(h?.data&&h?.totals26&&h?.ens25)Object.assign(reliabilityHistory,h);const hi=JSON.parse(localStorage.getItem(syncHiKey)||'null');if(hi?.data){for(const y of ['2025','2026'])if(hi.data[y])hiWorkbook[y]=hi.data[y];globalThis.up3HiDates=hi.dates||{}}}catch{}
 render();
})();
