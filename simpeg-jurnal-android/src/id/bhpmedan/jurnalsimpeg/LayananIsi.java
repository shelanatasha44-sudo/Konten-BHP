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
    private static final long JEDA_AKSI = 1100, BATAS_LANGKAH = 18000;
    private static final String[] BULAN = { "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember" };

    private final Handler h = new Handler(Looper.getMainLooper());
    private boolean jalan, simpan, formAktif;
    private JSONArray daftar;
    private int idx, langkah, sub, coba, berhasil;
    private String tanggal, pkg;
    private long sejakLangkah, aksiTerakhir, sejakDikenal, rekamTerakhir, bukaTerakhir;

    private final Runnable detak = new Runnable() {
        public void run() {
            if (!jalan) return;
            try { langkahkan(); } catch (Exception e) { gagal("Galat: " + e); }
            if (jalan) h.postDelayed(this, 650);
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
        idx = 0; berhasil = 0; lewati = 0; formAktif = false; jalan = true;
        mulaiLangkah(0);
        sejakDikenal = System.currentTimeMillis();
        Catatan.tulis(this, "MULAI " + tanggal + " (" + daftar.length() + " kegiatan, " + (simpan ? "simpan" : "UJI tanpa simpan") + ")");
        h.postDelayed(detak, 2500);
        return null;
    }

    void hentikan(String alasan) {
        if (!jalan) return;
        jalan = false;
        h.removeCallbacks(detak);
        Catatan.tulis(this, "BERHENTI: " + alasan);
    }

    private void gagal(String alasan) {
        Catatan.tulis(this, "GAGAL (" + (idx + 1) + "/" + daftar.length() + ", langkah " + (formAktif ? LANGKAH[langkah] : "navigasi") + "): " + alasan + "\nIsi layar saat gagal:\n" + pohon());
        hentikan(alasan);
        Catatan.beritahu(this, 2, "Jurnal SIMPEG berhenti", alasan + " Buka aplikasi Jurnal SIMPEG → Bagikan log bila perlu diperbaiki.", null);
    }

    private void selesai(String pesan) {
        hentikan(pesan);
        if (simpan && berhasil + lewati >= daftar.length()) {
            Catatan.pref(this).edit().putBoolean("lengkap:" + tanggal, true).apply();
        }
        Catatan.beritahu(this, 2, "Jurnal SIMPEG", pesan, null);
    }

    private int lewati;

    private void mulaiLangkah(int l) { langkah = l; sub = 0; coba = 0; sejakLangkah = System.currentTimeMillis(); }
    private void lanjutLangkah() { mulaiLangkah(langkah + 1); }
    private boolean sabar() { return System.currentTimeMillis() - aksiTerakhir < JEDA_AKSI; }
    private void tandaiAksi() { aksiTerakhir = System.currentTimeMillis(); }

    private JSONObject entri() throws Exception { return daftar.getJSONObject(idx); }

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

        if (cocok(layar, "tanggal mulai") && cocok(layar, "tanggal selesai")) {          // daftar Jurnal Harian
            sejakDikenal = now;
            JSONObject e = entri();
            if (cocok(layar, Pattern.quote(tanggalPanjang(tanggal))) && memuat(layar, e.getString("uraian"))) {
                Catatan.tulis(this, "Sudah ada, dilewati: " + e.getString("uraian"));
                lewati++; idx++;
                if (idx >= daftar.length()) selesai(ringkasan());
                return;
            }
            AccessibilityNodeInfo fab = cariFab(n);
            if (fab == null) { if (now - sejakLangkah > BATAS_LANGKAH) gagal("Tombol + (tambah jurnal) tidak ditemukan."); return; }
            ketuk(fab); return;
        }
        if (cocok(layar, "jurnal harian") && cocok(layar, "\\bskp\\b")) {                  // layar Kinerja, tab SKP
            sejakDikenal = now;
            AccessibilityNodeInfo tab = cari(n, "^\\s*jurnal harian\\s*$");
            if (tab != null) { ketuk(tab); return; }
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
        if (now - sejakLangkah > BATAS_LANGKAH) { gagal("Langkah " + LANGKAH[langkah] + " tidak selesai dalam " + (BATAS_LANGKAH / 1000) + " detik."); return; }
        boolean dlgSkp = cocok(layar, "lain-?lain") && cocok(layar, "tugas tambahan") && cocok(layar, "kreati[fv]itas");
        boolean dlgTgl = cocok(layar, "select date|pilih tanggal|enter date|masukkan tanggal");
        boolean dlgJam = cocok(layar, "select time|pilih waktu|enter time|masukkan waktu|pilih jam");

        switch (LANGKAH[langkah]) {
            case "SKP": {
                if (dlgSkp) {
                    AccessibilityNodeInfo opsi = pilihSkp(n, "Lain-Lain".equalsIgnoreCase(e.optString("skp")));
                    if (opsi == null) { gagal("Pilihan SKP tidak ditemukan di daftar."); return; }
                    ketuk(opsi); sub = 1; return;
                }
                if (sub == 1) { lanjutLangkah(); return; }
                AccessibilityNodeInfo f = cari(n, "pilih skp");
                if (f == null) f = cari(n, "\\bskp\\b");
                if (f != null) ketuk(f);
                return;
            }
            case "TANGGAL": {
                if (dlgTgl) {
                    AccessibilityNodeInfo isian = pertamaYangBisaDiisi(n);
                    if (sub == 3) {                                              // tanggal sudah dimasukkan → OK
                        AccessibilityNodeInfo ok = cari(n, "^\\s*(ok|oke|pilih|simpan|set)\\s*$");
                        if (ok != null) { ketuk(ok); sub = 4; }
                        return;
                    }
                    if (isian != null) {
                        String hint = teks(isian).toLowerCase(Locale.ROOT);
                        String fmt = (hint.contains("dd/mm") || hint.contains("hh/bb")) ? "dd/MM/yyyy" : "MM/dd/yyyy";
                        isiTeks(isian, new SimpleDateFormat(fmt, Locale.US).format(isoKeDate(tanggal)));
                        tandaiAksi(); sub = 3; return;
                    }
                    if (hariIni().equals(tanggal) && sub < 2) {                  // bawaan pemilih = hari ini → langsung OK
                        AccessibilityNodeInfo ok = cari(n, "^\\s*(ok|oke|pilih|simpan|set)\\s*$");
                        if (ok != null) { ketuk(ok); sub = 4; return; }
                    }
                    AccessibilityNodeInfo ubah = cari(n, "switch to input|beralih ke input|ke input|mode input|edit|ubah");
                    if (ubah != null && sub < 2) { ketuk(ubah); sub = 2; return; }
                    AccessibilityNodeInfo hari = cari(n, "^\\s*" + Integer.parseInt(tanggal.substring(8)) + "\\s*$");
                    if (hari != null) { ketuk(hari); sub = 3; return; }
                    return;
                }
                if (sub == 4) { lanjutLangkah(); return; }
                AccessibilityNodeInfo f = cari(n, "^\\s*tanggal\\b");
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
                if (dlgJam) { isiDialogJam(n, jm); return; }
                if (sub == 9) { lanjutLangkah(); return; }
                AccessibilityNodeInfo f = cari(n, mulai ? "jam mulai" : "jam selesai");
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
                if (!cocok(layar, "tambah jurnal harian|pilih skp")) {
                    berhasil++;
                    Catatan.tulis(this, "✓ Tersimpan " + e.getString("jamMulai") + "–" + e.getString("jamSelesai") + " " + e.getString("uraian"));
                    String kunci = "selesai:" + tanggal;
                    Catatan.pref(this).edit().putString(kunci, Catatan.pref(this).getString(kunci, "") + (idx + 1) + ",").apply();
                    formAktif = false; idx++; mulaiLangkah(0); sejakDikenal = now;
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

    private void isiDialogJam(List<AccessibilityNodeInfo> n, String[] jm) {
        List<AccessibilityNodeInfo> isian = semuaYangBisaDiisi(n);
        AccessibilityNodeInfo ok = cari(n, "^\\s*(ok|oke|pilih|simpan|set)\\s*$");
        if (sub == 5 && ok != null) { ketuk(ok); sub = 9; return; }
        if (isian.size() >= 2) {                                     // mode ketik: kolom jam & menit
            isiTeks(isian.get(0), jm[0]); isiTeks(isian.get(1), jm[1]);
            tandaiAksi(); sub = 5; return;
        }
        if (sub <= 1) {
            AccessibilityNodeInfo ketik = cari(n, "text input|switch to input|keyboard|mode input|ketik|papan ketik|masukkan waktu");
            if (ketik != null) { ketuk(ketik); sub = 2; return; }
            sub = 3;
        }
        if (sub == 2 && System.currentTimeMillis() - aksiTerakhir < 2500) return;
        // mode jam analog: ketuk angka jam, lalu angka menit (kelipatan 15 menit selalu ada di jam)
        if (sub <= 3) {
            int jam = Integer.parseInt(jm[0]);
            AccessibilityNodeInfo a = cari(n, "^\\s*0?" + jam + "\\s*$");
            if (jam == 0) a = cari(n, "^\\s*00\\s*$");
            if (a != null) { ketuk(a); sub = 4; }
            return;
        }
        if (sub == 4) {
            AccessibilityNodeInfo m = cari(n, "^\\s*" + jm[1] + "\\s*$");
            if (m != null) { ketuk(m); sub = 5; }
        }
    }

    private String ringkasan() {
        return tanggal + ": " + berhasil + " kegiatan tersimpan" + (lewati > 0 ? ", " + lewati + " sudah ada" : "") + ".";
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
        AccessibilityNodeInfo x = cari(n, "^\\s*\\+\\s*$|tambah|add|create");
        if (x != null) return x;
        AccessibilityNodeInfo terbaik = null; int skor = -1;
        for (AccessibilityNodeInfo y : n) {
            if (!y.isClickable() || !tampak(y)) continue;
            Rect r = new Rect(); y.getBoundsInScreen(r);
            if (r.width() > 320 || r.height() > 320) continue;
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
