DASHBOARD KINERJA DISTRIBUSI UP3 JAYAPURA 2026

Buka index.html di browser atau unggah sebagai halaman awal hosting statis.
CSS, JavaScript, dan data sudah tertanam. Folder assets berisi sumbernya.
Perubahan pada sumber perlu diterapkan juga ke blok terkait di index.html.

Pilih unit, bulan, kelompok, dan indikator. Grafik tersedia dalam bentuk
garis, batang, dan titik. Gunakan Perbandingan ULP untuk membandingkan enam
ULP pada periode terpilih. Cetak / PDF mencetak tampilan yang sedang dipilih.

Sumber: Realisasi Dashboard Kinerja Distribusi UP3 Jayapura.xlsx.
- RAW DATA: target dan realisasi KPI sesuai periode.
- 1. PENJUALAN TENAGA LISTRIK: kolom C dan G untuk penjualan total kumulatif.
- 7. KEANDALAN JTM: kolom I dan H untuk gangguan trafo dan kubikel bulanan.
- Realisasi Januari–Oktober 2026. Nilai formula setelah Oktober, termasuk
  angka berulang, nol pengganti, dan error, tidak digunakan sebagai realisasi.
- Target RKAP 95–100% berlaku pada UP3. MVOD dan MTTR menggunakan persen
  sesuai satuan kontrak kinerja.
- Switching, penyerapan investasi, dan penyerapan operasi tetap dapat
  dilihat sebagai indikator dengan status Belum ada data.

IMPOR, EKSPOR, DAN PENCAPAIAN
- Klik Impor data untuk mengunggah XLSX/CSV atau memasukkan tautan Google
  Sheets, CSV, atau XLSX yang dapat diakses browser. Jika akses tautan
  dibatasi, unduh spreadsheet dan unggah filenya.
- Gunakan Template_Impor_UP3_Jayapura_2026.csv. Untuk Excel, buka template,
  isi target/realisasi, simpan sebagai .xlsx dan gunakan tab Data atau
  lembar pertama. Pertahankan periode YYYY-MM sebagai teks.
- Kolom indikator, satuan, pencapaian_%, dan status bersifat informatif.
  Dashboard menghitung pencapaian dan status dari target dan realisasi.
  Sel angka kosong mempertahankan angka sebelumnya. Nilai nol diisi 0.
- Data impor tersimpan di browser. Ekspor CSV mengunduh seluruh unit,
  periode, dan indikator, termasuk perubahan lokal.
- Pencapaian mengikuti tab PENCAPAIAN KINERJA, termasuk polaritas,
  perlakuan nol, dan rumus Range untuk RKAP. Kolom Target menampilkan
  angka target periode. Baik >=100%, Hati-hati >=95% dan <100%,
  Masalah <95%. Data atau target kosong tidak dinilai.

TAMPILAN KINERJA PER ULP
- Buka menu Kinerja per ULP, pilih satu dari enam ULP dan periode. Tabel
  menampilkan seluruh 18 indikator. Klik nama indikator untuk membuka tren.
- Ikon hijau berarti Baik, kuning Hati-hati, merah Masalah, dan abu-abu
  belum dinilai. Judul, filter dan menu tetap terlihat saat isi digulir.

Ikon status dan persentase ditampilkan berdampingan di kolom Pencapaian.

KINERJA DISTRIBUSI DETAIL
- Pilih Data aset, Grafik per ULP, Detail gangguan,
  atau Penyebab SAIDI/SAIFI/ENS. Pilih bulan dan unit pada filter utama.
- JTM, JTR, dan GD awal diambil dari Sheet5 pada workbook sumber. Nilai kosong
  berarti bulan atau aset tersebut belum memiliki isian yang bisa dipakai.
- Grafik per ULP menampilkan seluruh KPI, termasuk rating negatif, gangguan
  Recloser/LBS, WO selesai, dan SLA kualitas. Nilai KPI diisi lewat template
  Kinerja. Rincian gangguan adalah register terpisah dan tidak mengisi KPI
  otomatis. Samakan basis periode sebelum merekonsiliasi jumlah.
- Peta memerlukan koneksi ke OpenStreetMap untuk peta dasar. Penanda adalah
  pusat lokalitas sebagai acuan. Buka Peta ULP dari menu utama. Kartu menampilkan penjualan, susut,
  SAIDI dan gangguan TM untuk setiap ULP pada bulan terpilih.

CARA MENGISI TEMPLATE
1. Di menu Impor data, pilih jenis data lalu Unduh template CSV. Semua
   template juga disertakan dalam ZIP. Buka CSV di Excel atau Google Sheets.
2. Periode ditulis sebagai teks YYYY-MM, tahun 2026. Isi nama unit sesuai
   pilihan dashboard. Angka memakai titik atau koma desimal tanpa pemisah
   ribuan. Masukkan 0 hanya jika data yang tercatat benar-benar nol.
3. Untuk aset, isi satu baris per periode dan unit. Kolom kosong
   mempertahankan nilai aset yang sudah ada.
4. Untuk gangguan, gunakan ID unik per periode dan unit. Kolom aset menerima
   Penyulang, Trafo, Kubikel, Recloser, LBS, atau LBS Threeway. Isi nama aset,
   penyebab, dan jumlah. Untuk Penyulang pilih Temporary atau Permanent.
   Isi merek dan rating teknis jika tersedia, misalnya 630 A atau 160 kVA.
