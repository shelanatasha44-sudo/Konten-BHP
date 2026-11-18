package id.bhpmedan.jurnalsimpeg;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Intent;
import android.graphics.Path;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mengisi Jurnal Harian di aplikasi SIMPEG KUMHAM dengan mengetuk layar, langkah demi langkah:
 * Beranda → Kinerja → tab Jurnal Harian → tombol + → form (SKP, Tanggal, Kegiatan, Jam Mulai,
 * Jam Selesai, Jumlah) → SIMPAN. Setiap layar dikenali dari teksnya, jadi tidak bergantung pada
 * posisi tombol. Bila satu langkah macet, isi layar direkam ke log supaya bisa diperbaiki.
 */
public class LayananIsi extends AccessibilityService {
    static volatile LayananIsi aktif;

    private static final String[] LANGKAH = { "SKP", "TANGGAL", "KEGIATAN", "JAM_MULAI", "JAM_SELESAI", "JUMLAH", "SIMPAN", "TUNGGU" };
    private static final long JEDA_AKSI = 850, BATAS_LANGKAH = 18000;
    private static final String[] BULAN = { "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember" };

    private final Handler h = new Handler(Looper.getMainLooper());
    private boolean jalan, simpan, formAktif;
    private JSONArray daftar;
    private int idx, langkah, sub, coba, berhasil, ulang, ulangForm;
    private long sejakHilang, sejakMuat, tabTerakhir;
    private android.os.PowerManager.WakeLock kunciLayar;
    private String tanggal, pkg;
    private long sejakLangkah, aksiTerakhir, sejakDikenal, rekamTerakhir, bukaTerakhir;

    private final Runnable detak = new Runnable() {
        public void run() {
            if (!jalan) return;
            try { langkahkan(); } catch (Exception e) { gagal("Galat: " + e); }
            if (jalan) h.postDelayed(this, 450);
        }
    };

    // ---------- siklus hidup ----------
    @Override protected void onServiceConnected() { aktif = this; Catatan.tulis(this, "Layanan aksesibilitas tersambung."); }
    @Override public boolean onUnbind(Intent i) { aktif = null; jalan = false; return super.onUnbind(i); }
    @Override public void onInterrupt() {}

    @Override public void onAccessibilityEvent(AccessibilityEvent e) {
        if (!Catatan.pref(this).getBoolean("rekam", false) || e == null || e.getPackageName() == null) return;
        String p = Catatan.pref(this).getString("paket", "simpeg.kemenkumham.mobile");
        if (!p.contentEquals(e.getPackageName())) return;
        long now = System.currentTimeMillis();
        if (e.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || now - rekamTerakhir > 2500) {
            rekamTerakhir = now;
            Catatan.tulis(this, "REKAM layar (" + AccessibilityEvent.eventTypeToString(e.getEventType()) + "):\n" + pohon());
        }
    }

    boolean sedangJalan() { return jalan; }

    /** Mulai mengisi. Hasil null = berhasil dimulai, selain itu pesan galat. */
    String mulai(String tanggal, JSONArray daftar, boolean simpan, String pkg) {
        if (jalan) return "Pengisian sedang berjalan.";
        if (daftar.length() == 0) return "Tidak ada kegiatan untuk tanggal ini.";
        this.tanggal = tanggal; this.daftar = daftar; this.simpan = simpan; this.pkg = pkg;
        idx = 0; berhasil = 0; lewati = 0; ulangForm = 0; sejakHilang = 0; formAktif = false; jalan = true; beres = new boolean[daftar.length()];
        mulaiLangkah(0); sejakMuat = 0;
        sejakDikenal = System.currentTimeMillis();
        try {   // layar tetap menyala selama mengisi (maks. 30 menit), supaya tidak terkunci di tengah jalan
            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(POWER_SERVICE);
            kunciLayar = pm.newWakeLock(android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK | android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP, "jurnalsimpeg:isi");
            kunciLayar.acquire(30 * 60 * 1000L);
        } catch (Exception ex) { kunciLayar = null; }
        Catatan.tulis(this, "MULAI " + tanggal + " (" + daftar.length() + " kegiatan, " + (simpan ? "simpan" : "UJI tanpa simpan") + ")");
        h.postDelayed(detak, 2500);
        return null;
    }

    void hentikan(String alasan) {
        if (!jalan) return;
        jalan = false;
        h.removeCallbacks(detak);
        try { if (kunciLayar != null && kunciLayar.isHeld()) kunciLayar.release(); } catch (Exception ex) {}
        kunciLayar = null;
        Catatan.tulis(this, "BERHENTI: " + alasan);
    }

