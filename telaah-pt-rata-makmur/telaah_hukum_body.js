// ============================ TELAAH HUKUM CESSIE (v2) ============================
const TGL = "29 September 2026";
const H = (t) => new Paragraph({ children: runs(`**${t}**`), spacing: { ...LS, before: 240, after: 120 }, keepNext: true, keepLines: true,
  indent: { left: 453, hanging: 453 }, tabStops: [{ type: "left", position: 453 }] });
const Sub = (t) => new Paragraph({ children: runs(`**${t}**`), spacing: { ...LS, before: 120, after: 100 }, keepNext: true, keepLines: true,
  indent: { left: 453, hanging: 453 }, tabStops: [{ type: "left", position: 453 }] });
const isi = (t, after = 120, keepNext = false) => new Paragraph({ children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { ...LS, after }, indent: { left: 453, firstLine: 567 }, keepLines: true, keepNext });

// Tabel: sel teks rata kanan-kiri, angka rata kanan, header tengah
function tabel(header, rows, widths, aligns) {
  const A = { L: AlignmentType.LEFT, C: AlignmentType.CENTER, R: AlignmentType.RIGHT, J: AlignmentType.JUSTIFIED };
  const cell = (t, i, head, shade) => new TableCell({ borders: B, width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 100, right: 100 }, verticalAlign: head ? VerticalAlign.CENTER : VerticalAlign.TOP,
    shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "D9D9D9" } : (shade ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" } : undefined),
    children: [new Paragraph({ children: runs(t, { size: 20, bold: head || shade }), alignment: head ? AlignmentType.CENTER : A[aligns[i]], spacing: { line: 252, after: 0 } })] });
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, i, true)) }),
      ...rows.map(r => { const shade = !!r.bold; const cells = r.cells || r; return new TableRow({ cantSplit: true, children: cells.map((t, i) => cell(t, i, false, shade)) }); }),
    ] });
}
const TOT = (...cells) => ({ cells, bold: true });
const jeda = () => new Paragraph({ children: [], spacing: { after: 120 } });

function kv(rows) {
  const W = [1531, 236, 7314];
  const c = (t, i) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA }, children: [new Paragraph({ children: runs(t), alignment: i === 2 ? AlignmentType.JUSTIFIED : AlignmentType.LEFT, spacing: { after: 40 } })] });
  return new Table({ width: { size: 9081, type: WidthType.DXA }, columnWidths: W, borders: NOB,
    rows: rows.map(([a, b]) => new TableRow({ children: [c(a, 0), c(":", 1), c(b, 2)] })) });
}
function sign2(left, right) {
  const W = [4540, 4541];
  const col = (lines, i) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA },
    children: lines.map(t => plain(t, { align: AlignmentType.CENTER })) });
  return new Table({ width: { size: 9081, type: WidthType.DXA }, columnWidths: W, borders: NOB,
    rows: [new TableRow({ cantSplit: true, children: [col(left, 0), col(right, 1)] })] });
}

