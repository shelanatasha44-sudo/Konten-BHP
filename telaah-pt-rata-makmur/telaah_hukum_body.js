// ============================ TELAAH HUKUM CESSIE ============================
const H = (t) => new Paragraph({ children: runs(`**${t}**`), spacing: { ...LS, before: 200, after: 120 }, keepNext: true, keepLines: true,
  indent: { left: 453, hanging: 453 }, tabStops: [{ type: "left", position: 453 }] });
const Sub = (t) => new Paragraph({ children: runs(`**${t}**`), spacing: { ...LS, before: 120, after: 100 }, keepNext: true, keepLines: true,
  indent: { left: 453, hanging: 453 }, tabStops: [{ type: "left", position: 453 }] });
const isi = (t, after = 120) => new Paragraph({ children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { ...LS, after }, indent: { left: 453 }, keepLines: true });
const T = (header, rows, widths, aligns) => grid(header, rows, widths, aligns);

function kv(rows) {
  const W = [1531, 236, 7314];
  const c = (t, i) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA }, children: [plain(t, { after: 40 })] });
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
    ["Tanggal", "……………… 2026"],
    ["Perkara", "Putusan Pengadilan Niaga pada Pengadilan Negeri Medan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn tanggal 10 April 2023"],
  ]),
  new Paragraph({ children: [], spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } }),

  H("I.\tPERTANYAAN HUKUM"),
  ...butirList([
    "Apakah pengalihan (cessie) atas hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) dapat dilaksanakan secara sah oleh Kurator?",
    "Apa manfaat langkah tersebut bagi para Kreditor, Debitor, dan Kurator?",
    "Mengapa cessie dalam satu paket penjualan merupakan langkah yang paling mungkin dan paling masuk akal dibandingkan alternatif lain?",
  ]),

  H("II.\tJAWABAN SINGKAT"),
  ...butirList([
    "**Dapat.** Kedua hak tersebut merupakan tagihan yang bernilai uang dan tergolong benda bergerak tidak berwujud (Pasal 511 KUHPerdata). Kurator berwenang mengalihkannya (Pasal 16, 69, dan 185 ayat (3) UU 37/2004) dengan izin Hakim Pengawas, melalui akta (Pasal 613 ayat (1) KUHPerdata) yang diberitahukan kepada pihak yang wajib membayar (Pasal 613 ayat (2)). Tidak ada larangan undang-undang atau sifat pribadi yang menghalangi pengalihannya. Yang tidak dapat di-cessie adalah bangunan (dijual biasa), kedudukan prioritas (dilepaskan), serta gugatan pembatalan dan tuntutan tanggung jawab direksi (tetap pada Kurator).",
    "**Manfaatnya dirasakan semua pihak.** Kreditor memperoleh uang dari hak yang selama ini tidak dapat dicairkan. Utang Debitor berkurang dan Debitor terbebas dari kewajiban pembongkaran. Kurator memperoleh jalan pemberesan yang sah, terukur, dan tidak bergantung pada penguasaan fisik lokasi.",
    "**Paling mungkin dan masuk akal**, karena semua alternatif lain terbentur: lelang tanah tidak sah, lelang terpisah tidak laku, menagih sendiri tidak memiliki pihak yang dapat ditagih saat ini, dan menunggu Debitor sudah terbukti gagal. Cessie kepada calon pemohon HGU baru mempertemukan hak ganti rugi dengan pihak yang kelak wajib membayarnya, sehingga nilainya dapat diuangkan sekarang.",
  ]),

  H("III.\tFAKTA YANG RELEVAN"),
  ...butirList([
    "HGU Nomor 2/Sei Tampa atas nama PT Rata Makmur berakhir pada 31 Agustus 2013 tanpa perpanjangan maupun pembaruan (surat Kantor Pertanahan Kabupaten Langkat tanggal 12 Agustus 2024).",
    "PT Rata Makmur dinyatakan pailit pada 10 April 2023. Kurator telah memblokir bidang (8 Mei 2023) dan melakukan sita umum (22 Mei 2023).",
    "Kebun kelapa sawit masih berproduksi dan diduga dipanen pihak lain berdasarkan kontrak dengan Debitor, tanpa penyerahan hasil kepada Kurator.",
    "PT Raya Padang Langkat menyatakan minat membeli melalui surat tanggal 22 Agustus 2024.",
    "Daftar Piutang Tetap berjumlah Rp1.432.871.696,00. Tagihan KPP Pratama Binjai sebesar Rp1.108.581.903,00 belum dibayar dan sisa tagihan eks karyawan paling sedikit Rp139.653.168,00. Debitor menyatakan tidak ada aset lain dan tidak memenuhi janji setor tanggal 18 Desember 2025.",
    "Tim khusus Kanwil BPN Sumatera Utara sedang menangani status eks HGU tersebut.",
  ]),

  H("IV.\tANALISIS: DAPATKAH CESSIE DILAKSANAKAN?"),
  isi("Sahnya cessie diuji melalui lima syarat: objeknya dapat dialihkan, pihak yang mengalihkan berwenang, bentuknya dipenuhi, berlaku terhadap pihak yang berutang, dan tidak bertentangan dengan hukum pertanahan maupun asas kepailitan."),
  Sub("A.\tObjek dapat dialihkan"),
  isi("Pasal 613 KUHPerdata mengatur penyerahan piutang atas nama dan kebendaan tak bertubuh lainnya. Pasal 511 KUHPerdata menggolongkan perikatan dan tuntutan mengenai jumlah uang yang dapat ditagih sebagai benda bergerak. Pengujian atas setiap hak adalah sebagai berikut:"),
  T(["Hak", "Dasar keberadaan", "Sifat", "Dapat di-cessie?"], [
    ["Hak atas ganti rugi atas bangunan, tanaman, dan benda", "Pasal 18 ayat (2) dan Pasal 4 ayat (4) PP 40/1996; asas pemisahan horizontal", "Tagihan bersyarat; pihak yang wajib membayar belum pasti", "**Ya.** Piutang yang akan ada dapat menjadi pokok perjanjian (Pasal 1334 ayat (1) KUHPerdata) sepanjang dasarnya sudah ada dan objeknya dapat ditentukan"],
    ["Hak menagih hasil kebun sejak 10 April 2023", "Pasal 21 dan 24 ayat (1) UU 37/2004; Pasal 1365 KUHPerdata", "Tagihan yang sudah ada terhadap Debitor dan pihak yang memanen", "**Ya.** Piutang atas nama biasa"],
    ["Bangunan dan benda", "Hak milik PT; pemisahan horizontal", "Benda, bukan piutang", "**Tidak di-cessie**, tetapi dijual dengan akta jual beli"],
    ["Kedudukan prioritas bekas pemegang hak", "Pasal 22 PP 18/2021", "Pertimbangan kewenangan Menteri, bukan tagihan", "**Tidak.** Dapat dilepaskan dengan surat pernyataan"],
    ["Gugatan pembatalan (actio pauliana) dan tuntutan tanggung jawab direksi", "Pasal 41 dan 47 UU 37/2004; Pasal 104 ayat (2) UU 40/2007", "Kewenangan yang melekat pada jabatan Kurator", "**Tidak.** Tetap dijalankan Kurator"],
  ], [2000, 2450, 2050, 2581], ["L", "L", "L", "L"]),
  blank(),
  isi("Tidak ada ketentuan yang melarang pengalihan hak atas ganti rugi atau hak menagih hasil kebun, dan kedua hak itu tidak bersifat sangat pribadi. Menurut Pasal 1533 KUHPerdata, penjualan piutang juga meliputi segala sesuatu yang melekat padanya."),
  Sub("B.\tKurator berwenang mengalihkan"),
  isi("Sejak putusan pailit, Debitor kehilangan hak menguasai dan mengurus kekayaannya (Pasal 24 ayat (1) UU 37/2004), dan kewenangan itu beralih kepada Kurator (Pasal 16 ayat (1) dan Pasal 69 ayat (1)). Untuk benda yang tidak segera atau sama sekali tidak dapat dibereskan melalui lelang, Pasal 185 ayat (3) memberi Kurator kewenangan memutuskan tindakannya dengan izin Hakim Pengawas. Hak tagih yang bersyarat tidak memiliki pasar lelang yang wajar, sehingga jalur ini tepat. Balai Harta Peninggalan Medan bertindak melalui Kepala sebagai pimpinan instansi yang diangkat sebagai Kurator."),
  Sub("C.\tBentuk dipenuhi"),
  isi("Pasal 613 ayat (1) KUHPerdata mensyaratkan akta otentik atau akta di bawah tangan. Kami menyarankan akta notaris agar memiliki kekuatan pembuktian sempurna dan dapat dirujuk oleh BPN. Akta dibuat setelah terbit penetapan Hakim Pengawas dan setelah harga diterima lunas di rekening harta pailit."),
  Sub("D.\tBerlaku terhadap pihak yang berutang"),
  isi("Menurut Pasal 613 ayat (2) KUHPerdata, cessie baru berlaku terhadap pihak yang berutang (cessus) setelah diberitahukan kepadanya, atau disetujui atau diakuinya secara tertulis. Pemberitahuan disampaikan kepada Kanwil BPN Sumatera Utara dan Kantor Pertanahan Kabupaten Langkat (atas hak ganti rugi), serta kepada Debitor dan pihak yang memanen kebun (atas hak menagih hasil kebun). Konsep suratnya telah tersedia sebagai Surat 12 dalam Himpunan Konsep Surat."),
  Sub("E.\tTidak bertentangan dengan hukum pertanahan"),
  isi("Cessie ini tidak mengalihkan hak atas tanah dan tidak mendahului kewenangan Menteri. Tanah tetap tanah negara, dan pemberian hak baru tetap diputuskan BPN. Yang dialihkan hanya tagihan keperdataan yang oleh PP 40/1996 memang diakui milik bekas pemegang hak."),
  isi("Bila penerima cessie kelak menjadi pemegang HGU baru, ia sekaligus menjadi pihak yang berhak atas ganti rugi dan pihak yang wajib membayarnya menurut Pasal 4 ayat (4) PP 40/1996. Kedudukan itu bersatu pada satu orang, sehingga kewajiban tersebut hapus karena percampuran utang (Pasal 1436 KUHPerdata). **Secara ekonomi, pembeli membayar ganti rugi itu di muka kepada harta pailit**, sehingga tidak ada pembayaran ganda dan tidak ada sengketa antara Kurator dan pemegang hak baru."),
  Sub("F.\tSejalan dengan asas kepailitan"),
  isi("Hasil cessie masuk ke rekening harta pailit dan dibagikan menurut Daftar Piutang Tetap, sesuai asas paritas creditorium dan pari passu pro rata parte. Penawaran terbuka, penilaian KJPP, dan izin Hakim Pengawas menjaga independensi Kurator (Pasal 15 ayat (3)). Kreditor dan Debitor tetap dapat mengajukan keberatan atas tindakan Kurator kepada Hakim Pengawas (Pasal 77), sehingga kepentingan mereka terlindungi."),
  Sub("G.\tRisiko hukum dan mitigasinya"),
  T(["Risiko", "Mitigasi"], [
    ["BPN tidak menganggap bangunan atau tanaman masih diperlukan, sehingga hak ganti rugi tidak timbul", "Minta sikap tertulis BPN sebelum harga ditetapkan; jual dalam kondisi apa adanya; Kurator hanya menjamin adanya hak (Pasal 1534 KUHPerdata), bukan kemampuan pihak yang berutang membayar (Pasal 1535)"],
    ["Tanah ditata untuk Bank Tanah atau reforma agraria, bukan untuk pemohon swasta", "Titik keputusan: bila demikian, hak ganti rugi ditagih kepada negara dan tidak dijual kepada swasta"],
    ["Pihak yang memanen menolak membayar hasil kebun", "Risiko penagihan beralih kepada penerima cessie yang telah memperhitungkannya dalam harga; harta pailit tidak menanggung biaya perkara"],
    ["Kreditor menilai harga terlalu rendah", "Nilai KJPP sebagai acuan, penawaran terbuka, dan izin Hakim Pengawas; keberatan dapat diajukan menurut Pasal 77 UU 37/2004"],
    ["Pembeli terafiliasi dengan Debitor atau pengelola kebun", "Surat pernyataan tidak terafiliasi dengan sanksi pembatalan; pemeriksaan akta perusahaan pembeli"],
    ["Pembongkaran kelak diwajibkan kepada bekas pemegang hak", "Beban pembongkaran dialihkan kepada pembeli dalam akta"],
  ], [3800, 5281], ["L", "L"]),
  blank(),

  H("V.\tMANFAAT BAGI PARA PIHAK"),
  T(["Pihak", "Manfaat"], [
    ["**Kreditor** (KPP Pratama Binjai, 6 eks karyawan)",
      "Memperoleh pembayaran dari hak yang selama ini bernilai nol bagi harta pailit, karena tanahnya tidak dapat dilelang. Tagihan eks karyawan dan pajak dapat dibayar sebagian atau seluruhnya melalui daftar pembagian. Pembayaran terjadi dalam hitungan bulan, bukan menunggu penataan tanah atau litigasi bertahun-tahun. Biaya perkara penagihan tidak mengurangi harta pailit, karena risiko penagihan beralih kepada pembeli. Tidak ada risiko pembatalan lelang yang dapat mengembalikan uang kepada pembeli dan menghapus hasil pembagian."],
    ["**Debitor** (PT Rata Makmur dan direksinya)",
      "Sisa utang berkurang sebesar hasil yang dibagikan. Utang yang tidak terbayar dari harta pailit tetap melekat pada Debitor setelah kepailitan berakhir, sehingga setiap rupiah hasil cessie mengurangi beban itu. Paparan tanggung jawab tanggung renteng direksi menurut Pasal 104 ayat (2) UU 40/2007 menyusut, karena tanggung jawab itu hanya atas kewajiban yang tidak terlunasi. Debitor terbebas dari kewajiban membongkar bangunan menurut Pasal 18 PP 40/1996, karena beban itu beralih kepada pembeli. Nilai kebun yang pernah dibangun Debitor dihargai, tidak hilang begitu saja kepada negara. Bila ditambah setoran Debitor hingga seluruh tagihan lunas, jalan menuju berakhirnya kepailitan dan rehabilitasi (Pasal 202, 215, dan 216 UU 37/2004) menjadi terbuka."],
    ["**Kurator** (BHP Medan)",
      "Memiliki jalan pemberesan yang sah dan berdasar penetapan Hakim Pengawas, sehingga risiko tanggung jawab menurut Pasal 72 UU 37/2004 terkendali. Terhindar dari lelang atas benda yang bukan milik Debitor. Tidak perlu menguasai atau mengelola kebun secara fisik, sehingga risiko keamanan di lokasi dan biaya pengamanan berkurang. Perkara yang telah berjalan sejak 2023 dapat diselesaikan, mendukung pengendalian Risiko 15.1 (pencatatan boedel pailit yang tidak akurat) dalam Dokumen Manajemen Risiko BHP Medan. Setiap langkah terdokumentasi (KJPP, penawaran terbuka, penetapan, akta), sehingga mudah dipertanggungjawabkan kepada pengawas dan auditor."],
    ["**Negara dan calon pemegang hak baru**",
      "Status keperdataan di atas tanah menjadi bersih sebelum hak baru diberikan: tidak ada klaim ganti rugi yang tertunda dan tidak ada kedudukan prioritas yang menghalangi. Pemohon memperoleh kepastian bahwa kewajiban ganti ruginya telah diselesaikan melalui prosedur yang disahkan pengadilan."],
  ], [2300, 6781], ["L", "L"]),
  blank(),


  H("VI.\tESTIMASI BIAYA DAN PEROLEHAN"),
  isi("**Seluruh angka pada bagian ini adalah perkiraan kasar untuk perencanaan, bukan nilai.** Angka ini disusun dari asumsi yang dinyatakan terbuka di bawah, karena data umur tanaman, luas tertanam, dan isi kontrak panen belum tersedia. Nilai yang sah ditentukan oleh laporan KJPP dan hasil penawaran terbuka."),
  Sub("A.\tEstimasi biaya pelaksanaan"),
  T(["No", "Komponen", "Dasar perkiraan", "Kisaran (Rp)"], [
    ["1", "Panjar biaya penyegelan oleh juru sita", "Biaya panggilan/pelaksanaan juru sita ke Kabupaten Langkat sesuai ketetapan PN Medan", "3.000.000 – 7.500.000"],
    ["2", "Pengukuran/plotting bidang oleh Kantah Langkat", "Batas bawah: plotting dan pengembalian batas. Batas atas: pengukuran penuh ± 389 Ha menurut rumus tarif PNBP pertanahan (PP 128/2015); dikonfirmasi ke Kantah", "15.000.000 – 95.000.000"],
    ["3", "Jasa penilaian KJPP", "Penilaian bangunan, tanaman ± 340 Ha, dan hak tagih", "25.000.000 – 75.000.000"],
    ["4", "Operasional lapangan dan koordinasi", "Perjalanan, uang harian, dan konsumsi sesuai Standar Biaya Masukan; tanpa pembayaran di luar ketentuan", "10.000.000 – 20.000.000"],
    ["5", "Pengumuman penawaran terbuka", "Iklan di dua surat kabar", "5.000.000 – 15.000.000"],
    ["6", "Pengumuman daftar pembagian", "Iklan di surat kabar", "5.000.000 – 10.000.000"],
    ["7", "Surat-menyurat dan pengiriman", "Pos tercatat, penggandaan berkas", "2.000.000 – 5.000.000"],
    ["8", "Akta notaris (jual beli, cessie, legalisasi)", "Ditanggung pembeli menurut pokok-pokok akta", "0 (bagi harta pailit)"],
    ["", "**Jumlah biaya pelaksanaan**", "", "**65.000.000 – 227.500.000**"],
    ["", "PNBP imbalan jasa Kurator 7% dari DPT", "Penugasan Hakim Pengawas 10 Desember 2025; dikurangi bagian yang telah dipotong tahun 2025", "± 100.301.019"],
  ], [500, 2800, 3931, 1850], ["C", "L", "L", "R"]),
  blank(),
  isi("Sebagian biaya (juru sita, pengukuran, KJPP) perlu dibayar di muka sebelum ada hasil penjualan. Karena rekening harta pailit saat ini tidak memiliki saldo yang cukup, pembiayaannya dapat ditempuh melalui: (a) meminta calon pembeli menanggung biaya penilaian dan pengukuran sebagai bagian dari syarat penawaran, yang diperhitungkan dalam harga; atau (b) meminta Debitor menyetor biaya pemberesan, sejalan dengan komitmen yang dinyatakannya dalam rapat 14 September 2026."),
  Sub("B.\tAsumsi perolehan"),
  T(["Asumsi", "Konservatif", "Moderat", "Optimis", "Keterangan"], [
    ["Luas tertanam efektif", "250 Ha", "300 Ha", "338 Ha", "Dari 338,7463 Ha; dikurangi emplasemen, jalan, dan areal kosong"],
    ["Nilai ganti rugi tanaman per Ha", "Rp5 juta", "Rp15 juta", "Rp40 juta", "Rendah bila tanaman asal tahun 1990-an (lewat umur ekonomis ± 25 tahun); tinggi bila telah diremajakan"],
    ["Bangunan dan benda", "Rp100 juta", "Rp300 juta", "Rp500 juta", "Menunggu inventarisasi"],
    ["Potongan kondisi apa adanya dan risiko", "40%", "30%", "20%", "Risiko sikap BPN, penguasaan fisik, dan pembongkaran"],
    ["Nilai kontrak panen per Ha per tahun", "Rp1 juta", "Rp2 juta", "Rp3 juta", "Selama ± 3,5 tahun sejak 10 April 2023"],
    ["Harga hak tagih hasil kebun terhadap nilai klaim", "10%", "20%", "30%", "Potongan besar karena sulit ditagih"],
  ], [2350, 1350, 1150, 1150, 3081], ["L", "C", "C", "C", "L"]),
  blank(),
  Sub("C.\tPerkiraan perolehan dan pembagian"),
  T(["Uraian (Rp)", "Konservatif", "Moderat", "Optimis"], [
    ["Nilai tanaman (luas × nilai per Ha)", "1.250.000.000", "4.500.000.000", "13.520.000.000"],
    ["Paket tanaman + bangunan setelah potongan", "810.000.000", "3.360.000.000", "11.216.000.000"],
    ["Nilai klaim hasil kebun", "875.000.000", "2.100.000.000", "3.549.000.000"],
    ["Harga hak tagih hasil kebun", "87.500.000", "420.000.000", "1.064.700.000"],
    ["**Perkiraan harga paket**", "**897.500.000**", "**3.780.000.000**", "**12.280.700.000**"],
    ["Dikurangi biaya pelaksanaan", "(65.000.000)", "(120.000.000)", "(227.500.000)"],
    ["Dikurangi PNBP 7% dari DPT", "(100.301.019)", "(100.301.019)", "(100.301.019)"],
    ["**Tersedia untuk kreditor**", "**732.198.981**", "**3.559.698.981**", "**11.952.898.981**"],
    ["Sisa tagihan 6 eks karyawan", "139.653.168", "139.653.168", "139.653.168"],
    ["Tagihan KPP Pratama Binjai", "592.545.813", "1.108.581.903", "1.108.581.903"],
    ["**Tagihan yang tidak terbayar**", "**516.036.090**", "**0**", "**0**"],
    ["**Sisa yang dikembalikan kepada Debitor**", "**0**", "**2.311.463.910**", "**10.704.663.910**"],
  ], [3481, 1850, 1850, 1900], ["L", "R", "R", "R"]),
  blank(),
  isi("**Titik impas** adalah harga paket sekitar **Rp1,47 miliar**, yaitu jumlah sisa tagihan (Rp1.248.235.071), PNBP (± Rp100,3 juta), dan biaya pelaksanaan (± Rp120 juta). Bila harga penawaran terbaik mencapai angka tersebut, seluruh kreditor dibayar penuh, kepailitan dapat berakhir menurut Pasal 202 UU 37/2004, dan kelebihannya dikembalikan kepada Debitor."),
  isi("Pembacaan hasil estimasi:"),
  ...butirList([
    "Bahkan pada skenario konservatif, cessie menghasilkan sekitar Rp730 juta bagi kreditor. Jumlah ini melunasi sisa tagihan eks karyawan dan lebih dari separuh tagihan KPP Pratama Binjai, dibandingkan nol bila hak tersebut tidak dibereskan.",
    "Pada skenario moderat dan optimis, seluruh tagihan lunas dan terdapat sisa bagi Debitor. Hal ini sekaligus menjadi alasan kuat bagi Debitor untuk mendukung, bukan menghalangi, proses penjualan.",
    "Faktor penentu terbesar adalah umur dan kondisi tanaman. Karena itu, inventarisasi pada operasi lapangan harus mencatat tahun tanam per blok, dan KJPP diminta menilai dengan metode yang sesuai untuk tanaman tua maupun hasil peremajaan.",
    "Karena selisih antarskenario sangat lebar, nilai limit dalam pengumuman penawaran sebaiknya ditetapkan dari laporan KJPP, paling rendah sebesar titik impas bila nilai KJPP memungkinkan.",
  ]),
  H("VII.\tMENGAPA INI LANGKAH YANG PALING MUNGKIN DAN MASUK AKAL"),
  isi("Setiap alternatif diuji dengan lima ukuran: dasar hukum, peluang memperoleh nilai, waktu, biaya dan risiko bagi harta pailit, serta risiko keamanan."),
  T(["Alternatif", "Dasar hukum", "Peluang nilai", "Waktu", "Biaya/risiko", "Penilaian"], [
    ["1. Lelang tanah eks HGU (rencana 2024)", "Tidak ada; tanah bukan harta pailit", "Nol; lelang dapat dibatalkan", "—", "Tinggi (Pasal 72)", "**Tidak layak**"],
    ["2. Lelang terpisah bangunan dan hak tagih melalui KPKNL", "Ada (Pasal 185 ayat (1))", "Rendah; hak bersyarat hampir tidak laku, bangunan dinilai sebagai bongkaran", "Menengah", "Sedang", "Kurang layak"],
    ["3. Kurator menagih sendiri ganti rugi kepada negara atau pemegang hak baru", "Ada", "Tidak pasti; pemegang hak baru belum ada dan besaran ganti rugi belum diatur", "Sangat lama", "Tinggi (litigasi dibiayai harta pailit)", "Kurang layak"],
    ["4. Kurator melanjutkan pengusahaan kebun (Pasal 104 UU 37/2004)", "Lemah; tanah negara tanpa alas hak", "Tidak pasti", "Lama", "Sangat tinggi (modal, keamanan)", "**Tidak layak**"],
    ["5. Menunggu Debitor membayar", "Ada", "Bergantung pada kemauan Debitor; janji Desember 2025 gagal", "Tidak pasti", "Rendah", "Tidak dapat diandalkan sendiri"],
    ["6. Mengakhiri kepailitan tanpa pemberesan hak ini", "Ada (Pasal 18)", "Nol bagi kreditor", "Cepat", "Rendah", "Membuang nilai"],
    ["7. **Penjualan paket dengan cessie kepada peminat melalui penawaran terbuka**", "**Ada** (Pasal 185 ayat (3) UU 37/2004; Pasal 613 KUHPerdata)", "**Nyata**; ada peminat dan kebun produktif", "**± 4–5 bulan**", "**Rendah**; risiko penagihan dan lapangan beralih ke pembeli", "**Paling layak**"],
  ], [2000, 1500, 1700, 1200, 1450, 1231], ["L", "L", "L", "C", "L", "C"]),
  blank(),
  isi("Alasan pokoknya adalah sebagai berikut:"),
  ...butirList([
    "**Hanya jalur ini yang sah sekaligus menghasilkan uang.** Jalur yang sah lainnya (lelang terpisah, menagih sendiri) tidak menghasilkan nilai yang wajar, sedangkan jalur yang tampak bernilai (lelang tanah) tidak sah.",
    "**Nilai hak ini hanya dapat dicairkan oleh pihak yang akan mengusahakan tanah.** Ganti rugi menurut Pasal 4 ayat (4) PP 40/1996 dibebankan kepada pemegang hak baru. Karena itu, pembeli yang paling rasional adalah calon pemohon hak baru itu sendiri, dan cessie mempertemukan keduanya.",
    "**Syarat pasarnya sudah ada.** Kebun masih produktif, ada peminat tertulis sejak Agustus 2024, dan BPN sedang menangani statusnya melalui tim khusus.",
    "**Risiko dipindahkan kepada pihak yang paling mampu menanggungnya.** Penguasaan fisik kebun, penagihan kepada pihak yang memanen, dan pembongkaran kelak menjadi urusan pembeli, yang memperhitungkannya dalam harga. Harta pailit tidak lagi menanggung biaya dan risiko tersebut.",
    "**Tidak menutup jalur lain.** Bila Debitor melunasi seluruh tagihan sebelum akta ditandatangani, penjualan dapat dihentikan. Kewenangan Kurator atas gugatan pembatalan dan tuntutan tanggung jawab direksi juga tetap utuh.",
    "**Akuntabel.** Setiap tahap dikendalikan penetapan Hakim Pengawas, didukung penilaian independen, dan terbuka bagi semua peminat, sehingga sulit dipersoalkan kreditor maupun Debitor.",
  ]),

  H("VIII.\tKESIMPULAN"),
  ...butirList([
    "Cessie atas hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) **dapat dilaksanakan secara sah** oleh Kurator dengan izin Hakim Pengawas, melalui akta notaris dan pemberitahuan kepada pihak yang berutang.",
    "Langkah ini **menguntungkan semua pihak**: kreditor memperoleh pembayaran, utang Debitor dan paparan tanggung jawab direksinya berkurang, dan Kurator memperoleh jalan pemberesan yang sah dan aman.",
    "Dibandingkan enam alternatif lain, penjualan paket dengan cessie melalui penawaran terbuka adalah **satu-satunya langkah yang sah, menghasilkan nilai nyata, dan dapat diselesaikan dalam waktu wajar**.",
    "Dengan biaya pelaksanaan sekitar Rp65–228 juta, perkiraan perolehan berkisar antara Rp0,9 miliar dan Rp12,3 miliar. Titik impas untuk melunasi seluruh kreditor sekitar Rp1,47 miliar. Nilai sebenarnya ditentukan oleh laporan KJPP dan hasil penawaran.",
  ]),

  H("IX.\tSARAN"),
  ...butirList([
    "Menyetujui penggunaan jalur penjualan paket dengan cessie sebagai arah pemberesan, dan menandatangani Surat 1 sampai dengan Surat 7 dalam Himpunan Konsep Surat.",
    "Menjadikan sikap tertulis Kanwil BPN Sumatera Utara sebagai syarat sebelum harga paket ditetapkan.",
    "Tetap membuka jalur setoran Debitor ke rekening harta pailit secara paralel.",
    "Sebelum telaah ini dikutip dalam dokumen resmi, mencocokkan kembali: ketentuan PP 18/2021 tentang kewajiban bekas pemegang HGU dan kedudukan prioritas; ada tidaknya Keputusan Presiden tentang ganti rugi menurut Pasal 18 ayat (2) PP 40/1996; serta bunyi Pasal 1334, 1436, dan 1533–1535 KUHPerdata dari terjemahan yang dipakai kantor.",
  ], { keepLast: true }),
  par("Demikian telaah hukum ini disampaikan sebagai bahan pertimbangan dan pengambilan keputusan.", 240, true),
  sign2(
    ["", "Mengetahui,", "Kepala Seksi Harta Peninggalan Wilayah II,", "", "", "", "Elsintha Damayanti"],
    ["Medan, ……………… 2026", "Tim Kurator PT Rata Makmur,", "Kurator Keperdataan Ahli Pertama,", "", "", "", "Shela Natasha"],
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