    /** Tandai lengkap setiap tanggal yang semua kegiatannya sudah tersimpan atau sudah ada. */
    private void tandaiLengkap() {
        if (!simpan || daftar == null || beres == null) return;
        java.util.Map<String, Boolean> per = new java.util.LinkedHashMap<String, Boolean>();
        for (int i = 0; i < daftar.length(); i++) {
            String t = daftar.optJSONObject(i).optString("tanggal", tanggal);
            per.put(t, (per.containsKey(t) ? per.get(t) : true) && beres[i]);
        }
        android.content.SharedPreferences.Editor ed = Catatan.pref(this).edit();
        for (java.util.Map.Entry<String, Boolean> m : per.entrySet()) if (m.getValue()) ed.putBoolean("lengkap:" + m.getKey(), true);
        ed.apply();
    }

    private void gagal(String alasan) {
        tandaiLengkap();   // tanggal yang sudah tuntas sebelum gagal tetap tercatat lengkap
        Catatan.tulis(this, "GAGAL (" + (idx + 1) + "/" + daftar.length() + ", langkah " + (formAktif ? LANGKAH[langkah] : "navigasi") + "): " + alasan + "\nIsi layar saat gagal:\n" + pohon());
        hentikan(alasan);
        Catatan.beritahu(this, 2, "Jurnal SIMPEG berhenti", alasan + " Buka aplikasi Jurnal SIMPEG → Bagikan log bila perlu diperbaiki.", null);
    }

    private void selesai(String pesan) {
        hentikan(pesan);
        tandaiLengkap();
        Catatan.beritahu(this, 2, "Jurnal SIMPEG", pesan, null);
    }

    private int lewati;

    private void mulaiLangkah(int l) { langkah = l; sub = 0; coba = 0; ulang = 0; sejakLangkah = System.currentTimeMillis(); }
    private void lanjutLangkah() { mulaiLangkah(langkah + 1); }
    private boolean sabar() { return System.currentTimeMillis() - aksiTerakhir < JEDA_AKSI; }
    private void tandaiAksi() { aksiTerakhir = System.currentTimeMillis(); }

    private JSONObject entri() throws Exception { return daftar.getJSONObject(idx); }
    /** Tanggal kegiatan yang sedang diisi (daftar bisa berisi beberapa tanggal, mis. susulan masa tutup). */
    private String tgl() { try { return entri().optString("tanggal", tanggal); } catch (Exception e) { return tanggal; } }
    private boolean[] beres;

