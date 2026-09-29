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

// Tabel dengan kolom No di depan; awalan "1. " pada sel pertama dihapus
function tabelN(header, rows, widths, aligns) {
  const nr = rows.map((r, i) => { const cells = (r.cells || r).slice(); cells[0] = String(cells[0]).replace(/^\d+\.\s+/, ""); const out = [String(i + 1), ...cells]; return r.bold ? { cells: out, bold: true } : out; });
  return tabel(["No", ...header], nr, [500, ...widths], ["C", ...aligns]);
}
// Kotak bunyi pasal: judul tebal, bunyi rata kanan-kiri, latar abu muda, bingkai tipis
function pasal(judul, ...ayat) {
  const bd = { style: BorderStyle.SINGLE, size: 6, color: "7F7F7F" };
  return [new Table({ width: { size: 8628, type: WidthType.DXA }, columnWidths: [8628], indent: { size: 453, type: WidthType.DXA },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({ width: { size: 8628, type: WidthType.DXA },
      borders: { top: bd, bottom: bd, left: { style: BorderStyle.SINGLE, size: 24, color: "404040" }, right: bd },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" }, margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children: [
        new Paragraph({ children: runs(`**${judul}**`, { size: 20 }), spacing: { after: 60 }, keepNext: true }),
        ...ayat.map(t => {
          const sub = t.startsWith(">"); const s = sub ? t.slice(1) : t; const tab = s.includes("\t");
          const indent = sub ? { left: 851, hanging: 426 } : (tab ? { left: 426, hanging: 426 } : undefined);
          return new Paragraph({ children: runs(s, { size: 20 }), alignment: AlignmentType.JUSTIFIED, spacing: { line: 252, after: 40 }, indent,
            tabStops: tab ? [{ type: "left", position: sub ? 851 : 426 }] : undefined });
        }),
      ] })] })] }), new Paragraph({ children: [], spacing: { after: 100 } })];
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
  plain("**TELAAHAN HUKUM**", { align: AlignmentType.CENTER, run: { size: 24 } }),
  plain("**PENGALIHAN HAK TAGIH (CESSIE) ATAS HAK KEPERDATAAN**", { align: AlignmentType.CENTER }),
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
  isi("Meskipun tanahnya tidak dapat dijual, di atas tanah itu masih ada kebun kelapa sawit yang berproduksi, bangunan, dan benda milik PT Rata Makmur. Hukum pertanahan nasional menganut asas pemisahan horizontal, dan PP 40/1996 yang berlaku ketika HGU berakhir memberi bekas pemegang hak hak atas ganti rugi bila benda itu masih diperlukan untuk mengusahakan tanahnya. Di sisi lain, sejak putusan pailit kebun terus dipanen pihak lain tanpa hasilnya diserahkan kepada Kurator."),
  isi("Telaah ini menguji apakah hak-hak yang tersisa itu dapat diuangkan melalui pengalihan hak tagih (cessie), dan apakah langkah itu memang yang terbaik bagi semua pihak."),

  H("II.\tPERTANYAAN HUKUM"),
  ...butirList([
    "Apakah hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) dapat dialihkan oleh Kurator melalui cessie secara sah?",
    "Apa manfaat langkah tersebut bagi para Kreditor, Debitor, dan Kurator, dan berapa perkiraan biaya serta hasilnya?",
    "Mengapa cessie dalam satu paket penjualan merupakan langkah yang paling mungkin dan paling masuk akal?",
  ]),

  H("III.\tJAWABAN SINGKAT"),
  ...butirList([
    "**Dapat.** Kedua hak tersebut adalah tagihan yang bernilai uang. Kurator berwenang mengalihkannya, baik melalui lelang KPKNL (piutang adalah objek lelang menurut PMK 122/2023) maupun di bawah tangan dengan izin Hakim Pengawas, dan pengalihan itu mengikat pihak yang wajib membayar setelah diberitahukan kepadanya. Yurisprudensi Mahkamah Agung mendukung setiap unsurnya. Nilai ekonomisnya bergantung pada sikap BPN atas Pasal 81 ayat (2) Permen ATR/BPN 18/2021, sehingga sikap tertulis Kanwil BPN Sumatera Utara harus diperoleh sebelum harga ditetapkan.",
    "**Semua pihak diuntungkan.** Kreditor memperoleh pembayaran dari hak yang selama ini tidak dapat dicairkan, utang Debitor berkurang dan Debitor terbebas dari kewajiban pembongkaran, dan Kurator memperoleh jalan pemberesan yang sah dan aman. Dengan biaya sekitar Rp65 juta sampai dengan Rp228 juta, perkiraan hasilnya Rp0,9 miliar sampai dengan Rp12,3 miliar, dengan titik impas sekitar Rp1,33 miliar.",
    "**Paling masuk akal**, karena semua jalan lain terbentur hukum, waktu, atau biaya. Cessie kepada calon pemohon HGU baru mempertemukan hak ganti rugi dengan pihak yang kelak wajib membayarnya, sehingga nilainya dapat diuangkan sekarang.",
  ]),

  H("IV.\tFAKTA YANG RELEVAN"),
  tabelN(["Tanggal", "Peristiwa"], [
    ["31 Agustus 2013", "HGU Nomor 2/Sei Tampa atas nama PT Rata Makmur berakhir tanpa perpanjangan maupun pembaruan."],
    ["9 Agustus 2022", "PT Rata Makmur dinyatakan dalam PKPU Sementara atas permohonan eks karyawan."],
    ["10 April 2023", "PT Rata Makmur dinyatakan pailit, dan Balai Harta Peninggalan Medan diangkat sebagai Kurator."],
    ["8 dan 22 Mei 2023", "Kurator memblokir bidang tanah di Kantor Pertanahan Kabupaten Langkat dan melakukan sita umum."],
    ["22 Juni 2023", "Daftar Piutang Tetap disahkan sebesar Rp1.432.871.696,00."],
    ["12 Agustus 2024", "Kantor Pertanahan Kabupaten Langkat menerangkan bahwa HGU telah berakhir pada 31 Agustus 2013."],
    ["22 Agustus 2024", "PT Raya Padang Langkat menyatakan minat membeli secara tertulis."],
    ["10 Desember 2025", "Dalam Rapat Kreditor, Debitor menyatakan tidak ada aset lain dan berjanji menyetor dana paling lambat 18 Desember 2025. Janji itu tidak dipenuhi."],
    ["14 September 2026", "Rapat dengan kuasa hukum Debitor. Tagihan eks karyawan telah dibayar lunas, sehingga yang tersisa hanya tagihan KPP Pratama Binjai sebesar Rp1.108.581.903,00 yang belum dibayar sama sekali."],
    ["Saat ini", "Kebun masih berproduksi dan dipanen pihak lain. Tim khusus Kanwil BPN Sumatera Utara menangani status eks HGU dengan berpedoman pada PP 18/2021 dan Permen ATR/BPN 18/2021."],
  ], [1800, 6781], ["L", "J"]),
  jeda(),

  H("V.\tRINGKASAN DASAR HUKUM"),
  tabelN(["Peraturan", "Pokok ketentuan yang dipakai"], [
    ["UU 5/1960 (UUPA)", "Pasal 5 (hukum agraria ialah hukum adat, yang menganut asas pemisahan horizontal) dan Pasal 34 huruf a (HGU hapus karena jangka waktunya berakhir)."],
    ["UU 37/2004 tentang Kepailitan dan PKPU", "Pasal 21 (cakupan harta pailit), Pasal 24 ayat (1) (Debitor kehilangan hak mengurus hartanya), Pasal 16 dan 69 (kewenangan Kurator), Pasal 15 ayat (2) (Balai Harta Peninggalan selaku Kurator) dan ayat (3) (independensi), Pasal 72 (tanggung jawab Kurator), Pasal 77 (keberatan atas tindakan Kurator), Pasal 185 (cara penjualan harta pailit), dan Pasal 202 (berakhirnya kepailitan)."],
    ["PP 40/1996", "Pasal 17 (hapusnya HGU dan tanah menjadi tanah negara), Pasal 18 (kewajiban bekas pemegang hak dan hak atas ganti rugi), dan Pasal 4 ayat (4) (ganti kerugian dibebankan kepada pemegang HGU baru). Berlaku ketika HGU berakhir pada 2013; dicabut oleh PP 18/2021 sejak 2 Februari 2021."],
    ["PP 18/2021", "Pasal 22 (setelah HGU berakhir tanah kembali dikuasai negara, penataannya menjadi kewenangan Menteri, dan dapat diberikan prioritas kepada bekas pemegang hak), Pasal 32 (akibat hapusnya HGU), dan Pasal 103 (pencabutan PP 40/1996). PP ini tidak lagi memuat ketentuan ganti rugi seperti Pasal 18 ayat (2) PP 40/1996."],
    ["Permen ATR/BPN 18/2021", "Pasal 79 (tanah kembali menjadi Tanah Negara; prioritas bekas pemegang hak untuk memohon pemberian hak kembali) dan Pasal 81 (bila HGU tidak diberikan kembali, bangunan, benda, dan tanam tumbuh dikuasai langsung oleh Negara). Menjadi pedoman Kantor Pertanahan Kabupaten Langkat dan Kanwil BPN Sumatera Utara."],
    ["PMK 122/2023 tentang Petunjuk Pelaksanaan Lelang", "Pasal 1 angka 34 (risalah lelang adalah akta autentik), Pasal 3 huruf g (lelang eksekusi harta pailit), Pasal 5 huruf f (lelang hak tagih), dan Pasal 6 ayat (2) (hak tagih atau piutang adalah barang tidak berwujud yang dapat dilelang)."],
    ["KUHPerdata", "Pasal 511 (tagihan adalah benda bergerak), Pasal 613 (cara dan akibat cessie), Pasal 1334 ayat (1) (benda yang akan ada dapat menjadi pokok perjanjian), Pasal 1436 (percampuran utang), dan Pasal 1533 sampai dengan Pasal 1535 (tanggung jawab penjual piutang)."],
  ], [2300, 6281], ["L", "J"]),
  jeda(),


  H("VI.\tBUNYI PASAL YANG MENJADI DASAR"),
  isi("Bagian ini memuat bunyi asli ketentuan yang dirujuk dalam analisis. Setiap kutipan disalin kata demi kata dari naskah peraturan yang sumbernya dicantumkan pada akhir bagian ini. Tanda (...) menandai bagian pasal yang tidak dikutip karena tidak berkaitan dengan telaah ini."),

  Sub("A.\tUndang-Undang Nomor 5 Tahun 1960 tentang Peraturan Dasar Pokok-Pokok Agraria"),
  ...pasal("Pasal 5",
    "Hukum agraria yang berlaku atas bumi, air dan ruang angkasa ialah hukum adat, sepanjang tidak bertentangan dengan kepentingan nasional dan Negara, yang berdasarkan atas persatuan bangsa, dengan sosialisme Indonesia serta dengan peraturan-peraturan yang tercantum dalam Undang-undang ini dan dengan peraturan perundangan lainnya, segala sesuatu dengan mengindahkan unsur-unsur yang bersandar pada hukum agama."),
  ...pasal("Pasal 34",
    "Hak guna-usaha hapus karena",
    "a.\tjangka waktunya berakhir;",
    "(...)"),

  Sub("B.\tUndang-Undang Nomor 37 Tahun 2004 tentang Kepailitan dan Penundaan Kewajiban Pembayaran Utang"),
  ...pasal("Pasal 15",
    "(...)",
    "(2)\tDalam hal Debitor, Kreditor, atau pihak yang berwenang mengajukan permohonan pernyataan pailit sebagaimana dimaksud dalam Pasal 2 ayat (2), ayat (3), ayat (4), atau ayat (5) tidak mengajukan usul pengangkatan Kurator kepada Pengadilan maka Balai Harta Peninggalan diangkat selaku Kurator.",
    "(3)\tKurator yang diangkat sebagaimana dimaksud pada ayat (1) harus independen, tidak mempunyai benturan kepentingan dengan Debitor atau Kreditor, dan tidak sedang menangani perkara kepailitan dan penundaan kewajiban pembayaran utang lebih dari 3 (tiga) perkara.",
    "(...)"),
  ...pasal("Pasal 16",
    "(1)\tKurator berwenang melaksanakan tugas pengurusan dan/atau pemberesan atas harta pailit sejak tanggal putusan pailit diucapkan meskipun terhadap putusan tersebut diajukan kasasi atau peninjauan kembali.",
    "(...)"),
  ...pasal("Pasal 21",
    "Kepailitan meliputi seluruh kekayaan Debitor pada saat putusan pernyataan pailit diucapkan serta segala sesuatu yang diperoleh selama kepailitan."),
  ...pasal("Pasal 24",
    "(1)\tDebitor demi hukum kehilangan haknya untuk menguasai dan mengurus kekayaannya yang termasuk dalam harta pailit, sejak tanggal putusan pernyataan pailit diucapkan.",
    "(...)"),
  ...pasal("Pasal 69",
    "(1)\tTugas Kurator adalah melakukan pengurusan dan/atau pemberesan harta pailit.",
    "(...)"),
  ...pasal("Pasal 72",
    "Kurator bertanggung jawab terhadap kesalahan atau kelalaiannya dalam melaksanakan tugas pengurusan dan/atau pemberesan yang menyebabkan kerugian terhadap harta pailit."),
  ...pasal("Pasal 185",
    "(1)\tSemua benda harus dijual di muka umum sesuai dengan tata cara yang ditentukan dalam peraturan perundang-undangan.",
    "(2)\tDalam hal penjualan di muka umum sebagaimana dimaksud pada ayat (1) tidak tercapai maka penjualan di bawah tangan dapat dilakukan dengan izin Hakim Pengawas.",
    "(3)\tSemua benda yang tidak segera atau sama sekali tidak dapat dibereskan maka Kurator yang memutuskan tindakan yang harus dilakukan terhadap benda tersebut dengan izin Hakim Pengawas.",
    "(...)"),

  Sub("C.\tPeraturan Pemerintah Nomor 40 Tahun 1996 tentang Hak Guna Usaha, Hak Guna Bangunan dan Hak Pakai Atas Tanah"),
  isi("Peraturan ini berlaku ketika HGU Nomor 2/Sei Tampa berakhir pada 31 Agustus 2013. Peraturan ini kemudian dicabut oleh Pasal 103 PP 18/2021 sejak 2 Februari 2021 (lihat huruf D)."),
  ...pasal("Pasal 4",
    "(...)",
    "(4)\tDalam hal di atas tanah yang akan diberikan dengan Hak Guna Usaha itu terdapat tanaman dan/atau bangunan milik pihak lain yang keberadaannya berdasarkan alas hak yang sah, pemilik bangunan dan tanaman tersebut diberi ganti kerugian yang dibebankan pada pemegang Hak Guna Usaha baru.",
    "(5)\tKetentuan lebih lanjut mengenai pemberian ganti rugi sebagaimana dimaksud dalam ayat (4) ditetapkan dengan Keputusan Presiden."),
  ...pasal("Pasal 17",
    "(1)\tHak Guna Usaha hapus karena:",
    ">a.\tberakhirnya jangka waktu sebagaimana ditetapkan dalam keputusan pemberian atau perpanjangannya;",
    ">(...)",
    "(2)\tHapusnya Hak Guna Usaha sebagaimana dimaksud dalam ayat (1) mengakibatkan tanahnya menjadi tanah negara.",
    "(...)"),
  ...pasal("Pasal 18",
    "(1)\tApabila Hak Guna Usaha hapus dan tidak dapat diperpanjang atau diperbaharui, bekas pemegang hak wajib membongkar bangunan dan benda-benda yang ada di atas dan menyerahkan tanah dan tanaman yang ada di atas tanah bekas Hak Guna Usaha tersebut kepada Negara dalam batas waktu yang telah ditetapkan oleh Menteri.",
    "(2)\tApabila bangunan, tanaman dan benda-benda sebagaimana dimaksud dalam ayat (1) masih diperlukan untuk melangsungkan atau memulihkan pengusahaan tanahnya, maka kepada bekas pemegang hak diberikan ganti rugi yang bentuk dan jumlahnya diatur lebih lanjut dengan Keputusan Presiden;",
    "(3)\tPembongkaran bangunan dan benda-benda sebagaimana dimaksud pada ayat (1) dilaksanakan atas biaya bekas pemegang Hak Guna Usaha.",
    "(4)\tJika bekas pemegang Hak Guna Usaha lalai dalam memenuhi kewajiban sebagaimana dimaksud dalam ayat (3), maka bangunan dan benda-benda yang ada di atas tanah bekas Hak Guna Usaha itu dibongkar oleh Pemerintah atas biaya bekas pemegang hak."),
  ...pasal("Penjelasan Pasal 18 ayat (2)",
    "Ketentuan mengenai diperlukan atau tidaknya bangunan tersebut untuk melangsungkan atau memulihkan pengusahaan tanah Hak Guna Usaha dilakukan dengan memperhatikan kepentingan bekas pemegang Hak Guna Usaha dan pemegang hak yang baru."),

  Sub("D.\tPeraturan Pemerintah Nomor 18 Tahun 2021 tentang Hak Pengelolaan, Hak Atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah"),
  ...pasal("Pasal 22",
    "(1)\tHak guna usaha diberikan untuk jangka waktu paling lama 35 (tiga puluh lima) tahun, diperpanjang untuk jangka waktu paling lama 25 (dua puluh lima) tahun dan diperbarui untuk jangka waktu paling lama 35 (tiga puluh lima) tahun.",
    "(2)\tSetelah jangka waktu pemberian, perpanjangan, dan pembaruan sebagaimana dimaksud pada ayat (1) berakhir, Tanah hak guna usaha kembali menjadi Tanah yang Dikuasai Langsung oleh Negara atau tanah Hak Pengelolaan.",
    "(3)\tTanah yang Dikuasai Langsung oleh Negara sebagaimana dimaksud pada ayat (2), penataan kembali penggunaan, pemanfaatan, dan pemilikan menjadi kewenangan Menteri dan dapat diberikan prioritas kepada bekas pemegang hak dengan memperhatikan:",
    ">a.\ttanahnya masih diusahakan dan dimanfaatkan dengan baik sesuai dengan keadaan, sifat, dan tujuan pemberian hak;",
    ">b.\tsyarat-syarat pemberian hak dipenuhi dengan baik oleh pemegang hak;",
    ">c.\tpemegang hak masih memenuhi syarat sebagai pemegang hak;",
    ">d.\ttanahnya masih sesuai dengan rencana tata ruang;",
    ">e.\ttidak dipergunakan dan/atau direncanakan untuk kepentingan umum;",
    ">f.\tsumber daya alam dan lingkungan hidup; dan",
    ">g.\tkeadaan Tanah dan masyarakat sekitar."),
  ...pasal("Penjelasan Pasal 22 ayat (3)",
    "Setelah jangka waktu pemberian, perpanjangan, atau pembaruan berakhir, selanjutnya Menteri berwenang menata kembali penggunaan, pemanfaatan, dan pemilikan Tanah tersebut. Kewenangan Menteri dimaksudkan untuk mengatur kembali penggunaan, pemanfaatan, dan pemilikan Tanah sesuai dengan ketentuan peraturan perundang-undangan dengan tetap memberikan prioritas kepada bekas pemegang hak atau diberikan Hak Pengelolaan antara lain kepada Badan Bank Tanah. Apabila Tanah tidak diberikan kepada bekas pemegang hak maka akan diberitahukan terlebih dahulu."),
  ...pasal("Pasal 32",
    "(1)\tHapusnya hak guna usaha sebagaimana dimaksud dalam Pasal 31 di atas Tanah Negara, mengakibatkan:",
    ">a.\tTanah menjadi Tanah Negara; atau",
    ">b.\tsesuai dengan amar putusan pengadilan.",
    "(2)\tTanah Negara sebagaimana dimaksud pada ayat (1) huruf a, penataan kembali penggunaan, pemanfaatan, dan pemilikan selanjutnya menjadi kewenangan Menteri.",
    "(...)"),
  ...pasal("Pasal 103",
    "Pada saat Peraturan Pemerintah ini mulai berlaku:",
    "a.\tPeraturan Pemerintah Nomor 40 Tahun 1996 tentang Hak Guna Usaha, Hak Guna Bangunan dan Hak Pakai Atas Tanah (Lembaran Negara Republik Indonesia Tahun 1996 Nomor 58, Tambahan Lembaran Negara Republik Indonesia Nomor 3643);",
    "(...)",
    "dicabut dan dinyatakan tidak berlaku."),

  Sub("E.\tPeraturan Menteri Agraria dan Tata Ruang/Kepala Badan Pertanahan Nasional Nomor 18 Tahun 2021 tentang Tata Cara Penetapan Hak Pengelolaan dan Hak Atas Tanah"),
  ...pasal("Pasal 79",
    "(1)\tTanah Hak Guna Usaha kembali menjadi Tanah Negara atau tanah Hak Pengelolaan, dengan ketentuan:",
    ">a.\tjangka waktu Pemberian, Perpanjangan, dan Pembaruan berakhir;",
    ">b.\tjangka waktu Pemberian berakhir dan dalam jangka waktu paling lama 2 (dua) tahun tidak dimohonkan Pembaruan; atau",
    ">c.\tjangka waktu Perpanjangan berakhir dan dalam jangka waktu paling lama 2 (dua) tahun tidak dimohonkan Pembaruan.",
    "(2)\tTanah Negara sebagaimana dimaksud pada ayat (1), penataan kembali penggunaan, pemanfaatan, dan pemilikan menjadi kewenangan Menteri, untuk:",
    ">a.\tdiberikan prioritas kepada bekas pemegang hak untuk mengajukan permohonan pemberian hak kembali;",
    ">b.\tdiberikan kepada Badan Bank Tanah dengan Hak Pengelolaan; atau",
    ">c.\tdigunakan untuk keperluan kepentingan umum, reforma agraria, proyek strategis nasional; dan/atau cadangan negara lainnya sesuai dengan kebijakan Kementerian.",
    "(...)"),
  ...pasal("Pasal 81",
    "(1)\tDalam hal Hak Guna Usaha tidak diberikan kembali maka diberitahukan terlebih dahulu oleh:",
    ">a.\tMenteri melalui Kantor Pertanahan; atau",
    ">b.\tpemegang Hak Pengelolaan, dalam hal Hak Guna Usaha di atas Hak Pengelolaan.",
    "(2)\tDalam hal Hak Guna Usaha tidak diberikan kembali kepada bekas pemegang hak baik sebagian atau seluruhnya, maka bangunan beserta benda-benda maupun tanam tumbuh yang ada di atas tanah Hak Guna Usaha:",
    ">a.\tdikuasai langsung oleh Negara untuk Hak Guna Usaha di atas Tanah Negara; atau",
    ">b.\tsesuai dengan perjanjian pemanfaatan tanah dengan pemegang Hak Pengelolaan untuk Hak Guna Usaha di atas tanah Hak Pengelolaan.",
    "(...)"),

  Sub("F.\tPeraturan Menteri Keuangan Nomor 122 Tahun 2023 tentang Petunjuk Pelaksanaan Lelang"),
  ...pasal("Pasal 1",
    "Dalam Peraturan Menteri ini yang dimaksud dengan:",
    "1.\tLelang adalah penjualan barang yang terbuka untuk umum dengan penawaran harga secara tertulis dan/atau lisan yang semakin meningkat atau menurun untuk mencapai harga tertinggi, yang didahului dengan Pengumuman Lelang.",
    "2.\tBarang adalah tiap benda atau hak yang dapat dijual secara Lelang.",
    "(...)",
    "34.\tRisalah Lelang adalah berita acara pelaksanaan Lelang yang dibuat oleh Pejabat Lelang yang merupakan akta autentik dan mempunyai kekuatan pembuktian sempurna.",
    "(...)"),
  ...pasal("Pasal 3",
    "Lelang Eksekusi sebagaimana dimaksud dalam Pasal 2 ayat (2) huruf a terdiri atas:",
    "(...)",
    "g.\tLelang Eksekusi harta pailit;",
    "(...)"),
  ...pasal("Pasal 5",
    "Lelang Sukarela sebagaimana dimaksud dalam Pasal 2 ayat (1) huruf b terdiri atas:",
    "(...)",
    "f.\tLelang Sukarela hak tagih (piutang);",
    "(...)"),
  ...pasal("Pasal 6",
    "(1)\tObjek Lelang meliputi setiap Barang yang berwujud maupun tidak berwujud, bergerak maupun tidak bergerak, dapat dihabiskan maupun tidak dapat dihabiskan, yang dapat diperdagangkan, dipakai, dipergunakan, dimanfaatkan atau dinikmati serta mempunyai nilai ekonomis.",
    "(2)\tBarang tidak berwujud sebagaimana dimaksud pada ayat (1) meliputi Hak Menikmati Barang, hak tagih (piutang), hak atas kekayaan intelektual, hak siar/rilis, surat berharga, dan barang tidak berwujud lainnya sesuai ketentuan peraturan perundang-undangan.",
    "(...)"),

  Sub("G.\tKitab Undang-Undang Hukum Perdata"),
  ...pasal("Pasal 511",
    "Yang dianggap sebagai barang bergerak karena ditentukan undang-undang adalah:",
    "(...)",
    "3.\tperikatan dan tuntutan mengenai jumlah uang yang dapat ditagih atau mengenai barang bergerak;",
    "(...)"),
  ...pasal("Pasal 613",
    "Penyerahan piutang-piutang atas nama dan barang-barang lain yang tidak bertubuh, dilakukan dengan jalan membuat akta otentik atau di bawah tangan yang melimpahkan hak-hak atas barang-barang itu kepada orang lain. Penyerahan ini tidak ada akibatnya bagi yang berutang sebelum penyerahan itu diberitahukan kepadanya atau disetujuinya secara tertulis atau diakuinya. (...)"),
  ...pasal("Pasal 1334",
    "Barang yang baru ada pada waktu yang akan datang, dapat menjadi pokok suatu persetujuan. (...)"),
  ...pasal("Pasal 1436",
    "Bila kedudukan sebagai kreditur dan debitur berkumpul pada satu orang, maka terjadilah demi hukum suatu percampuran utang dan oleh sebab itu piutang dihapuskan."),
  ...pasal("Pasal 1533 sampai dengan Pasal 1535",
    "Pasal 1533: Penjualan suatu piutang meliputi segala sesuatu yang melekat padanya seperti penanggungan, hak istimewa dan hak hipotek.",
    "Pasal 1534: Barang siapa menjual suatu piutang atau suatu hak yang tak berwujud lainnya, harus menanggung hak-hak itu benar ada pada waktu diserahkan biar pun penjualan dilakukan tanpa janji penanggungan.",
    "Pasal 1535: Ia tidak bertanggung jawab atas kemampuan debitur kecuali jika ia mengikatkan dirinya untuk itu, tetapi dalam hal demikian pun ia hanya bertanggung jawab untuk jumlah harga pembelian yang telah diterimanya."),

  Sub("H.\tSumber naskah kutipan"),
  tabelN(["Peraturan", "Naskah yang dikutip"], [
    ["UU 5/1960", "Salinan pada JDIH Kementerian ATR/BPN (jdih.atrbpn.go.id), diunduh 29 September 2026."],
    ["UU 37/2004", "Naskah Lembaran Negara Tahun 2004 Nomor 131 yang dimuat Hukumonline (learning.hukumonline.com)."],
    ["PP 40/1996", "Salinan pada JDIH Kementerian ATR/BPN, diunduh 29 September 2026; status pada JDIH: tidak berlaku."],
    ["PP 18/2021", "Naskah Lembaran Negara Tahun 2021 Nomor 28 beserta Penjelasannya (Tambahan Lembaran Negara Nomor 6630)."],
    ["Permen ATR/BPN 18/2021", "Salinan pada JDIH Kementerian ATR/BPN, diunduh 29 September 2026."],
    ["PMK 122/2023", "Salinan pada JDIH Kementerian Keuangan (jdih.kemenkeu.go.id)."],
    ["KUHPerdata", "KUHPerdata tidak memiliki terjemahan resmi berbahasa Indonesia. Kutipan mengikuti terjemahan yang dimuat Hukumonline; bila dokumen ini dikutip dalam surat resmi, dapat disandingkan dengan terjemahan R. Subekti dan R. Tjitrosudibio."],
  ], [2300, 6281], ["L", "J"]),
  jeda(),
  H("VII.\tANALISIS"),
  Sub("A.\tApa yang sebenarnya masih dimiliki harta pailit"),
  isi("Langkah pertama adalah memisahkan tanah dari benda di atasnya. Menurut Pasal 34 huruf a UUPA jo. Pasal 17 PP 40/1996, HGU hapus karena jangka waktunya berakhir dan tanahnya menjadi tanah negara. Pasal 22 ayat (2) PP 18/2021 dan Pasal 79 ayat (1) Permen ATR/BPN 18/2021 menegaskan hal yang sama. Karena itu, pada 10 April 2023 tanah tersebut sudah bukan milik Debitor dan berada di luar harta pailit menurut Pasal 21 UU 37/2004. Sejalan dengan itu, Putusan MA Nomor 3350 K/Pdt/2020 menyatakan tanah eks HGU kembali kepada negara setelah jangka waktunya berakhir."),
  isi("Akan tetapi, hukum tanah nasional menganut asas pemisahan horizontal: bangunan dan tanaman bukan bagian dari tanah. Asas ini telah lama diterapkan Mahkamah Agung, antara lain dalam Putusan Nomor 123 K/Sip/1970, 286 K/Sip/1971, dan 3196 K/Pdt/1984, yang pada pokoknya menyatakan bahwa kepemilikan bangunan dapat berbeda dari kepemilikan tanah. Pasal 18 PP 40/1996 memberi bentuk konkret asas tersebut bagi HGU yang berakhir: bangunan, benda, dan tanaman yang masih diperlukan untuk melangsungkan pengusahaan tanah melahirkan hak atas ganti rugi bagi bekas pemegang hak. Pasal 4 ayat (4) peraturan yang sama membebankan ganti kerugian itu kepada pemegang HGU yang baru."),
  isi("PP 40/1996 memang telah dicabut oleh Pasal 103 PP 18/2021 sejak 2 Februari 2021. Namun akibat hukum suatu peristiwa diukur menurut peraturan yang berlaku ketika peristiwa itu terjadi. HGU ini berakhir pada 31 Agustus 2013, sehingga hak dan kewajiban bekas pemegang hak lahir berdasarkan Pasal 18 PP 40/1996. PP 18/2021 tidak memuat ketentuan peralihan yang menghapus hak yang telah lahir itu, dan Pasal 102 PP 18/2021 bahkan menyatakan peraturan pelaksanaan PP 40/1996 tetap berlaku sepanjang tidak bertentangan."),
  isi("Dengan demikian, yang masih dimiliki harta pailit adalah: (1) bangunan dan benda milik PT Rata Makmur; (2) hak atas ganti rugi atas bangunan, tanaman, dan benda tersebut; dan (3) hak menagih hasil kebun yang diterima sejak 10 April 2023, karena segala sesuatu yang diperoleh selama kepailitan termasuk harta pailit (Pasal 21) dan Debitor tidak lagi berwenang mengurusnya (Pasal 24 ayat (1))."),

  Sub("B.\tMengapa tanahnya tidak boleh dijual"),
  isi("Mahkamah Agung secara konsisten melarang Kurator membereskan benda yang bukan milik Debitor. Dalam Putusan Nomor 213 K/Pdt.Sus-Pailit/2013, objek yang bukan milik Debitor dinyatakan tidak termasuk harta pailit. SEMA Nomor 2 Tahun 2024 menegaskan kembali bahwa aset pihak ketiga tidak dapat dimasukkan sebagai harta pailit. Melanjutkan lelang tanah eks HGU berarti menjual milik negara, dengan risiko dibatalkan dan menimbulkan tanggung jawab Kurator menurut Pasal 72 UU 37/2004."),

  Sub("C.\tKetentuan Pasal 81 ayat (2) Permen ATR/BPN 18/2021"),
  isi("Pembacaan atas naskah asli Permen ATR/BPN 18/2021 menemukan ketentuan yang harus dihadapi secara terbuka. Pasal 81 ayat (2) menyatakan bahwa bila HGU tidak diberikan kembali kepada bekas pemegang hak, bangunan beserta benda-benda maupun tanam tumbuh di atas tanah HGU yang berada di atas Tanah Negara **dikuasai langsung oleh Negara**. Bila BPN menerapkan ketentuan ini tanpa pengakuan atas ganti rugi, nilai hak atas ganti rugi dapat menyusut."),
  isi("Ada tiga alasan mengapa ketentuan itu tidak menutup jalan cessie. **Pertama**, hak atas ganti rugi lahir pada 2013 berdasarkan Pasal 18 PP 40/1996, jauh sebelum Permen ini terbit, dan peraturan menteri tidak dapat menghapus hak keperdataan yang lahir berdasarkan peraturan pemerintah. **Kedua**, frasa \"dikuasai langsung oleh Negara\" mengatur penguasaan publik atas objek di atas tanah negara, dan tidak dengan sendirinya menghapus hak keperdataan bekas pemegang hak; Penjelasan Pasal 18 ayat (2) PP 40/1996 justru mengharuskan kepentingan bekas pemegang hak diperhatikan. **Ketiga**, Pasal 81 ayat (1) dan Penjelasan Pasal 22 ayat (3) PP 18/2021 mensyaratkan pemberitahuan terlebih dahulu bila tanah tidak diberikan kepada bekas pemegang hak, dan pemberitahuan semacam itu belum pernah diterima Kurator."),
  isi("Meskipun demikian, ketentuan ini menjadi alasan terkuat mengapa **sikap tertulis Kanwil BPN Sumatera Utara harus diperoleh sebelum harga paket ditetapkan**, dan mengapa pembelinya sebaiknya calon pemohon hak baru. Bila tanah diberikan kepada pembeli sebagai pihak yang menerima pelepasan prioritas, keadaan \"tidak diberikan kembali\" dalam Pasal 81 ayat (2) tidak terjadi terhadap pihak yang kini memegang hak keperdataan atas tanaman dan bangunan."),

  Sub("D.\tApakah hak-hak itu dapat dialihkan melalui cessie"),
  isi("Cessie adalah penyerahan piutang atas nama kepada pihak lain, yang diatur dalam Pasal 613 KUHPerdata. Keabsahannya diuji dengan lima syarat berikut.", 120, true),
  tabelN(["Syarat", "Pengujian", "Hasil"], [
    ["1. Objeknya tagihan yang dapat dialihkan", "Hak atas ganti rugi dan hak menagih hasil kebun adalah tagihan uang, yang oleh Pasal 511 KUHPerdata digolongkan sebagai benda bergerak. Hak atas ganti rugi masih bersyarat, tetapi Pasal 1334 ayat (1) KUHPerdata membolehkan benda yang baru akan ada menjadi pokok perjanjian, sepanjang dasarnya sudah ada (PP 40/1996) dan objeknya dapat ditentukan melalui inventarisasi dan penilaian. Tidak ada larangan undang-undang, dan hak itu tidak bersifat pribadi.", "Terpenuhi"],
    ["2. Pihak yang mengalihkan berwenang", "Debitor kehilangan hak mengurus hartanya sejak putusan pailit (Pasal 24 ayat (1) UU 37/2004), dan kewenangan itu ada pada Kurator (Pasal 16 dan 69). Karena hak tagih bersyarat tidak dapat dilelang secara wajar, Kurator memutuskan tindakannya dengan izin Hakim Pengawas (Pasal 185 ayat (3)).", "Terpenuhi dengan izin Hakim Pengawas"],
    ["3. Bentuk akta", "Pasal 613 ayat (1) KUHPerdata mensyaratkan akta otentik atau akta di bawah tangan. Bila dijual melalui lelang, risalah lelang yang dibuat pejabat lelang berkedudukan sebagai akta otentik. Bila dijual di bawah tangan, dibuat akta notaris agar pembuktiannya sempurna dan dapat dirujuk BPN.", "Terpenuhi"],
    ["4. Mengikat pihak yang wajib membayar", "Menurut Pasal 613 ayat (2) KUHPerdata, cessie berlaku terhadap pihak yang berutang setelah diberitahukan kepadanya atau diakuinya secara tertulis. Pemberitahuan ditujukan kepada BPN untuk hak ganti rugi, serta kepada Debitor dan pihak yang memanen untuk hak tagih hasil kebun.", "Terpenuhi setelah pemberitahuan"],
    ["5. Sejalan dengan hukum pertanahan dan asas kepailitan", "Tanah tidak ikut dialihkan dan kewenangan Menteri tidak dilangkahi. Hasilnya masuk rekening harta pailit dan dibagi menurut Daftar Piutang Tetap. Penawaran terbuka, penilaian KJPP, dan izin Hakim Pengawas menjaga independensi Kurator (Pasal 15 ayat (3)).", "Terpenuhi"],
  ], [2000, 5081, 1500], ["L", "J", "C"]),
  jeda(),
  isi("Yurisprudensi Mahkamah Agung memberi petunjuk praktis tentang cara melaksanakan cessie ini.", 120, true),
  tabelN(["Putusan", "Kaidah", "Pelajaran bagi Kurator"], [
    ["MA No. 48 K/Pdt/2000, 18 Oktober 2002", "Dalam jual beli piutang tidak ada aturan yang mengharuskan para pihak memberitahukan pengalihan kepada debitur agar peralihan itu sah di antara mereka.", "Hak beralih kepada pembeli sejak akta ditandatangani. Pemberitahuan tetap diperlukan agar pihak yang berutang terikat membayar kepada pembeli."],
    ["MA No. 125 PK/Pdt.Sus-Pailit/2015", "Mahkamah Agung membatalkan putusan sebelumnya karena peralihan piutang belum diberitahukan secara resmi kepada debitur melalui juru sita pengadilan.", "Pemberitahuan cessie sebaiknya tidak hanya melalui surat, tetapi juga disampaikan secara resmi melalui juru sita Pengadilan Niaga agar tidak dapat dibantah."],
    ["MA No. 1809 K/Pdt/2007, 28 Januari 2008", "Utang debitur tetap ada meskipun kreditur telah mengalihkan piutangnya kepada pihak lain.", "Pihak yang memanen kebun tidak terbebas dari kewajibannya karena hak tagih dijual; kewajiban itu kini ditagih oleh pembeli."],
    ["MA No. 1771 K/Pdt/2019", "Bekas pemegang hak yang menguasai objek secara terus-menerus tetap memperoleh hak prioritas meskipun haknya berakhir (perkara HGB).", "Prioritas memang hidup setelah hak berakhir, tetapi ukurannya penguasaan sendiri. Karena kebun dikuasai pihak lain, prioritas lebih tepat dilepaskan kepada pembeli daripada dipakai Kurator."],
  ], [2100, 3300, 3181], ["L", "J", "J"]),
  jeda(),

  Sub("E.\tCessie dapat dilaksanakan melalui lelang"),
  isi("Pengalihan hak tagih tidak harus melalui penjualan di bawah tangan. PMK 122/2023 tentang Petunjuk Pelaksanaan Lelang menyebut hak tagih (piutang) secara tegas sebagai barang tidak berwujud yang dapat menjadi objek lelang (Pasal 6 ayat (2)), dan menggolongkan lelang harta pailit sebagai lelang eksekusi (Pasal 3 huruf g). Karena itu, hak atas ganti rugi dan hak menagih hasil kebun dapat dilelang bersama bangunan dan benda dalam satu paket melalui KPKNL Medan sebagai lelang eksekusi harta pailit atas permohonan Kurator."),
  isi("Jalur lelang justru paling sejalan dengan Pasal 185 ayat (1) UU 37/2004 yang mewajibkan harta pailit dijual di muka umum. Risalah lelang yang dibuat pejabat lelang merupakan akta autentik yang mempunyai kekuatan pembuktian sempurna (Pasal 1 angka 34 PMK 122/2023), sehingga syarat bentuk dalam Pasal 613 ayat (1) KUHPerdata terpenuhi tanpa akta notaris tersendiri. Pemberitahuan kepada pihak yang berutang tetap wajib dilakukan menurut Pasal 613 ayat (2), sebaiknya melalui juru sita."),
  isi("Dengan demikian urutan pemberesan yang dianjurkan adalah: **pertama**, lelang paket melalui KPKNL dengan nilai limit dari laporan KJPP; **kedua**, bila lelang tidak laku, penjualan di bawah tangan dengan izin Hakim Pengawas (Pasal 185 ayat (2)), melalui penawaran terbuka kepada para peminat. Pasal 185 ayat (3) tetap tersedia sebagai dasar bila Hakim Pengawas menilai hak tagih bersyarat tidak dapat dibereskan secara wajar melalui lelang. Pelepasan kedudukan prioritas tidak dilelang sebagai objek, tetapi dinyatakan dalam syarat lelang sebagai tindakan yang akan dilakukan Kurator setelah pemenang membayar lunas."),

  Sub("F.\tKedudukan prioritas menurut Pasal 22 PP 18/2021 dan Pasal 79 Permen ATR/BPN 18/2021"),
  isi("Pasal 22 ayat (3) PP 18/2021 menetapkan bahwa penataan kembali tanah bekas HGU menjadi kewenangan Menteri, dan prioritas **dapat** diberikan kepada bekas pemegang hak dengan memperhatikan antara lain apakah tanahnya masih diusahakan dengan baik, apakah syarat pemberian hak dipenuhi, dan apakah pemegang hak masih memenuhi syarat. Kata \"dapat\" menunjukkan bahwa prioritas adalah pertimbangan kebijakan, bukan hak yang dapat dituntut atau dijual. Pasal 79 ayat (2) huruf a Permen ATR/BPN 18/2021 memperjelas isinya, yaitu prioritas **untuk mengajukan permohonan pemberian hak kembali**, di samping pilihan lain berupa Badan Bank Tanah, kepentingan umum, reforma agraria, atau proyek strategis nasional."),
  isi("Kurator tidak menggunakan prioritas itu untuk memohon HGU baru atas nama PT Rata Makmur, karena syaratnya lemah (kebun dikuasai pihak lain dan perseroan dalam pailit), biayanya besar, dan tugas Kurator adalah membereskan, bukan melanjutkan usaha. Yang dilakukan Kurator adalah **melepaskan** kedudukan prioritas itu dengan izin Hakim Pengawas sebagai bagian dari paket, sehingga calon pemohon HGU baru tidak terhalang. Pelepasan inilah yang memberi nilai tambah bagi pembeli."),

  Sub("G.\tMengapa pembeli yang paling tepat adalah calon pemohon HGU baru"),
  isi("Pasal 4 ayat (4) PP 40/1996 membebankan ganti kerugian atas tanaman dan bangunan milik bekas pemegang hak kepada pemegang HGU baru. PP 18/2021 tidak lagi memuat ketentuan serupa, sehingga pembebanan itu kini bergantung pada syarat yang ditetapkan BPN dalam keputusan pemberian hak baru. Karena itu, menjual hak atas ganti rugi kepada calon pemohon HGU baru adalah cara paling aman: bila BPN mensyaratkan ganti rugi, pembeli sekaligus menjadi pihak yang berhak dan pihak yang wajib membayar, sehingga kewajiban itu hapus karena percampuran utang (Pasal 1436 KUHPerdata); bila tidak, pembeli tetap memperoleh tanaman dan bangunan yang ia perlukan untuk mengusahakan tanah."),
  isi("Dalam kedua keadaan itu, **pembeli membayar nilai tanaman dan bangunan di muka kepada harta pailit**. Tidak ada pembayaran ganda, tidak ada sengketa antara Kurator dan pemegang hak baru, dan harta pailit tidak perlu menunggu proses penataan tanah yang memakan waktu."),

  Sub("H.\tRisiko hukum dan cara mengatasinya"),
  tabelN(["Risiko", "Cara mengatasi"], [
    ["BPN menerapkan Pasal 81 ayat (2) Permen ATR/BPN 18/2021 dan menganggap tanaman serta bangunan dikuasai langsung oleh Negara tanpa ganti rugi.", "Meminta sikap tertulis Kanwil BPN Sumatera Utara sebelum harga ditetapkan, dengan menguraikan dasar Pasal 18 PP 40/1996 dan asas bahwa hak yang lahir pada 2013 tidak hapus karena peraturan yang terbit kemudian. Bila sikap BPN negatif, harga paket disesuaikan atau hak ganti rugi ditagih langsung kepada negara."],
    ["BPN menilai bangunan atau tanaman tidak lagi diperlukan, sehingga hak ganti rugi tidak timbul.", "Meminta sikap tertulis BPN sebelum harga ditetapkan dan menjual dalam kondisi apa adanya. Kurator hanya menjamin adanya hak (Pasal 1534 KUHPerdata), bukan kemampuan pihak yang berutang membayar (Pasal 1535)."],
    ["Tanah ditata untuk Bank Tanah, kepentingan umum, atau reforma agraria (Pasal 79 ayat (2) huruf b dan c Permen ATR/BPN 18/2021), bukan untuk pemohon swasta. RUU Pengaturan Reforma Agraria yang disetujui DPR pada September 2026 dapat memperkuat kemungkinan ini.", "Menjadikannya titik keputusan: bila demikian, hak ganti rugi ditagih kepada negara dan tidak dijual kepada swasta. Memantau pengundangan dan ketentuan peralihan undang-undang tersebut."],
    ["Pihak yang memanen menolak membayar hasil kebun.", "Risiko penagihan beralih kepada pembeli yang telah memperhitungkannya dalam harga. Pemberitahuan disampaikan melalui juru sita sesuai Putusan MA No. 125 PK/Pdt.Sus-Pailit/2015."],
    ["Kreditor atau Debitor menilai harga terlalu rendah.", "Nilai KJPP menjadi nilai limit, disertai lelang terbuka atau penawaran terbuka dan izin Hakim Pengawas. Keberatan tetap dapat diajukan menurut Pasal 77 UU 37/2004."],
    ["Pembeli ternyata terafiliasi dengan Debitor atau pihak yang memanen.", "Surat pernyataan tidak terafiliasi dengan sanksi pembatalan, serta pemeriksaan akta pendirian dan susunan pengurus pembeli."],
    ["Kelak ada kewajiban membongkar bangunan.", "Beban pembongkaran dialihkan kepada pembeli dalam akta."],
  ], [3400, 5181], ["J", "J"]),
  jeda(),

  H("VIII.\tMANFAAT BAGI PARA PIHAK"),
  tabelN(["Pihak", "Manfaat"], [
    ["Kreditor (KPP Pratama Binjai, satu-satunya kreditor yang belum dibayar)", "Memperoleh pembayaran atas tagihan pajak dari hak yang selama ini bernilai nol bagi harta pailit. Pembayaran terjadi dalam hitungan bulan, bukan menunggu penataan tanah atau perkara bertahun-tahun. Biaya penagihan tidak mengurangi harta pailit karena risikonya beralih kepada pembeli, dan tidak ada risiko lelang dibatalkan yang dapat memaksa pengembalian hasil pembagian."],
    ["Debitor (PT Rata Makmur dan direksinya)", "Sisa utang berkurang sebesar hasil yang dibagikan, sehingga beban yang tetap melekat setelah kepailitan berakhir ikut berkurang. Paparan tanggung jawab tanggung renteng direksi menurut Pasal 104 ayat (2) UU 40/2007 menyusut. Debitor terbebas dari kewajiban membongkar bangunan menurut Pasal 18 PP 40/1996, dan nilai kebun yang pernah dibangunnya dihargai. Bila hasilnya melampaui titik impas, seluruh tagihan lunas, kepailitan dapat berakhir (Pasal 202 UU 37/2004), kelebihannya dikembalikan kepada Debitor, dan jalan rehabilitasi terbuka."],
    ["Kurator (BHP Medan)", "Memiliki jalan pemberesan yang sah dan didukung penetapan Hakim Pengawas, sehingga risiko tanggung jawab menurut Pasal 72 UU 37/2004 terkendali. Terhindar dari lelang atas benda yang bukan milik Debitor. Tidak perlu menguasai atau mengelola kebun secara fisik, sehingga risiko keamanan di lokasi berkurang. Perkara yang berjalan sejak 2023 dapat diselesaikan, mendukung pengendalian Risiko 15.1 dalam Dokumen Manajemen Risiko BHP Medan, dan setiap langkah terdokumentasi."],
    ["Negara dan calon pemegang hak baru", "Status keperdataan di atas tanah menjadi bersih sebelum hak baru diberikan: tidak ada klaim ganti rugi yang tertunda dan tidak ada kedudukan prioritas yang menghalangi."],
  ], [2200, 6381], ["L", "J"]),
  jeda(),

  H("IX.\tESTIMASI BIAYA DAN PEROLEHAN"),
  isi("**Seluruh angka pada bagian ini adalah perkiraan untuk perencanaan, bukan nilai.** Data umur tanaman, luas tertanam, dan isi kontrak panen belum tersedia, sehingga perkiraan disusun dari asumsi yang dinyatakan terbuka. Nilai yang sah ditentukan oleh laporan KJPP dan hasil penawaran terbuka."),
  Sub("A.\tBiaya pelaksanaan"),
  tabel(["No", "Komponen", "Dasar perkiraan", "Kisaran (Rp)"], [
    ["1", "Panjar biaya penyegelan oleh juru sita", "Biaya pelaksanaan juru sita ke Kabupaten Langkat sesuai ketetapan Pengadilan Negeri Medan.", "3.000.000 s.d. 7.500.000"],
    ["2", "Pengukuran atau plotting bidang oleh Kantah Langkat", "Batas bawah untuk plotting dan pengembalian batas; batas atas untuk pengukuran penuh ± 389 Ha menurut tarif PNBP pertanahan (PP 128/2015). Perlu dikonfirmasi ke Kantah.", "15.000.000 s.d. 95.000.000"],
    ["3", "Jasa penilaian KJPP", "Penilaian bangunan, tanaman ± 340 Ha, dan hak tagih.", "25.000.000 s.d. 75.000.000"],
    ["4", "Operasional lapangan dan koordinasi", "Perjalanan, uang harian, dan konsumsi sesuai Standar Biaya Masukan, tanpa pembayaran di luar ketentuan.", "10.000.000 s.d. 20.000.000"],
    ["5", "Pengumuman lelang atau penawaran terbuka", "Iklan di surat kabar; bea lelang bagian pembeli ditanggung pembeli.", "5.000.000 s.d. 15.000.000"],
    ["6", "Pengumuman daftar pembagian", "Iklan di surat kabar.", "5.000.000 s.d. 10.000.000"],
    ["7", "Surat-menyurat dan pengiriman", "Pos tercatat dan penggandaan berkas.", "2.000.000 s.d. 5.000.000"],
    ["8", "Akta notaris", "Ditanggung pembeli menurut pokok-pokok akta.", "0"],
    TOT("", "Jumlah biaya pelaksanaan", "", "65.000.000 s.d. 227.500.000"),
    ["", "PNBP imbalan jasa Kurator 7% dari DPT", "Penugasan Hakim Pengawas 10 Desember 2025, dikurangi bagian yang telah dipotong tahun 2025.", "± 100.301.019"],
  ], [500, 2600, 4131, 1850], ["C", "L", "J", "R"]),
  jeda(),
  isi("Sebagian biaya (juru sita, pengukuran, dan KJPP) harus dibayar sebelum ada hasil penjualan, sedangkan rekening harta pailit belum memiliki saldo yang cukup. Pembiayaannya dapat ditempuh dengan meminta calon pembeli menanggung biaya penilaian dan pengukuran sebagai syarat penawaran yang diperhitungkan dalam harga, atau meminta Debitor menyetor biaya pemberesan sesuai komitmennya dalam rapat 14 September 2026."),
  Sub("B.\tAsumsi perolehan"),
  tabelN(["Asumsi", "Konservatif", "Moderat", "Optimis", "Keterangan"], [
    ["Luas tertanam efektif", "250 Ha", "300 Ha", "338 Ha", "Dari 338,7463 Ha, dikurangi emplasemen, jalan, dan areal kosong."],
    ["Nilai ganti rugi tanaman per Ha", "Rp5 juta", "Rp15 juta", "Rp40 juta", "Rendah bila tanaman asal tahun 1990-an yang telah lewat umur ekonomis; tinggi bila telah diremajakan."],
    ["Bangunan dan benda", "Rp100 juta", "Rp300 juta", "Rp500 juta", "Menunggu hasil inventarisasi."],
    ["Potongan kondisi apa adanya dan risiko", "40%", "30%", "20%", "Risiko sikap BPN, penguasaan fisik, dan pembongkaran."],
    ["Nilai kontrak panen per Ha per tahun", "Rp1 juta", "Rp2 juta", "Rp3 juta", "Selama ± 3,5 tahun sejak 10 April 2023."],
    ["Harga hak tagih hasil kebun dibanding nilai klaim", "10%", "20%", "30%", "Potongan besar karena sulit ditagih."],
  ], [2100, 1300, 1100, 1100, 2981], ["L", "C", "C", "C", "J"]),
  jeda(),
  Sub("C.\tPerkiraan perolehan dan pembagian"),
  tabelN(["Uraian (Rp)", "Konservatif", "Moderat", "Optimis"], [
    ["Nilai tanaman (luas × nilai per Ha)", "1.250.000.000", "4.500.000.000", "13.520.000.000"],
    ["Paket tanaman dan bangunan setelah potongan", "810.000.000", "3.360.000.000", "11.216.000.000"],
    ["Nilai klaim hasil kebun", "875.000.000", "2.100.000.000", "3.549.000.000"],
    ["Harga hak tagih hasil kebun", "87.500.000", "420.000.000", "1.064.700.000"],
    TOT("Perkiraan harga paket", "897.500.000", "3.780.000.000", "12.280.700.000"),
    ["Dikurangi biaya pelaksanaan", "(65.000.000)", "(120.000.000)", "(227.500.000)"],
    ["Dikurangi PNBP 7% dari DPT", "(100.301.019)", "(100.301.019)", "(100.301.019)"],
    TOT("Tersedia untuk kreditor", "732.198.981", "3.559.698.981", "11.952.898.981"),
    ["Dibayar kepada KPP Pratama Binjai", "732.198.981", "1.108.581.903", "1.108.581.903"],
    TOT("Tagihan yang tidak terbayar", "376.382.922", "0", "0"),
    TOT("Sisa yang dikembalikan kepada Debitor", "0", "2.451.117.078", "10.844.317.078"),
  ], [3081, 1800, 1800, 1900], ["L", "R", "R", "R"]),
  jeda(),
  isi("**Titik impas** adalah harga paket sekitar **Rp1,33 miliar**, yaitu tagihan KPP Pratama Binjai (Rp1.108.581.903), PNBP (± Rp100,3 juta), dan biaya pelaksanaan (± Rp120 juta). Bila harga penawaran terbaik mencapai angka itu, tagihan pajak lunas, seluruh kreditor telah dibayar penuh, dan kelebihannya dikembalikan kepada Debitor."),
  isi("Bahkan pada skenario konservatif, cessie menghasilkan sekitar Rp730 juta, atau kurang lebih dua pertiga tagihan KPP Pratama Binjai. Tanpa cessie, hasilnya nol. Faktor penentu terbesar adalah umur dan kondisi tanaman, sehingga inventarisasi harus mencatat tahun tanam per blok, dan nilai limit penawaran ditetapkan dari laporan KJPP."),

  H("X.\tMENGAPA INI LANGKAH YANG PALING MUNGKIN DAN MASUK AKAL"),
  isi("Setiap alternatif diuji dengan ukuran yang sama: dasar hukum, peluang memperoleh nilai, waktu, serta biaya dan risiko bagi harta pailit.", 120, true),
  tabelN(["Alternatif", "Dasar hukum", "Peluang nilai", "Waktu", "Biaya dan risiko", "Penilaian"], [
    ["1. Lelang tanah eks HGU (rencana 2024)", "Tidak ada; tanah bukan harta pailit.", "Nol; lelang dapat dibatalkan.", "-", "Tinggi (Pasal 72).", "Tidak layak"],
    ["2. Lelang terpisah per objek (bangunan sendiri, hak tagih sendiri)", "Ada (Pasal 185 ayat (1)).", "Rendah; hak tagih yang dipisah sulit laku, dan bangunan dinilai sebagai bongkaran.", "Menengah", "Sedang.", "Kurang layak"],
    ["3. Kurator menagih sendiri ganti rugi", "Ada.", "Tidak pasti; pemegang hak baru belum ada.", "Sangat lama", "Tinggi; perkara dibiayai harta pailit.", "Kurang layak"],
    ["4. Kurator memohon HGU baru dan mengelola kebun", "Lemah; syarat prioritas tidak terpenuhi.", "Tidak pasti.", "Lama", "Sangat tinggi; modal dan keamanan.", "Tidak layak"],
    ["5. Menunggu Debitor membayar", "Ada.", "Bergantung pada kemauan Debitor; janji Desember 2025 gagal.", "Tidak pasti", "Rendah.", "Tidak dapat diandalkan sendiri"],
    ["6. Mengakhiri kepailitan tanpa pemberesan hak ini", "Ada (Pasal 18).", "Nol bagi kreditor.", "Cepat", "Rendah.", "Membuang nilai"],
    TOT("7. Penjualan satu paket dengan cessie melalui lelang KPKNL, atau di bawah tangan bila lelang tidak laku", "Ada (Pasal 185 UU 37/2004; PMK 122/2023; Pasal 613 KUHPerdata).", "Nyata; ada peminat dan kebun produktif.", "± 4 sampai 5 bulan", "Rendah; risiko beralih kepada pembeli.", "Paling layak"),
  ], [1700, 1500, 1750, 1150, 1231, 1250], ["L", "L", "L", "C", "L", "C"]),
  jeda(),
  isi("Kesimpulan perbandingan itu bertumpu pada empat alasan. **Pertama**, hanya jalur ini yang sah sekaligus menghasilkan uang: jalur lain yang sah tidak menghasilkan nilai wajar, sedangkan jalur yang tampak bernilai (lelang tanah) tidak sah. **Kedua**, nilai hak ganti rugi hanya dapat dicairkan oleh pihak yang akan mengusahakan tanah, dan cessie mempertemukan keduanya. **Ketiga**, syarat pasarnya sudah ada: kebun produktif, peminat tertulis, dan BPN sedang menangani statusnya. **Keempat**, risiko lapangan, penagihan, dan pembongkaran berpindah kepada pembeli yang paling mampu menanggungnya, sementara jalur setoran Debitor tetap terbuka."),

  H("XI.\tKESIMPULAN"),
  ...butirList([
    "Cessie atas hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) **dapat dilaksanakan secara sah** oleh Kurator melalui lelang KPKNL atau, bila tidak laku, di bawah tangan dengan izin Hakim Pengawas (Pasal 185 UU 37/2004, Pasal 6 ayat (2) PMK 122/2023, dan Pasal 613 KUHPerdata). Nilainya bergantung pada sikap BPN atas Pasal 81 ayat (2) Permen ATR/BPN 18/2021.",
    "Langkah ini **menguntungkan semua pihak**. Dengan biaya sekitar Rp65 juta sampai dengan Rp228 juta, hasilnya diperkirakan Rp0,9 miliar sampai dengan Rp12,3 miliar, dengan titik impas sekitar Rp1,33 miliar.",
    "Dibandingkan enam alternatif lain, penjualan satu paket dengan cessie, melalui lelang atau bila tidak laku di bawah tangan, adalah **satu-satunya langkah yang sah, menghasilkan nilai nyata, dan dapat diselesaikan dalam waktu wajar**.",
  ]),

  H("XII.\tSARAN"),
  ...butirList([
    "Menyetujui penjualan satu paket dengan cessie sebagai arah pemberesan, dengan urutan lelang melalui KPKNL Medan terlebih dahulu dan penjualan di bawah tangan bila lelang tidak laku, serta menandatangani Surat 1 sampai dengan Surat 7 dalam Himpunan Konsep Surat.",
    "Menjadikan sikap tertulis Kanwil BPN Sumatera Utara sebagai syarat sebelum harga paket ditetapkan, termasuk penegasan atas penerapan Pasal 81 ayat (2) Permen ATR/BPN 18/2021 dan pengakuan hak ganti rugi berdasarkan Pasal 18 PP 40/1996.",
    "Menyampaikan pemberitahuan cessie secara resmi melalui juru sita Pengadilan Niaga, di samping surat Kurator, sesuai pelajaran Putusan MA No. 125 PK/Pdt.Sus-Pailit/2015.",
    "Tetap membuka jalur setoran Debitor ke rekening harta pailit secara paralel.",
    "Sebelum dikutip dalam dokumen resmi, mengunduh salinan lengkap putusan yang dirujuk dari Direktori Putusan Mahkamah Agung, serta memantau pengundangan UU Pengaturan Reforma Agraria.",
  ], { keepLast: true }),
  par("Demikian telaahan hukum ini disampaikan sebagai bahan pertimbangan dan pengambilan keputusan.", 240, true),
];

const doc = new Document({
  creator: "Balai Harta Peninggalan Medan",
  title: "Telaahan Hukum Cessie Hak Keperdataan PT Rata Makmur",
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  numbering,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 737, right: 1361, bottom: 737, left: 1474, header: 400, footer: 400 } } },
    children: doc_,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || "telaah_hukum.docx", b); console.log("wrote"); });
