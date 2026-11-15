package id.bhpmedan.jurnalsimpeg;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/** Layar utama: tampilan HTML (assets/index.html) yang memakai penyusun jurnal yang sama dengan plugin Chrome. */
public class MainActivity extends Activity {
    private WebView web;
    private String mulaiOtomatis;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#f3f4f8"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        web.setWebChromeClient(new WebChromeClient());   // agar alert()/confirm() tampil
        web.addJavascriptInterface(new Jembatan(), "Android");
        setContentView(web);
        ambilNiat(getIntent());
        web.loadUrl("file:///android_asset/index.html");
        Pengingat.jadwalkan(this);
    }

    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        ambilNiat(i);
        web.evaluateJavascript("window.cekMulaiOtomatis && cekMulaiOtomatis()", null);
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.segarkan && segarkan()", null);
    }

    private void ambilNiat(Intent i) {
        if (i != null && i.getStringExtra("mulai") != null) mulaiOtomatis = i.getStringExtra("mulai");
    }

    boolean layananAktif() {
        String aktif = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (aktif == null) return false;
        String kita = new ComponentName(this, LayananIsi.class).flattenToString();
        TextUtils.SimpleStringSplitter p = new TextUtils.SimpleStringSplitter(':');
        p.setString(aktif);
        while (p.hasNext()) if (p.next().equalsIgnoreCase(kita)) return true;
        return false;
    }

    /** Fungsi yang bisa dipanggil dari JavaScript di index.html. */
    class Jembatan {
        @JavascriptInterface public boolean layananAktif() { return MainActivity.this.layananAktif() && LayananIsi.aktif != null; }

        @JavascriptInterface public void bukaSetelan() {
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }

        @JavascriptInterface public String mulaiOtomatis() { String t = mulaiOtomatis; mulaiOtomatis = null; return t == null ? "" : t; }

        /** daftarJson = hasil susunJurnal(); simpan=false → mode uji (satu kegiatan, tidak menekan SIMPAN). */
        @JavascriptInterface public String mulai(String tanggal, String daftarJson, boolean simpan) {
            LayananIsi l = LayananIsi.aktif;
            if (l == null || !MainActivity.this.layananAktif()) return "Aktifkan dulu layanan aksesibilitas \"Jurnal SIMPEG Otomatis\".";
            SharedPreferences p = Catatan.pref(MainActivity.this);
            String pkg = p.getString("paket", "simpeg.kemenkumham.mobile");
            Intent buka = getPackageManager().getLaunchIntentForPackage(pkg);
            if (buka == null) return "Aplikasi SIMPEG (" + pkg + ") tidak ditemukan di HP ini. Periksa nama paket di Pengaturan.";
            try {
                JSONArray a = new JSONArray(daftarJson);
                String hasil = l.mulai(tanggal, a, simpan, pkg);
                if (hasil != null) return hasil;
            } catch (Exception e) { return "Data kegiatan tidak terbaca: " + e.getMessage(); }
            buka.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            startActivity(buka);
            return "";
        }

        @JavascriptInterface public void hentikan() { if (LayananIsi.aktif != null) LayananIsi.aktif.hentikan("Dihentikan dari aplikasi."); }

        @JavascriptInterface public boolean sedangJalan() { return LayananIsi.aktif != null && LayananIsi.aktif.sedangJalan(); }

        @JavascriptInterface public void rekam(boolean nyala) { Catatan.pref(MainActivity.this).edit().putBoolean("rekam", nyala).apply(); }

        @JavascriptInterface public String log() { return Catatan.baca(MainActivity.this); }

        @JavascriptInterface public void hapusLog() { Catatan.hapus(MainActivity.this); }

        @JavascriptInterface public void bagikanLog() {
            String isi = Catatan.baca(MainActivity.this);
            if (isi.length() > 90000) isi = isi.substring(isi.length() - 90000);
            Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, "Log Jurnal SIMPEG").putExtra(Intent.EXTRA_TEXT, isi);
            startActivity(Intent.createChooser(i, "Bagikan log").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }

        @JavascriptInterface public String status() {
            try {
                JSONObject o = new JSONObject();
                SharedPreferences p = Catatan.pref(MainActivity.this);
                for (String k : p.getAll().keySet()) o.put(k, p.getAll().get(k));
                return o.toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface public void simpanPengaturan(String json) {
            try {
                JSONObject o = new JSONObject(json);
                SharedPreferences.Editor e = Catatan.pref(MainActivity.this).edit();
                e.putString("paket", o.optString("paket", "simpeg.kemenkumham.mobile"));
                e.putString("jam", o.optString("jam", "08:15"));
                e.putBoolean("pengingat", o.optBoolean("pengingat", true));
                e.putInt("tutupDari", o.optInt("tutupDari", 14));
                e.putInt("tutupSampai", o.optInt("tutupSampai", 18));
                e.putString("libur", o.optString("libur", ""));
                e.putString("teksSkp", o.optString("teksSkp", ""));
                e.apply();
                Pengingat.jadwalkan(MainActivity.this);
            } catch (Exception ex) { /* abaikan */ }
        }

        @JavascriptInterface public void tandai(String tanggal, boolean selesai) {
            SharedPreferences.Editor e = Catatan.pref(MainActivity.this).edit();
            if (selesai) e.putBoolean("lengkap:" + tanggal, true).putString("selesai:" + tanggal, "manual");
            else e.remove("lengkap:" + tanggal).remove("selesai:" + tanggal);
            e.apply();
        }

        @JavascriptInterface public void pesan(final String t) {
            runOnUiThread(new Runnable() { public void run() { Toast.makeText(MainActivity.this, t, Toast.LENGTH_LONG).show(); } });
        }
    }
}