    // ---------- mesin langkah ----------
    private void langkahkan() throws Exception {
        if (sabar()) return;
        AccessibilityNodeInfo akar = akar();
        List<AccessibilityNodeInfo> n = kumpulkan(akar);
        String layar = semuaTeks(n);
        long now = System.currentTimeMillis();

        if (cocok(layar, "\\bmasuk\\b") && cocok(layar, "kata sandi|\\bnip\\b") && !cocok(layar, "kinerja")) {
            gagal("Aplikasi SIMPEG meminta login. Login dulu, lalu tekan Mulai lagi.");
            return;
        }
        if (formAktif) { langkahForm(n, layar); return; }

        boolean form = cocok(layar, "tambah jurnal harian|pilih skp");
        if (form) { formAktif = true; mulaiLangkah(0); Catatan.tulis(this, "Form terbuka untuk kegiatan " + (idx + 1)); return; }

        if (cocok(layar, "signed in") && cocok(layar, "\\bhome\\b")) {                 // menu samping terbuka: pilih Kinerja
            sejakDikenal = now;
            AccessibilityNodeInfo k = cari(n, "^\\s*kinerja\\s*$");
            if (k != null) ketuk(k); else performGlobalAction(GLOBAL_ACTION_BACK);
            tandaiAksi(); return;
        }
        AccessibilityNodeInfo tabJurnal = cari(n, "^\\s*jurnal harian(\\s+tab\\s+\\d+\\s+of\\s+\\d+)?\\s*$");
        if (tabJurnal != null && cocok(layar, "\\bskp\\b")) {                         // layar Kinerja
            sejakDikenal = now;
            boolean daftarTampak = false;
            for (AccessibilityNodeInfo x : n) if (cocok(teks(x), "tanggal mulai") && dalamLayar(x)) { daftarTampak = true; break; }
            if (!tabJurnal.isSelected() && !daftarTampak) {                           // masih di tab SKP → pindah ke tab Jurnal Harian
                if (now - tabTerakhir > 2500) { tabTerakhir = now; ketuk(tabJurnal); }
                return;
            }
            if (cocok(layar, "loading")) {                                             // tunggu daftar selesai dimuat (maks. 20 detik)
                if (sejakMuat == 0) sejakMuat = now;
                if (now - sejakMuat < 20000) return;
            } else sejakMuat = 0;
            JSONObject e = entri();
            if (cocok(layar, Pattern.quote(tanggalPanjang(tgl()))) && memuat(layar, e.getString("uraian"))) {
                Catatan.tulis(this, "Sudah ada, dilewati: " + tgl() + " " + e.getString("uraian"));
                beres[idx] = true; lewati++; idx++;
                if (idx >= daftar.length()) selesai(ringkasan());
                return;
            }
            AccessibilityNodeInfo fab = cariFab(n);
            if (fab == null) { if (now - sejakLangkah > 30000) gagal("Tombol + (tambah jurnal) tidak ditemukan."); return; }
            sejakMuat = 0; ketuk(fab); return;
        }
        if (cocok(layar, "kinerja") && cocok(layar, "absensi|profil|dossier|cuti")) {     // Beranda
            sejakDikenal = now;
            AccessibilityNodeInfo k = cari(n, "^\\s*kinerja\\s*$");
            if (k != null) { ketuk(k); return; }
        }
        if (akar == null || akar.getPackageName() == null || !pkg.contentEquals(akar.getPackageName())) {
            if (now - bukaTerakhir > 6000) {
                bukaTerakhir = now;
                Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
                if (i != null) { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); }
            }
        } else if (now - sejakDikenal > 7000 && now - sejakDikenal < 9000) {
            performGlobalAction(GLOBAL_ACTION_BACK); tandaiAksi();                         // layar tak dikenal: coba kembali
        }
        if (now - sejakDikenal > 30000) gagal("Layar SIMPEG tidak dikenali (bukan Beranda, Kinerja, atau Jurnal Harian).");
    }

    private void langkahForm(List<AccessibilityNodeInfo> n, String layar) throws Exception {
        JSONObject e = entri();
        long now = System.currentTimeMillis();
        boolean dlgTgl = cocok(layar, "select date|pilih tanggal|enter date|masukkan tanggal");
        boolean dlgJam = cocok(layar, "select time|pilih waktu|enter time|masukkan waktu|pilih jam");
        boolean formTampak = cocok(layar, "tambah jurnal harian");
        boolean dlgSkp = !dlgTgl && !dlgJam && ((cocok(layar, "lain-?lain") && cocok(layar, "tugas tambahan") && cocok(layar, "kreati[fv]itas"))
                || (!formTampak && (cari(n, "^\\s*\\d+\\.\\s+\\S") != null || cari(n, "^\\s*(\\d+\\.\\s*)?lain-?lain\\s*$") != null)));
        // Form bisa tertutup sendiri (mis. gagal memuat SKP). Bila begitu, buka ulang form untuk kegiatan yang sama.
        if (!formTampak && !dlgSkp && !dlgTgl && !dlgJam && !"TUNGGU".equals(LANGKAH[langkah])) {
            if (sejakHilang == 0) { sejakHilang = now; return; }
            if (now - sejakHilang < 4000) return;
            if (ulangForm++ >= 3) { gagal("Form Tambah Jurnal Harian tertutup sendiri berulang kali."); return; }
            Catatan.tulis(this, "Form tertutup sebelum selesai, dibuka ulang untuk kegiatan " + (idx + 1));
            formAktif = false; sejakHilang = 0; sejakDikenal = now; mulaiLangkah(0);
            return;
        }
        sejakHilang = 0;
        if (cocok(layar, "^\\s*loading\\s*$|\\nloading\\n|memuat")) { if (now - sejakLangkah > 30000) gagal("SIMPEG terus LOADING."); return; }
        if (now - sejakLangkah > BATAS_LANGKAH) { gagal("Langkah " + LANGKAH[langkah] + " tidak selesai dalam " + (BATAS_LANGKAH / 1000) + " detik."); return; }

        switch (LANGKAH[langkah]) {
            case "SKP": {
                if (dlgSkp) {
                    AccessibilityNodeInfo opsi = pilihSkp(n, "Lain-Lain".equalsIgnoreCase(e.optString("skp")));
                    if (opsi == null) {                                          // pilihan di bawah: gulir daftar
                        AccessibilityNodeInfo g = null;
                        for (AccessibilityNodeInfo x : n) if (x.isScrollable() && tampak(x)) { g = x; break; }
                        if (g != null && coba++ < 6) { g.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD); tandaiAksi(); return; }
                        gagal("Pilihan SKP tidak ditemukan di daftar."); return;
                    }
                    ketuk(opsi); sub = 1; return;
                }
                if (sub == 1) {
                    if (!cocok(layar, "pilih skp")) { lanjutLangkah(); return; }
                    sub = 0;                                                     // belum terpilih: buka lagi
                }
                boolean lain = "Lain-Lain".equalsIgnoreCase(e.optString("skp"));
                AccessibilityNodeInfo f = cari(n, "pilih skp");
                if (f == null) {
                    f = tombolSkp(n);
                    if (f != null && sub == 0) {                                 // pilihan sebelumnya masih terpasang dan sudah cocok
                        String t = teks(f);
                        if (lain ? cocok(t, "^\\s*(\\d+\\.\\s*)?lain-?lain\\s*$") : !cocok(t, "lain-?lain|pilih")) { lanjutLangkah(); return; }
                    }
                }
                if (f != null) ketuk(f);
                return;
            }
            case "TANGGAL": {
                if (dlgTgl) {
                    AccessibilityNodeInfo ok = cari(n, "^\\s*(ok|oke|pilih|simpan|set)\\s*$");
                    if (sub == 3) { if (ok != null) { ketuk(ok); sub = 4; } return; }  // tanggal sudah dipilih → OK
                    AccessibilityNodeInfo isian = pertamaYangBisaDiisi(n);
                    if (isian != null) {                                         // mode ketik
                        String hint = teks(isian).toLowerCase(Locale.ROOT);
                        String fmt = (hint.contains("dd/mm") || hint.contains("hh/bb")) ? "dd/MM/yyyy" : "MM/dd/yyyy";
                        isiTeks(isian, new SimpleDateFormat(fmt, Locale.US).format(isoKeDate(tgl())));
                        tandaiAksi(); sub = 3; return;
                    }
                    AccessibilityNodeInfo hari = cariHari(n, tgl());           // mode kalender: "16, Monday, November 16, 2026"
                    if (hari != null) { ketuk(hari); sub = 3; return; }
                    int arah = arahBulan(n, tgl());
                    if (arah != 0 && coba++ < 24) {
                        AccessibilityNodeInfo g = tombolBulan(n, arah);
                        if (g != null) { ketuk(g); return; }
                    }
                    AccessibilityNodeInfo pendek = cari(n, "^\\s*" + Integer.parseInt(tgl().substring(8)) + "\\s*(,|$)");
                    if (pendek != null) { ketuk(pendek); sub = 3; return; }
                    if (hariIni().equals(tgl()) && ok != null) { ketuk(ok); sub = 4; return; }
                    AccessibilityNodeInfo ubah = cari(n, "switch to input|beralih ke input|mode input|^\\s*edit\\s*$|^\\s*ubah\\s*$");
                    if (ubah != null && sub < 2) { ketuk(ubah); sub = 2; }
                    return;
                }
                AccessibilityNodeInfo f = cariIsian(n, "tanggal", false);
                if (f == null) f = cari(n, "^\\s*tanggal\\b");
                if (sub == 4) {                                                  // periksa tanggal di form
                    String isi = f == null ? "" : teks(f);
                    if (isi.contains(tgl()) || !cocok(isi, "\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}")) { lanjutLangkah(); return; }
                    if (ulang++ >= 2) { gagal("Tanggal di form (" + isi + ") tidak sama dengan " + tgl() + "."); return; }
                    sub = 0;
                }
                if (f != null) { ketuk(f); sub = 1; }
                return;
            }
            case "KEGIATAN": {
                AccessibilityNodeInfo f = cariIsian(n, "kegiatan", true);
                if (f == null) return;
                if (memuat(teks(f), e.getString("uraian"))) { lanjutLangkah(); return; }
                if (coba++ > 2) { gagal("Kolom Kegiatan tidak mau diisi."); return; }
                ketukKlik(f); isiTeks(f, e.getString("uraian")); tandaiAksi();
                return;
            }
            case "JAM_MULAI":
            case "JAM_SELESAI": {
                boolean mulai = "JAM_MULAI".equals(LANGKAH[langkah]);
                String[] jm = e.getString(mulai ? "jamMulai" : "jamSelesai").split(":");
                if (dlgJam) { isiDialogJam(n, layar, jm); return; }
                AccessibilityNodeInfo f = cariIsian(n, mulai ? "jam mulai" : "jam selesai", false);
                if (f == null) f = cari(n, mulai ? "jam mulai" : "jam selesai");
                if (sub == 9) {
                    String isi = f == null ? "" : teks(f);
                    if (isi.contains(jm[0] + ":" + jm[1])) { lanjutLangkah(); return; }
                    if (ulang++ >= 2) { gagal("Jam di form (" + isi + ") tidak sama dengan " + jm[0] + ":" + jm[1] + "."); return; }
                    sub = 0;
                }
                if (f != null) { ketuk(f); sub = 1; }
                return;
            }
            case "JUMLAH": {
                AccessibilityNodeInfo f = cariIsian(n, "jumlah", false);
                if (f == null) { gagal("Kolom Jumlah Diselesaikan tidak ditemukan."); return; }
                String v = e.optString("volume", "1");
                String isi = f.getText() == null ? "" : f.getText().toString().trim();
                if (isi.equals(v)) { lanjutLangkah(); return; }
                if (coba++ > 2) { gagal("Kolom Jumlah tidak mau diisi."); return; }
                ketukKlik(f); isiTeks(f, v); tandaiAksi();
                return;
            }
            case "SIMPAN": {
                if (!simpan) {
                    Catatan.tulis(this, "UJI selesai: form terisi untuk \"" + e.getString("uraian") + "\" (tidak disimpan).");
                    hentikan("Uji selesai.");
                    Catatan.beritahu(this, 2, "Uji Jurnal SIMPEG", "Form terisi tanpa disimpan. Periksa isinya, lalu tekan SIMPAN sendiri atau kembali untuk membatalkan.", null);
                    return;
                }
                AccessibilityNodeInfo s = cari(n, "^\\s*simpan\\s*$");
                if (s == null) { gagal("Tombol SIMPAN tidak ditemukan."); return; }
                ketuk(s); lanjutLangkah();
                return;
            }
            case "TUNGGU": {
                AccessibilityNodeInfo keg = cariIsian(n, "kegiatan", true);
                boolean dikosongkan = cocok(layar, "tambah jurnal harian") && keg != null && !memuat(teks(keg), e.getString("uraian"));
                if (!cocok(layar, "tambah jurnal harian|pilih skp") || dikosongkan) {
                    berhasil++; beres[idx] = true;
                    AccessibilityNodeInfo pesan = cari(n, "berhasil|sukses|tersimpan|disimpan");
                    if (pesan != null) Catatan.tulis(this, "SIMPEG: " + teks(pesan));
                    Catatan.tulis(this, "✓ Tersimpan " + tgl() + " " + e.getString("jamMulai") + "–" + e.getString("jamSelesai") + " " + e.getString("uraian"));
                    String kunci = "selesai:" + tgl();
                    Catatan.pref(this).edit().putString(kunci, Catatan.pref(this).getString(kunci, "") + (idx + 1) + ",").apply();
                    formAktif = dikosongkan;                                     // form masih terbuka → kegiatan berikutnya langsung diisi
                    idx++; ulangForm = 0; mulaiLangkah(0); sejakDikenal = now;
                    if (idx >= daftar.length()) selesai(ringkasan());
                    return;
                }
                if (now - sejakLangkah > 9000) {
                    AccessibilityNodeInfo salah = cari(n, "gagal|harus|wajib|error|tidak (dapat|bisa|boleh)|ditutup|melebihi");
                    gagal("SIMPEG belum menerima simpanan" + (salah != null ? ": " + teks(salah) : "."));
                }
                return;
            }
        }
    }

    private void isiDialogJam(List<AccessibilityNodeInfo> n, String layar, String[] jm) {
        AccessibilityNodeInfo ok = cari(n, "^\\s*(ok|oke|pilih|simpan|set)\\s*$");
        int jam24 = Integer.parseInt(jm[0]), mn = Integer.parseInt(jm[1]);
        boolean ampm = cari(n, "^\\s*AM\\s*$") != null && cari(n, "^\\s*PM\\s*$") != null;
        int jam = ampm ? (jam24 % 12 == 0 ? 12 : jam24 % 12) : jam24;
        if (sub == 6) { if (ok != null) { ketuk(ok); sub = 9; } return; }

        // Mode jam (roda): "Select hours 20" / "Select minutes 20" dinaikkan/diturunkan satu per satu
        AccessibilityNodeInfo sj = null, sm = null;
        for (AccessibilityNodeInfo x : n) {
            if (x.isEditable() || !tampak(x)) continue;
            String t = teks(x);
            if (sj == null && cocok(t, "select hours?|pilih jam") && angkaAkhir(t) >= 0) sj = x;
            if (sm == null && cocok(t, "select minutes?|pilih menit") && angkaAkhir(t) >= 0) sm = x;
        }
        if (sj != null && sm != null) {
            int vj = angkaAkhir(teks(sj)), vm = angkaAkhir(teks(sm));
            if (coba++ > 8 && sub != 2) {                                 // roda tidak bergerak: pindah ke mode ketik
                AccessibilityNodeInfo ketik = tombolTanpaLabelKiri(n);
                if (ketik != null) { ketuk(ketik); sub = 2; return; }
            }
            if (ampm ? vj % 12 != jam % 12 : vj != jam) { geser(sj, vj, jam, ampm ? 12 : 24); tandaiAksi(); return; }
            if (vm != mn) { geser(sm, vm, mn, 60); tandaiAksi(); return; }
            if (ampm) { AccessibilityNodeInfo ap = cari(n, jam24 < 12 ? "^\\s*AM\\s*$" : "^\\s*PM\\s*$"); if (ap != null && !ap.isSelected()) { ketuk(ap); return; } }
            sub = 6; return;
        }
        // Mode ketik: kolom jam & menit
        List<AccessibilityNodeInfo> isian = semuaYangBisaDiisi(n);
        if (isian.size() >= 2) {
            String h = (jam < 10 ? "0" : "") + jam, m = jm[1];
            if (teks(isian.get(0)).startsWith(h) && teks(isian.get(1)).startsWith(m)) { sub = 6; return; }
            isiTeks(isian.get(0), h); isiTeks(isian.get(1), m);
            tandaiAksi(); return;
        }
    }

    /** Angka terakhir dalam teks, mis. "Select hours 20" → 20; -1 bila tidak ada. */
    private static int angkaAkhir(String t) {
        Matcher m = Pattern.compile("(\\d{1,2})\\D*$").matcher(t);
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }
    /** Naikkan/turunkan nilai roda (jam atau menit) ke tujuan lewat jalur terpendek, maks. 15 langkah per detak. */
    private static void geser(AccessibilityNodeInfo x, int dari, int ke, int putaran) {
        int maju = ((ke - dari) % putaran + putaran) % putaran;
        boolean naik = maju <= putaran / 2;
        int langkah = Math.min(naik ? maju : putaran - maju, 15);
        for (int i = 0; i < langkah; i++)
            x.performAction(naik ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
    }

    /** Tombol SKP di form: tombol yang bisa diklik di atas kolom Tanggal (bukan tombol menu). */
    private static AccessibilityNodeInfo tombolSkp(List<AccessibilityNodeInfo> n) {
        AccessibilityNodeInfo tg = cariIsian(n, "tanggal", false);
        if (tg == null) return null;
        Rect rt = new Rect(); tg.getBoundsInScreen(rt);
        for (AccessibilityNodeInfo x : n) {
            if (!x.isClickable() || x.isEditable() || !tampak(x) || teks(x).length() == 0 || cocok(teks(x), "navigation|menu")) continue;
            Rect b = new Rect(); x.getBoundsInScreen(b);
            if (b.bottom <= rt.top + 5 && b.top > rt.top - 400) return x;
        }
        return null;
    }

    /** Tombol ikon tanpa label di baris yang sama dengan Cancel/Batal, di sebelah kirinya. */
    private static AccessibilityNodeInfo tombolTanpaLabelKiri(List<AccessibilityNodeInfo> n) {
        AccessibilityNodeInfo batal = cari(n, "^\\s*(cancel|batal)\\s*$");
        if (batal == null) return null;
        Rect r = new Rect(); batal.getBoundsInScreen(r);
        for (AccessibilityNodeInfo x : n) {
            if (!x.isClickable() || !tampak(x) || teks(x).length() > 0) continue;
            Rect b = new Rect(); x.getBoundsInScreen(b);
            if (b.centerY() >= r.top && b.centerY() <= r.bottom && b.right <= r.left) return x;
        }
        return null;
    }

    // ---------- pemilih tanggal ----------
    private static final String[] MONTH = { "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" };
    /** Tombol hari di kalender, berlabel mis. "16, Monday, November 16, 2026" atau "Senin, 16 November 2026". */
    private static AccessibilityNodeInfo cariHari(List<AccessibilityNodeInfo> n, String iso) {
        String en = new SimpleDateFormat("MMMM d, yyyy", Locale.US).format(isoKeDate(iso));
        return cari(n, "(^|\\D)(" + Pattern.quote(en) + "|" + Pattern.quote(tanggalPanjang(iso)) + ")");
    }
    /** -1 bila tanggal tujuan ada di bulan sebelum bulan yang tampil, 1 bila sesudahnya, 0 bila sama/tak diketahui. */
    private static int arahBulan(List<AccessibilityNodeInfo> n, String iso) {
        int tujuan = Integer.parseInt(iso.substring(0, 4)) * 12 + Integer.parseInt(iso.substring(5, 7)) - 1;
        Pattern en = Pattern.compile("(" + String.join("|", MONTH) + ") \\d{1,2}, (\\d{4})");
        Pattern id = Pattern.compile("\\d{1,2} (" + String.join("|", BULAN) + ") (\\d{4})");
        for (AccessibilityNodeInfo x : n) {
            if (!tampak(x)) continue;
            String t = teks(x);
            Matcher m = en.matcher(t); String[] nama = MONTH;
            if (!m.find()) { m = id.matcher(t); nama = BULAN; if (!m.find()) continue; }
            int b = java.util.Arrays.asList(nama).indexOf(m.group(1));
            return Integer.compare(tujuan, Integer.parseInt(m.group(2)) * 12 + b);
        }
        return 0;
    }
    /** Tombol bulan sebelumnya/berikutnya: dari labelnya, atau dua ikon tanpa label di kanan "Select year". */
    private static AccessibilityNodeInfo tombolBulan(List<AccessibilityNodeInfo> n, int arah) {
        AccessibilityNodeInfo lbl = cari(n, arah < 0 ? "previous month|bulan sebelumnya" : "next month|bulan berikutnya");
        if (lbl != null) return lbl;
        AccessibilityNodeInfo th = cari(n, "select year|pilih tahun");
        if (th == null) return null;
        Rect r = new Rect(); th.getBoundsInScreen(r);
        AccessibilityNodeInfo kiri = null, kanan = null; int xk = Integer.MAX_VALUE, xn = -1;
        for (AccessibilityNodeInfo x : n) {
            if (!x.isClickable() || !tampak(x) || teks(x).length() > 0) continue;
            Rect b = new Rect(); x.getBoundsInScreen(b);
            if (b.centerY() < r.top || b.centerY() > r.bottom || b.left < r.right) continue;
            if (b.left < xk) { xk = b.left; kiri = x; }
            if (b.left > xn) { xn = b.left; kanan = x; }
        }
        return arah < 0 ? kiri : kanan;
    }

    private String ringkasan() {
        return tanggal.replace(",", ", ") + ": " + berhasil + " kegiatan tersimpan" + (lewati > 0 ? ", " + lewati + " sudah ada" : "") + ".";
    }

    // ---------- pencarian simpul ----------
    private AccessibilityNodeInfo akar() {
        AccessibilityNodeInfo r = getRootInActiveWindow();
        if (r != null) return r;
        List<AccessibilityWindowInfo> w = getWindows();
        for (AccessibilityWindowInfo x : w) if (x.getRoot() != null && x.getType() == AccessibilityWindowInfo.TYPE_APPLICATION) return x.getRoot();
        return null;
    }

    private static List<AccessibilityNodeInfo> kumpulkan(AccessibilityNodeInfo akar) {
        List<AccessibilityNodeInfo> hasil = new ArrayList<AccessibilityNodeInfo>();
        if (akar != null) jelajah(akar, hasil, 0);
        return hasil;
    }
    private static void jelajah(AccessibilityNodeInfo n, List<AccessibilityNodeInfo> hasil, int d) {
        if (n == null || d > 45) return;
        hasil.add(n);
        for (int i = 0; i < n.getChildCount(); i++) jelajah(n.getChild(i), hasil, d + 1);
    }

    static String teks(AccessibilityNodeInfo n) {
        StringBuilder s = new StringBuilder();
        if (n.isPassword()) return "(kolom kata sandi)";   // isi kata sandi tidak pernah dibaca atau direkam
        if (n.getText() != null) s.append(n.getText()).append(' ');
        if (n.getContentDescription() != null) s.append(n.getContentDescription()).append(' ');
        if (Build.VERSION.SDK_INT >= 26 && n.getHintText() != null) s.append(n.getHintText()).append(' ');
        return s.toString().trim();
    }
    private static String semuaTeks(List<AccessibilityNodeInfo> n) {
        StringBuilder s = new StringBuilder();
        for (AccessibilityNodeInfo x : n) { String t = teks(x); if (t.length() > 0) s.append(t).append('\n'); }
        return s.toString();
    }
    private static boolean cocok(String s, String regex) {
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(s).find();
    }
    private static String kunci(String s) {
        String k = s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
        return k.length() > 40 ? k.substring(0, 40) : k;
    }
    private static boolean memuat(String layar, String uraian) {
        return (" " + layar.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ") + " ").contains(kunci(uraian));
    }
    /** Simpul berada di layar yang terlihat (halaman tab lain berkoordinat di luar layar). */
    private boolean dalamLayar(AccessibilityNodeInfo n) {
        Rect r = new Rect(); n.getBoundsInScreen(r);
        int lebar = getResources().getDisplayMetrics().widthPixels;
        return tampak(n) && r.left >= 0 && r.left < lebar - 10;
    }
    private static boolean tampak(AccessibilityNodeInfo n) {
        Rect r = new Rect(); n.getBoundsInScreen(r);
        return n.isVisibleToUser() && r.width() > 0 && r.height() > 0;
    }
    private static AccessibilityNodeInfo cari(List<AccessibilityNodeInfo> n, String regex) {
        Pattern p = Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        for (AccessibilityNodeInfo x : n) { String t = teks(x); if (t.length() > 0 && tampak(x) && p.matcher(t).find()) return x; }
        return null;
    }
    private static List<AccessibilityNodeInfo> semuaYangBisaDiisi(List<AccessibilityNodeInfo> n) {
        List<AccessibilityNodeInfo> h = new ArrayList<AccessibilityNodeInfo>();
        for (AccessibilityNodeInfo x : n) if (x.isEditable() && tampak(x)) h.add(x);
        return h;
    }
    private static AccessibilityNodeInfo pertamaYangBisaDiisi(List<AccessibilityNodeInfo> n) {
        List<AccessibilityNodeInfo> h = semuaYangBisaDiisi(n);
        return h.isEmpty() ? null : h.get(0);
    }
    /** Kolom isian berlabel tertentu; label Flutter bisa ada di simpul itu sendiri atau tepat sebelumnya. */
    private static AccessibilityNodeInfo cariIsian(List<AccessibilityNodeInfo> n, String label, boolean bolehBanyakBaris) {
        Pattern p = Pattern.compile(label, Pattern.CASE_INSENSITIVE);
        for (int i = 0; i < n.size(); i++) {
            AccessibilityNodeInfo x = n.get(i);
            if (!x.isEditable() || !tampak(x)) continue;
            if (p.matcher(teks(x)).find()) return x;
            for (int j = i - 1; j >= Math.max(0, i - 3); j--) if (p.matcher(teks(n.get(j))).find() && !n.get(j).isEditable()) return x;
        }
        if (bolehBanyakBaris) for (AccessibilityNodeInfo x : n) if (x.isEditable() && x.isMultiLine() && tampak(x)) return x;
        return null;
    }
    private AccessibilityNodeInfo pilihSkp(List<AccessibilityNodeInfo> n, boolean lainLain) {
        if (lainLain) return cari(n, "^\\s*(\\d+\\.\\s*)?lain-?lain\\s*$");
        String pilihan = Catatan.pref(this).getString("teksSkp", "");
        if (pilihan.length() > 0) { AccessibilityNodeInfo x = cari(n, Pattern.quote(pilihan)); if (x != null) return x; }
        AccessibilityNodeInfo satu = cari(n, "^\\s*1\\.\\s+\\S");
        if (satu != null) return satu;
        for (AccessibilityNodeInfo x : n) {
            String t = teks(x);
            if (tampak(x) && t.length() > 15 && !cocok(t, "lain-?lain|tugas tambahan|kreati[fv]itas|pilih skp")) return x;
        }
        return null;
    }
    /** Tombol + mengambang: dicari dari labelnya, atau tombol kecil yang paling kanan-bawah. */
    private static AccessibilityNodeInfo cariFab(List<AccessibilityNodeInfo> n) {
        AccessibilityNodeInfo x = cari(n, "^\\s*\\+\\s*$|^\\s*(tambah|add|create)\\b");
        if (x != null) return x;
        AccessibilityNodeInfo terbaik = null; int skor = -1;
        for (AccessibilityNodeInfo y : n) {
            if (!y.isClickable() || !tampak(y) || teks(y).length() > 0) continue;   // FAB = ikon tanpa label
            Rect r = new Rect(); y.getBoundsInScreen(r);
            if (r.width() > 320 || r.height() > 320 || r.top < 1000) continue;     // bukan tombol menu di atas
            if (r.bottom + r.right > skor) { skor = r.bottom + r.right; terbaik = y; }
        }
        return terbaik;
    }

    // ---------- aksi ----------
    private void ketuk(AccessibilityNodeInfo n) {
        tandaiAksi();
        AccessibilityNodeInfo k = n;
        for (int i = 0; i < 6 && k != null && !k.isClickable(); i++) k = k.getParent();
        if (k != null && k.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return;
        Rect r = new Rect(); n.getBoundsInScreen(r);
        Path p = new Path(); p.moveTo(r.exactCenterX(), r.exactCenterY());
        dispatchGesture(new GestureDescription.Builder().addStroke(new GestureDescription.StrokeDescription(p, 0, 80)).build(), null, null);
    }
    private void ketukKlik(AccessibilityNodeInfo n) {
        n.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
    }
    private static void isiTeks(AccessibilityNodeInfo n, String s) {
        Bundle b = new Bundle();
        b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, s);
        n.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, b);
    }

    // ---------- tanggal ----------
    private static Date isoKeDate(String iso) {
        Calendar k = Calendar.getInstance();
        k.set(Integer.parseInt(iso.substring(0, 4)), Integer.parseInt(iso.substring(5, 7)) - 1, Integer.parseInt(iso.substring(8, 10)), 0, 0, 0);
        return k.getTime();
    }
    private static String hariIni() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }
    private static String tanggalPanjang(String iso) {
        return Integer.parseInt(iso.substring(8, 10)) + " " + BULAN[Integer.parseInt(iso.substring(5, 7)) - 1] + " " + iso.substring(0, 4);
    }

    // ---------- rekam isi layar ----------
    private String pohon() {
        StringBuilder s = new StringBuilder();
        AccessibilityNodeInfo r = akar();
        if (r == null) return "(tidak ada jendela)";
        s.append("paket=").append(r.getPackageName()).append('\n');
        tulisPohon(r, 0, s);
        return s.length() > 30000 ? s.substring(0, 30000) + "\n…(dipotong)" : s.toString();
    }
    private static void tulisPohon(AccessibilityNodeInfo n, int d, StringBuilder s) {
        if (n == null || d > 45) return;
        Rect r = new Rect(); n.getBoundsInScreen(r);
        String t = teks(n);
        boolean penting = t.length() > 0 || n.isClickable() || n.isEditable();
        if (penting) {
            for (int i = 0; i < d; i++) s.append(' ');
            String kelas = n.getClassName() == null ? "?" : n.getClassName().toString().replaceAll(".*\\.", "");
            s.append(kelas).append(" \"").append(t.replace('\n', ' ')).append('"');
            if (n.isClickable()) s.append(" [klik]");
            if (n.isEditable()) s.append(" [isi]");
            if (n.isScrollable()) s.append(" [gulir]");
            if (n.getViewIdResourceName() != null) s.append(" id=").append(n.getViewIdResourceName());
            s.append(' ').append(r.toShortString()).append('\n');
        }
        for (int i = 0; i < n.getChildCount(); i++) tulisPohon(n.getChild(i), penting ? d + 1 : d, s);
    }
}