const doc_ = [
  ...kop(false),
  plain("**TELAAH HUKUM**", { align: AlignmentType.CENTER, run: { size: 24 } }),
  plain("**DAPAT DILAKSANAKANNYA CESSIE ATAS HAK KEPERDATAAN**", { align: AlignmentType.CENTER }),
  plain("**EKS HGU NOMOR 2/SEI TAMPA DALAM KEPAILITAN PT RATA MAKMUR**", { align: AlignmentType.CENTER, after: 200 }),
  kv([
    ["Kepada", "Yth. Kepala Balai Harta Peninggalan Medan"],
    ["Melalui", "Kepala Seksi Harta Peninggalan Wilayah II"],
    ["Dari", "Tim Kurator Kepailitan PT Rata Makmur (Dalam Pailit)"],
    ["Tanggal", TGL],
    ["Perkara", "Putusan Pengadilan Niaga pada Pengadilan Negeri Medan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn tanggal 10 April 2023"],
  ]),
  new Paragraph({ children: [], spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } }),

  H("I.\tLATAR BELAKANG"),
  isi("Sejak 2024 Kurator merencanakan lelang atas tanah eks HGU Nomor 2/Sei Tampa seluas ± 338 Ha sebagai satu-satunya aset PT Rata Makmur yang diketahui. Rencana itu tidak dapat diteruskan, karena HGU tersebut telah berakhir pada 31 Agustus 2013, hampir sepuluh tahun sebelum PT Rata Makmur dinyatakan pailit. Tanahnya sudah menjadi tanah negara dan tidak lagi termasuk harta pailit."),
  isi("Meskipun tanahnya tidak dapat dijual, di atas tanah itu masih ada kebun kelapa sawit yang berproduksi, bangunan, dan benda milik PT Rata Makmur. Hukum pertanahan nasional mengakui bahwa benda-benda itu tetap milik bekas pemegang hak, dan memberinya hak atas ganti rugi bila benda itu masih diperlukan oleh pihak yang akan mengusahakan tanah. Di sisi lain, sejak putusan pailit kebun terus dipanen pihak lain tanpa hasilnya diserahkan kepada Kurator."),
  isi("Telaah ini menguji apakah hak-hak yang tersisa itu dapat diuangkan melalui pengalihan hak tagih (cessie), dan apakah langkah itu memang yang terbaik bagi semua pihak."),

  H("II.\tPERTANYAAN HUKUM"),
  ...butirList([
    "Apakah hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) dapat dialihkan oleh Kurator melalui cessie secara sah?",
    "Apa manfaat langkah tersebut bagi para Kreditor, Debitor, dan Kurator, dan berapa perkiraan biaya serta hasilnya?",
    "Mengapa cessie dalam satu paket penjualan merupakan langkah yang paling mungkin dan paling masuk akal?",
  ]),

  H("III.\tJAWABAN SINGKAT"),
  ...butirList([
    "**Dapat.** Kedua hak tersebut adalah tagihan yang bernilai uang. Kurator berwenang mengalihkannya dengan izin Hakim Pengawas, melalui akta notaris, dan pengalihan itu mengikat pihak yang wajib membayar setelah diberitahukan kepadanya. Yurisprudensi Mahkamah Agung mendukung setiap unsurnya.",
    "**Semua pihak diuntungkan.** Kreditor memperoleh pembayaran dari hak yang selama ini tidak dapat dicairkan, utang Debitor berkurang dan Debitor terbebas dari kewajiban pembongkaran, dan Kurator memperoleh jalan pemberesan yang sah dan aman. Dengan biaya sekitar Rp65–228 juta, perkiraan hasilnya Rp0,9–12,3 miliar, dengan titik impas sekitar Rp1,47 miliar.",
    "**Paling masuk akal**, karena semua jalan lain terbentur hukum, waktu, atau biaya. Cessie kepada calon pemohon HGU baru mempertemukan hak ganti rugi dengan pihak yang kelak wajib membayarnya, sehingga nilainya dapat diuangkan sekarang.",
  ]),

  H("IV.\tFAKTA YANG RELEVAN"),
  tabel(["Tanggal", "Peristiwa"], [
    ["31 Agustus 2013", "HGU Nomor 2/Sei Tampa atas nama PT Rata Makmur berakhir tanpa perpanjangan maupun pembaruan."],
    ["9 Agustus 2022", "PT Rata Makmur dinyatakan dalam PKPU Sementara atas permohonan eks karyawan."],
    ["10 April 2023", "PT Rata Makmur dinyatakan pailit, dan Balai Harta Peninggalan Medan diangkat sebagai Kurator."],
    ["8 dan 22 Mei 2023", "Kurator memblokir bidang tanah di Kantor Pertanahan Kabupaten Langkat dan melakukan sita umum."],
    ["22 Juni 2023", "Daftar Piutang Tetap disahkan sebesar Rp1.432.871.696,00."],
    ["12 Agustus 2024", "Kantor Pertanahan Kabupaten Langkat menerangkan bahwa HGU telah berakhir pada 31 Agustus 2013."],
    ["22 Agustus 2024", "PT Raya Padang Langkat menyatakan minat membeli secara tertulis."],
    ["10 Desember 2025", "Dalam Rapat Kreditor, Debitor menyatakan tidak ada aset lain dan berjanji menyetor dana paling lambat 18 Desember 2025. Janji itu tidak dipenuhi."],
    ["14 September 2026", "Rapat dengan kuasa hukum Debitor. Tagihan KPP Pratama Binjai sebesar Rp1.108.581.903,00 masih belum dibayar, dan sisa tagihan eks karyawan paling sedikit Rp139.653.168,00."],
    ["Saat ini", "Kebun masih berproduksi dan dipanen pihak lain. Tim khusus Kanwil BPN Sumatera Utara menangani status eks HGU dengan berpedoman pada PP 18/2021 dan Permen ATR/BPN 18/2021."],
  ], [2000, 7081], ["L", "J"]),
  jeda(),

  H("V.\tDASAR HUKUM"),
  tabel(["Peraturan", "Pokok ketentuan yang dipakai"], [
    ["UU 5/1960 (UUPA), Pasal 5 dan 34", "Hukum tanah nasional bersumber pada hukum adat yang menganut asas pemisahan horizontal; HGU hapus karena jangka waktunya berakhir."],
    ["UU 37/2004 tentang Kepailitan dan PKPU", "Pasal 21 (cakupan harta pailit), Pasal 24 ayat (1) (Debitor kehilangan hak mengurus hartanya), Pasal 16 dan 69 (kewenangan Kurator), Pasal 15 ayat (3) (independensi), Pasal 72 (tanggung jawab Kurator), Pasal 77 (keberatan atas tindakan Kurator), Pasal 185 (cara penjualan harta pailit), dan Pasal 202 (berakhirnya kepailitan)."],
    ["PP 40/1996", "Pasal 17 (hapusnya HGU dan tanah menjadi tanah negara), Pasal 18 (kewajiban bekas pemegang hak dan hak atas ganti rugi), dan Pasal 4 ayat (4) (ganti kerugian dibebankan kepada pemegang HGU baru)."],
    ["PP 18/2021, Pasal 22", "Jangka waktu HGU; setelah berakhir, tanah kembali dikuasai negara, penataannya menjadi kewenangan Menteri, dan dapat diberikan prioritas kepada bekas pemegang hak dengan memperhatikan syarat-syarat tertentu."],
    ["Permen ATR/BPN 18/2021, Pasal 70–73 dan 79", "Menjadi pedoman surat terakhir Kantor Pertanahan Kabupaten Langkat dan Kanwil BPN Sumatera Utara."],
    ["KUHPerdata", "Pasal 511 (tagihan adalah benda bergerak), Pasal 613 (cara dan akibat cessie), Pasal 1334 ayat (1) (benda yang akan ada dapat menjadi pokok perjanjian), Pasal 1436 (percampuran utang), dan Pasal 1533–1535 (tanggung jawab penjual piutang)."],
  ], [2400, 6681], ["L", "J"]),
  jeda(),

  H("VI.\tANALISIS"),
  Sub("A.\tApa yang sebenarnya masih dimiliki harta pailit"),
  isi("Langkah pertama adalah memisahkan tanah dari benda di atasnya. Menurut Pasal 34 huruf a UUPA jo. Pasal 17 PP 40/1996, HGU hapus karena jangka waktunya berakhir dan tanahnya menjadi tanah negara. Pasal 22 ayat (2) PP 18/2021 menegaskan hal yang sama. Karena itu, pada 10 April 2023 tanah tersebut sudah bukan milik Debitor dan berada di luar harta pailit menurut Pasal 21 UU 37/2004. Sejalan dengan itu, Putusan MA Nomor 3350 K/Pdt/2020 menyatakan tanah eks HGU kembali kepada negara setelah jangka waktunya berakhir."),
  isi("Akan tetapi, hukum tanah nasional menganut asas pemisahan horizontal: bangunan dan tanaman bukan bagian dari tanah. Asas ini telah lama diterapkan Mahkamah Agung, antara lain dalam Putusan Nomor 123 K/Sip/1970, 286 K/Sip/1971, dan 3196 K/Pdt/1984, yang pada pokoknya menyatakan bahwa kepemilikan bangunan dapat berbeda dari kepemilikan tanah. Pasal 18 PP 40/1996 memberi bentuk konkret asas tersebut bagi HGU yang berakhir: bangunan, benda, dan tanaman yang masih diperlukan untuk melangsungkan pengusahaan tanah melahirkan hak atas ganti rugi bagi bekas pemegang hak. Pasal 4 ayat (4) peraturan yang sama membebankan ganti kerugian itu kepada pemegang HGU yang baru."),
  isi("Dengan demikian, yang masih dimiliki harta pailit adalah: (1) bangunan dan benda milik PT Rata Makmur; (2) hak atas ganti rugi atas bangunan, tanaman, dan benda tersebut; dan (3) hak menagih hasil kebun yang diterima sejak 10 April 2023, karena segala sesuatu yang diperoleh selama kepailitan termasuk harta pailit (Pasal 21) dan Debitor tidak lagi berwenang mengurusnya (Pasal 24 ayat (1))."),

  Sub("B.\tMengapa tanahnya tidak boleh dijual"),
  isi("Mahkamah Agung secara konsisten melarang Kurator membereskan benda yang bukan milik Debitor. Dalam Putusan Nomor 213 K/Pdt.Sus-Pailit/2013, objek yang bukan milik Debitor dinyatakan tidak termasuk harta pailit. Dalam Putusan Nomor 426 K/Pdt.Sus-Pailit/2013, bahan baku yang telah dilelang Kurator dinyatakan bukan harta pailit, meskipun sebelumnya ditetapkan sebagai boedel oleh Hakim Pengawas. SEMA Nomor 2 Tahun 2024 menegaskan kembali bahwa aset pihak ketiga tidak dapat dimasukkan sebagai harta pailit. Melanjutkan lelang tanah eks HGU berarti menjual milik negara, dengan risiko dibatalkan dan menimbulkan tanggung jawab Kurator menurut Pasal 72 UU 37/2004."),

  Sub("C.\tApakah hak-hak itu dapat dialihkan melalui cessie"),
  isi("Cessie adalah penyerahan piutang atas nama kepada pihak lain, yang diatur dalam Pasal 613 KUHPerdata. Keabsahannya diuji dengan lima syarat berikut.", 120, true),
  tabel(["Syarat", "Pengujian", "Hasil"], [
    ["1. Objeknya tagihan yang dapat dialihkan", "Hak atas ganti rugi dan hak menagih hasil kebun adalah tagihan uang, yang oleh Pasal 511 KUHPerdata digolongkan sebagai benda bergerak. Hak atas ganti rugi masih bersyarat, tetapi Pasal 1334 ayat (1) KUHPerdata membolehkan benda yang baru akan ada menjadi pokok perjanjian, sepanjang dasarnya sudah ada (PP 40/1996) dan objeknya dapat ditentukan melalui inventarisasi dan penilaian. Tidak ada larangan undang-undang, dan hak itu tidak bersifat pribadi.", "Terpenuhi"],
    ["2. Pihak yang mengalihkan berwenang", "Debitor kehilangan hak mengurus hartanya sejak putusan pailit (Pasal 24 ayat (1) UU 37/2004), dan kewenangan itu ada pada Kurator (Pasal 16 dan 69). Karena hak tagih bersyarat tidak dapat dilelang secara wajar, Kurator memutuskan tindakannya dengan izin Hakim Pengawas (Pasal 185 ayat (3)).", "Terpenuhi dengan izin Hakim Pengawas"],
    ["3. Bentuk akta", "Pasal 613 ayat (1) KUHPerdata mensyaratkan akta otentik atau akta di bawah tangan. Akta notaris dipilih agar pembuktiannya sempurna dan dapat dirujuk BPN.", "Terpenuhi"],
    ["4. Mengikat pihak yang wajib membayar", "Menurut Pasal 613 ayat (2) KUHPerdata, cessie berlaku terhadap pihak yang berutang setelah diberitahukan kepadanya atau diakuinya secara tertulis. Pemberitahuan ditujukan kepada BPN untuk hak ganti rugi, serta kepada Debitor dan pihak yang memanen untuk hak tagih hasil kebun.", "Terpenuhi setelah pemberitahuan"],
    ["5. Sejalan dengan hukum pertanahan dan asas kepailitan", "Tanah tidak ikut dialihkan dan kewenangan Menteri tidak dilangkahi. Hasilnya masuk rekening harta pailit dan dibagi menurut Daftar Piutang Tetap. Penawaran terbuka, penilaian KJPP, dan izin Hakim Pengawas menjaga independensi Kurator (Pasal 15 ayat (3)).", "Terpenuhi"],
  ], [2200, 5381, 1500], ["L", "J", "C"]),
  jeda(),
  isi("Yurisprudensi Mahkamah Agung memberi petunjuk praktis tentang cara melaksanakan cessie ini.", 120, true),
  tabel(["Putusan", "Kaidah", "Pelajaran bagi Kurator"], [
    ["MA No. 48 K/Pdt/2000, 18 Oktober 2002", "Dalam jual beli piutang tidak ada aturan yang mengharuskan para pihak memberitahukan pengalihan kepada debitur agar peralihan itu sah di antara mereka.", "Hak beralih kepada pembeli sejak akta ditandatangani. Pemberitahuan tetap diperlukan agar pihak yang berutang terikat membayar kepada pembeli."],
    ["MA No. 125 PK/Pdt.Sus-Pailit/2015", "Mahkamah Agung membatalkan putusan sebelumnya karena peralihan piutang belum diberitahukan secara resmi kepada debitur melalui juru sita pengadilan.", "Pemberitahuan cessie sebaiknya tidak hanya melalui surat, tetapi juga disampaikan secara resmi melalui juru sita Pengadilan Niaga agar tidak dapat dibantah."],
    ["MA No. 1809 K/Pdt/2007, 28 Januari 2008", "Utang debitur tetap ada meskipun kreditur telah mengalihkan piutangnya kepada pihak lain.", "Pihak yang memanen kebun tidak terbebas dari kewajibannya karena hak tagih dijual; kewajiban itu kini ditagih oleh pembeli."],
    ["MA No. 1771 K/Pdt/2019", "Bekas pemegang hak yang menguasai objek secara terus-menerus tetap memperoleh hak prioritas meskipun haknya berakhir (perkara HGB).", "Prioritas memang hidup setelah hak berakhir, tetapi ukurannya penguasaan sendiri. Karena kebun dikuasai pihak lain, prioritas lebih tepat dilepaskan kepada pembeli daripada dipakai Kurator."],
  ], [2300, 3400, 3381], ["L", "J", "J"]),
  jeda(),

  Sub("D.\tKedudukan prioritas menurut Pasal 22 PP 18/2021"),
  isi("Pasal 22 ayat (3) PP 18/2021 menetapkan bahwa penataan kembali tanah bekas HGU menjadi kewenangan Menteri, dan prioritas **dapat** diberikan kepada bekas pemegang hak dengan memperhatikan antara lain apakah tanahnya masih diusahakan dengan baik, apakah syarat pemberian hak dipenuhi, dan apakah pemegang hak masih memenuhi syarat. Kata \"dapat\" menunjukkan bahwa prioritas adalah pertimbangan kebijakan, bukan hak yang dapat dituntut atau dijual."),
  isi("Kurator tidak menggunakan prioritas itu untuk memohon HGU baru atas nama PT Rata Makmur, karena syaratnya lemah (kebun dikuasai pihak lain dan perseroan dalam pailit), biayanya besar, dan tugas Kurator adalah membereskan, bukan melanjutkan usaha. Yang dilakukan Kurator adalah **melepaskan** kedudukan prioritas itu dengan izin Hakim Pengawas sebagai bagian dari paket, sehingga calon pemohon HGU baru tidak terhalang. Pelepasan inilah yang memberi nilai tambah bagi pembeli."),

  Sub("E.\tMengapa pembeli yang paling tepat adalah calon pemohon HGU baru"),
  isi("Menurut Pasal 4 ayat (4) PP 40/1996, pemegang HGU baru wajib memberi ganti kerugian atas tanaman dan bangunan milik bekas pemegang hak. Bila hak atas ganti rugi itu dialihkan kepada calon pemohon HGU baru, lalu ia benar-benar memperoleh HGU, maka ia sekaligus menjadi pihak yang berhak dan pihak yang wajib membayar ganti rugi. Kewajiban itu hapus karena percampuran utang (Pasal 1436 KUHPerdata)."),
  isi("Artinya, **pembeli membayar ganti rugi tersebut di muka kepada harta pailit**. Tidak ada pembayaran ganda, tidak ada sengketa antara Kurator dan pemegang hak baru, dan harta pailit tidak perlu menunggu proses penataan tanah yang memakan waktu."),

  Sub("F.\tRisiko hukum dan cara mengatasinya"),
  tabel(["Risiko", "Cara mengatasi"], [
    ["BPN menilai bangunan atau tanaman tidak lagi diperlukan, sehingga hak ganti rugi tidak timbul.", "Meminta sikap tertulis BPN sebelum harga ditetapkan dan menjual dalam kondisi apa adanya. Kurator hanya menjamin adanya hak (Pasal 1534 KUHPerdata), bukan kemampuan pihak yang berutang membayar (Pasal 1535)."],
    ["Tanah ditata untuk Bank Tanah atau reforma agraria, bukan untuk pemohon swasta.", "Menjadikannya titik keputusan: bila demikian, hak ganti rugi ditagih kepada negara dan tidak dijual kepada swasta."],
    ["Pihak yang memanen menolak membayar hasil kebun.", "Risiko penagihan beralih kepada pembeli yang telah memperhitungkannya dalam harga. Pemberitahuan disampaikan melalui juru sita sesuai Putusan MA No. 125 PK/Pdt.Sus-Pailit/2015."],
    ["Kreditor atau Debitor menilai harga terlalu rendah.", "Nilai KJPP menjadi acuan, disertai penawaran terbuka dan izin Hakim Pengawas. Keberatan tetap dapat diajukan menurut Pasal 77 UU 37/2004."],
    ["Pembeli ternyata terafiliasi dengan Debitor atau pihak yang memanen.", "Surat pernyataan tidak terafiliasi dengan sanksi pembatalan, serta pemeriksaan akta pendirian dan susunan pengurus pembeli."],
    ["Kelak ada kewajiban membongkar bangunan.", "Beban pembongkaran dialihkan kepada pembeli dalam akta."],
  ], [3600, 5481], ["J", "J"]),
  jeda(),

  H("VII.\tMANFAAT BAGI PARA PIHAK"),
  tabel(["Pihak", "Manfaat"], [
    ["Kreditor (KPP Pratama Binjai dan 6 eks karyawan)", "Memperoleh pembayaran dari hak yang selama ini bernilai nol bagi harta pailit. Pembayaran terjadi dalam hitungan bulan, bukan menunggu penataan tanah atau perkara bertahun-tahun. Biaya penagihan tidak mengurangi harta pailit karena risikonya beralih kepada pembeli, dan tidak ada risiko lelang dibatalkan yang dapat memaksa pengembalian hasil pembagian."],
    ["Debitor (PT Rata Makmur dan direksinya)", "Sisa utang berkurang sebesar hasil yang dibagikan, sehingga beban yang tetap melekat setelah kepailitan berakhir ikut berkurang. Paparan tanggung jawab tanggung renteng direksi menurut Pasal 104 ayat (2) UU 40/2007 menyusut. Debitor terbebas dari kewajiban membongkar bangunan menurut Pasal 18 PP 40/1996, dan nilai kebun yang pernah dibangunnya dihargai. Bila hasilnya melampaui titik impas, seluruh tagihan lunas, kepailitan dapat berakhir (Pasal 202 UU 37/2004), kelebihannya dikembalikan kepada Debitor, dan jalan rehabilitasi terbuka."],
    ["Kurator (BHP Medan)", "Memiliki jalan pemberesan yang sah dan didukung penetapan Hakim Pengawas, sehingga risiko tanggung jawab menurut Pasal 72 UU 37/2004 terkendali. Terhindar dari lelang atas benda yang bukan milik Debitor. Tidak perlu menguasai atau mengelola kebun secara fisik, sehingga risiko keamanan di lokasi berkurang. Perkara yang berjalan sejak 2023 dapat diselesaikan, mendukung pengendalian Risiko 15.1 dalam Dokumen Manajemen Risiko BHP Medan, dan setiap langkah terdokumentasi."],
    ["Negara dan calon pemegang hak baru", "Status keperdataan di atas tanah menjadi bersih sebelum hak baru diberikan: tidak ada klaim ganti rugi yang tertunda dan tidak ada kedudukan prioritas yang menghalangi."],
  ], [2300, 6781], ["L", "J"]),
  jeda(),

  H("VIII.\tESTIMASI BIAYA DAN PEROLEHAN"),
  isi("**Seluruh angka pada bagian ini adalah perkiraan untuk perencanaan, bukan nilai.** Data umur tanaman, luas tertanam, dan isi kontrak panen belum tersedia, sehingga perkiraan disusun dari asumsi yang dinyatakan terbuka. Nilai yang sah ditentukan oleh laporan KJPP dan hasil penawaran terbuka."),
  Sub("A.\tBiaya pelaksanaan"),
  tabel(["No", "Komponen", "Dasar perkiraan", "Kisaran (Rp)"], [
    ["1", "Panjar biaya penyegelan oleh juru sita", "Biaya pelaksanaan juru sita ke Kabupaten Langkat sesuai ketetapan Pengadilan Negeri Medan.", "3.000.000 – 7.500.000"],
    ["2", "Pengukuran atau plotting bidang oleh Kantah Langkat", "Batas bawah untuk plotting dan pengembalian batas; batas atas untuk pengukuran penuh ± 389 Ha menurut tarif PNBP pertanahan (PP 128/2015). Perlu dikonfirmasi ke Kantah.", "15.000.000 – 95.000.000"],
    ["3", "Jasa penilaian KJPP", "Penilaian bangunan, tanaman ± 340 Ha, dan hak tagih.", "25.000.000 – 75.000.000"],
    ["4", "Operasional lapangan dan koordinasi", "Perjalanan, uang harian, dan konsumsi sesuai Standar Biaya Masukan, tanpa pembayaran di luar ketentuan.", "10.000.000 – 20.000.000"],
    ["5", "Pengumuman penawaran terbuka", "Iklan di dua surat kabar.", "5.000.000 – 15.000.000"],
    ["6", "Pengumuman daftar pembagian", "Iklan di surat kabar.", "5.000.000 – 10.000.000"],
    ["7", "Surat-menyurat dan pengiriman", "Pos tercatat dan penggandaan berkas.", "2.000.000 – 5.000.000"],
    ["8", "Akta notaris", "Ditanggung pembeli menurut pokok-pokok akta.", "0"],
    TOT("", "Jumlah biaya pelaksanaan", "", "65.000.000 – 227.500.000"),
    ["", "PNBP imbalan jasa Kurator 7% dari DPT", "Penugasan Hakim Pengawas 10 Desember 2025, dikurangi bagian yang telah dipotong tahun 2025.", "± 100.301.019"],
  ], [500, 2600, 4131, 1850], ["C", "L", "J", "R"]),
  jeda(),
  isi("Sebagian biaya (juru sita, pengukuran, dan KJPP) harus dibayar sebelum ada hasil penjualan, sedangkan rekening harta pailit belum memiliki saldo yang cukup. Pembiayaannya dapat ditempuh dengan meminta calon pembeli menanggung biaya penilaian dan pengukuran sebagai syarat penawaran yang diperhitungkan dalam harga, atau meminta Debitor menyetor biaya pemberesan sesuai komitmennya dalam rapat 14 September 2026."),
  Sub("B.\tAsumsi perolehan"),
  tabel(["Asumsi", "Konservatif", "Moderat", "Optimis", "Keterangan"], [
    ["Luas tertanam efektif", "250 Ha", "300 Ha", "338 Ha", "Dari 338,7463 Ha, dikurangi emplasemen, jalan, dan areal kosong."],
    ["Nilai ganti rugi tanaman per Ha", "Rp5 juta", "Rp15 juta", "Rp40 juta", "Rendah bila tanaman asal tahun 1990-an yang telah lewat umur ekonomis; tinggi bila telah diremajakan."],
    ["Bangunan dan benda", "Rp100 juta", "Rp300 juta", "Rp500 juta", "Menunggu hasil inventarisasi."],
    ["Potongan kondisi apa adanya dan risiko", "40%", "30%", "20%", "Risiko sikap BPN, penguasaan fisik, dan pembongkaran."],
    ["Nilai kontrak panen per Ha per tahun", "Rp1 juta", "Rp2 juta", "Rp3 juta", "Selama ± 3,5 tahun sejak 10 April 2023."],
    ["Harga hak tagih hasil kebun dibanding nilai klaim", "10%", "20%", "30%", "Potongan besar karena sulit ditagih."],
  ], [2300, 1350, 1150, 1150, 3131], ["L", "C", "C", "C", "J"]),
  jeda(),
  Sub("C.\tPerkiraan perolehan dan pembagian"),
  tabel(["Uraian (Rp)", "Konservatif", "Moderat", "Optimis"], [
    ["Nilai tanaman (luas × nilai per Ha)", "1.250.000.000", "4.500.000.000", "13.520.000.000"],
    ["Paket tanaman dan bangunan setelah potongan", "810.000.000", "3.360.000.000", "11.216.000.000"],
    ["Nilai klaim hasil kebun", "875.000.000", "2.100.000.000", "3.549.000.000"],
    ["Harga hak tagih hasil kebun", "87.500.000", "420.000.000", "1.064.700.000"],
    TOT("Perkiraan harga paket", "897.500.000", "3.780.000.000", "12.280.700.000"),
    ["Dikurangi biaya pelaksanaan", "(65.000.000)", "(120.000.000)", "(227.500.000)"],
    ["Dikurangi PNBP 7% dari DPT", "(100.301.019)", "(100.301.019)", "(100.301.019)"],
    TOT("Tersedia untuk kreditor", "732.198.981", "3.559.698.981", "11.952.898.981"),
    ["Dibayar kepada 6 eks karyawan", "139.653.168", "139.653.168", "139.653.168"],
    ["Dibayar kepada KPP Pratama Binjai", "592.545.813", "1.108.581.903", "1.108.581.903"],
    TOT("Tagihan yang tidak terbayar", "516.036.090", "0", "0"),
    TOT("Sisa yang dikembalikan kepada Debitor", "0", "2.311.463.910", "10.704.663.910"),
  ], [3481, 1850, 1850, 1900], ["L", "R", "R", "R"]),
  jeda(),
  isi("**Titik impas** adalah harga paket sekitar **Rp1,47 miliar**, yaitu sisa tagihan (Rp1.248.235.071), PNBP (± Rp100,3 juta), dan biaya pelaksanaan (± Rp120 juta). Bila harga penawaran terbaik mencapai angka itu, seluruh kreditor dibayar penuh dan kelebihannya dikembalikan kepada Debitor."),
  isi("Bahkan pada skenario konservatif, cessie menghasilkan sekitar Rp730 juta bagi kreditor, yang cukup untuk melunasi sisa tagihan eks karyawan dan lebih dari separuh tagihan KPP Pratama Binjai. Tanpa cessie, hasilnya nol. Faktor penentu terbesar adalah umur dan kondisi tanaman, sehingga inventarisasi harus mencatat tahun tanam per blok, dan nilai limit penawaran ditetapkan dari laporan KJPP."),

  H("IX.\tMENGAPA INI LANGKAH YANG PALING MUNGKIN DAN MASUK AKAL"),
  isi("Setiap alternatif diuji dengan ukuran yang sama: dasar hukum, peluang memperoleh nilai, waktu, serta biaya dan risiko bagi harta pailit.", 120, true),
  tabel(["Alternatif", "Dasar hukum", "Peluang nilai", "Waktu", "Biaya dan risiko", "Penilaian"], [
    ["1. Lelang tanah eks HGU (rencana 2024)", "Tidak ada; tanah bukan harta pailit.", "Nol; lelang dapat dibatalkan.", "—", "Tinggi (Pasal 72).", "Tidak layak"],
    ["2. Lelang terpisah bangunan dan hak tagih melalui KPKNL", "Ada (Pasal 185 ayat (1)).", "Rendah; hak bersyarat hampir tidak laku, bangunan dinilai sebagai bongkaran.", "Menengah", "Sedang.", "Kurang layak"],
    ["3. Kurator menagih sendiri ganti rugi", "Ada.", "Tidak pasti; pemegang hak baru belum ada.", "Sangat lama", "Tinggi; perkara dibiayai harta pailit.", "Kurang layak"],
    ["4. Kurator memohon HGU baru dan mengelola kebun", "Lemah; syarat prioritas tidak terpenuhi.", "Tidak pasti.", "Lama", "Sangat tinggi; modal dan keamanan.", "Tidak layak"],
    ["5. Menunggu Debitor membayar", "Ada.", "Bergantung pada kemauan Debitor; janji Desember 2025 gagal.", "Tidak pasti", "Rendah.", "Tidak dapat diandalkan sendiri"],
    ["6. Mengakhiri kepailitan tanpa pemberesan hak ini", "Ada (Pasal 18).", "Nol bagi kreditor.", "Cepat", "Rendah.", "Membuang nilai"],
    TOT("7. Penjualan paket dengan cessie melalui penawaran terbuka", "Ada (Pasal 185 ayat (3) UU 37/2004; Pasal 613 KUHPerdata).", "Nyata; ada peminat dan kebun produktif.", "± 4–5 bulan", "Rendah; risiko beralih kepada pembeli.", "Paling layak"),
  ], [1850, 1650, 1700, 1250, 1400, 1231], ["L", "J", "J", "C", "J", "C"]),
  jeda(),
  isi("Kesimpulan perbandingan itu bertumpu pada empat alasan. **Pertama**, hanya jalur ini yang sah sekaligus menghasilkan uang: jalur lain yang sah tidak menghasilkan nilai wajar, sedangkan jalur yang tampak bernilai (lelang tanah) tidak sah. **Kedua**, nilai hak ganti rugi hanya dapat dicairkan oleh pihak yang akan mengusahakan tanah, dan cessie mempertemukan keduanya. **Ketiga**, syarat pasarnya sudah ada: kebun produktif, peminat tertulis, dan BPN sedang menangani statusnya. **Keempat**, risiko lapangan, penagihan, dan pembongkaran berpindah kepada pembeli yang paling mampu menanggungnya, sementara jalur setoran Debitor tetap terbuka."),

  H("X.\tKESIMPULAN"),
  ...butirList([
    "Cessie atas hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) **dapat dilaksanakan secara sah** oleh Kurator dengan izin Hakim Pengawas, melalui akta notaris dan pemberitahuan resmi kepada pihak yang berutang, sejalan dengan Pasal 613 KUHPerdata dan yurisprudensi Mahkamah Agung.",
    "Langkah ini **menguntungkan semua pihak**. Dengan biaya sekitar Rp65–228 juta, hasilnya diperkirakan Rp0,9–12,3 miliar, dengan titik impas sekitar Rp1,47 miliar.",
    "Dibandingkan enam alternatif lain, penjualan paket dengan cessie melalui penawaran terbuka adalah **satu-satunya langkah yang sah, menghasilkan nilai nyata, dan dapat diselesaikan dalam waktu wajar**.",
  ]),

  H("XI.\tSARAN"),
  ...butirList([
    "Menyetujui penjualan paket dengan cessie sebagai arah pemberesan dan menandatangani Surat 1 sampai dengan Surat 7 dalam Himpunan Konsep Surat.",
    "Menjadikan sikap tertulis Kanwil BPN Sumatera Utara sebagai syarat sebelum harga paket ditetapkan.",
    "Menyampaikan pemberitahuan cessie secara resmi melalui juru sita Pengadilan Niaga, di samping surat Kurator, sesuai pelajaran Putusan MA No. 125 PK/Pdt.Sus-Pailit/2015.",
    "Tetap membuka jalur setoran Debitor ke rekening harta pailit secara paralel.",
    "Sebelum dikutip dalam dokumen resmi, mengunduh salinan lengkap putusan yang dirujuk dari Direktori Putusan Mahkamah Agung, karena kaidahnya dalam telaah ini diambil dari ulasan, serta mencocokkan bunyi Pasal 70–73 dan 79 Permen ATR/BPN 18/2021 dari PDF yang disampaikan Sdr. Hutri Zebua.",
  ], { keepLast: true }),
  par("Demikian telaah hukum ini disampaikan sebagai bahan pertimbangan dan pengambilan keputusan.", 240, true),
  sign2(
    ["", "Mengetahui,", "Kepala Seksi Harta Peninggalan Wilayah II,", "", "", "", "Elsintha Damayanti"],
    [`Medan, ${TGL}`, "Tim Kurator PT Rata Makmur,", "Kurator Keperdataan Ahli Pertama,", "", "", "", "Shela Natasha"],
  ),
];

const doc = new Document({
  creator: "Balai Harta Peninggalan Medan",
  title: "Telaah Hukum Cessie PT Rata Makmur",
  styles: { default: { document: { run: { font: FONT, size: 24 } } } },
  numbering,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 737, right: 1361, bottom: 737, left: 1474, header: 400, footer: 400 } } },
    children: doc_,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || "telaah_hukum.docx", b); console.log("wrote"); });