5. Untuk penyebab, pilih SAIDI, SAIFI, atau ENS. Isi kontribusi dalam
   menit/pelanggan, kali/pelanggan, atau MWh, sesuai indikator. Pilih
   Terencana, Tidak terencana, Emergency, atau Eksternal. Untuk kategori
   pemadaman Eksternal isi sumber KIT, Transmisi, atau GI. Pilih kelompok
   penyebab Internal atau Eksternal secara terpisah.
6. Kode internal: I1 Komponen JTM, I2 Peralatan JTM, I3 Gardu, I4 Tiang.
   Kode eksternal: E1 Pohon, E2 Bencana Alam, E3 Hewan/Pihak ke-3,
   E4 Layangan/Benda Asing. Isian penyebab bebas bisa memuat material,
   petir, atau rincian lain sesuai kejadian.
7. Simpan sebagai CSV/XLSX, atau gunakan tautan spreadsheet yang bisa dibaca
   browser. Pilih jenis impor yang sama. Untuk XLSX, nama tab yang dibaca
   adalah Kinerja, Aset, Gangguan, atau Penyebab, dengan fallback lembar
   pertama. Impor dan ekspor dilakukan per jenis data.

PDKB DAN LOGISTIK
- PDKB menampilkan realisasi bulanan Regu 1 dan Regu 2. Isi pekerjaan_titik
  sebagai jumlah titik dan ens_diselamatkan_mwh dari laporan PDKB. Total
  tiap indikator muncul setelah kedua regu terisi. Gunakan tab PDKB.
- Stok menggunakan tab Stok dan satu baris per periode, unit, sumber,
  kategori dan kode material. Pilih MDU atau Non-MDU. Sumber yang diterima:
  UP3 Jayapura - Distribusi, UP3 Jayapura - Niaga, UP3 Wamena, UPPK Papua.
  Kolom unit mengikuti filter dashboard, sedangkan sumber menunjukkan
  asal material. Masukkan stok dalam satuan yang ditulis pada kolom satuan.
- Gunakan tab ITO untuk target dan realisasi perputaran material dalam kali,
  dengan satu baris per periode dan unit. Grafik menampilkan tren 12 bulan.
- Pilih jenis data di Impor data. Template CSV dapat dibuka di Excel.
  Gunakan nama tab di atas jika menyimpan sebagai XLSX. Ekspor data detail
  mengikuti tab yang sedang dibuka, termasuk pilihan Stok atau ITO.

MODE PAPARAN
- Klik Mode paparan. Panel atas otomatis diciutkan hingga hanya judul.
- Panah kiri/kanan atau usap mendatar pada area isi untuk pindah slide.
  Usap ke kiri untuk maju dan ke kanan untuk mundur. Area tabel dan peta
  yang perlu digulir mendatar tetap dapat digulir. Usap dari area isi lain
  untuk berpindah slide. Gulir vertikal untuk membaca data panjang.
- Klik judul atau tekan M untuk membuka menu dan filter. Ikon ⛶ mengaktifkan
  layar penuh bila didukung browser. Klik Keluar paparan atau tekan Esc
  di luar layar penuh untuk kembali ke tampilan biasa.
- Ikon − atau M juga bisa menciutkan panel pada tampilan biasa.

Panel kanan pada Ringkasan memiliki gulir vertikal tersendiri untuk grafik
dan tabel. Pada tampilan cetak, seluruh isi panel ditampilkan.

ZOOM AREA DATA
- Gunakan − / + di kanan atas untuk mengubah ukuran data dari 50% hingga
  150%. Klik angka persentase untuk kembali ke 100%.
- Zoom berlaku mulai dari baris filter dan menu utama hingga isi dashboard dan tersedia di Mode Paparan.

YANTEK OPTIMIZATION DAN CATATAN
- Buka Kinerja Distribusi Detail → Yantek Optimization untuk WO selesai
  dan SLA kualitas. Data masuk melalui Impor data → Kinerja dengan kode
  yantek_wo dan yantek_sla. Angka mengikuti data yang diimpor.
- Edit catatan untuk mengisi analisa, evaluasi, dan rencana mitigasi.
  Susun rekomendasi membuat draf lokal berbasis aturan dan data indikator.
  Catatan tersimpan di browser per unit, bulan, dan indikator.
- Mode Paparan menampilkan Danantara di kiri dan PLN di kanan.
  Sumber logo:
  https://commons.wikimedia.org/wiki/File:Danantara_Indonesia.svg
  https://commons.wikimedia.org/wiki/File:Logo_PLN.svg

YO HARIAN
- Pada tab Yantek Optimization, pilih Tren bulanan, Per ULP, atau Per petugas.
- Impor data → YO Harian menerima Template_YO_Harian.csv atau XLSX dengan
  tab YO_Harian. Isi periode YYYY-MM dan tanggal YYYY-MM-DD sebagai teks.
  Gunakan satu baris per tanggal, ULP, dan ID petugas. Baris dengan kombinasi
  yang sama memperbarui catatan tersebut setelah konfirmasi.
- Isi skor performa, produktivitas, dan hari kerja sesuai sumber. Rekap ULP
  menghitung rata-rata tiap skor dari nilai yang tersedia. PO dan WO adalah
  jumlah dari petugas yang tercatat. Angka kosong berarti belum dilaporkan.
- Per petugas mengikuti filter unit utama. Pilih UP3 untuk melihat petugas
  semua ULP. Tabel harian mengikuti filter tanggal dan petugas yang dipilih.
- Pada Per ULP / Per petugas, Ekspor data detail mengunduh data YO harian.
