package id.bhpmedan.jurnalsimpeg;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Pengingat harian. HP yang terkunci tidak bisa diisi otomatis (layar harus menyala dan terbuka),
 * jadi pada jam yang disetel aplikasi memunculkan notifikasi. Ketuk notifikasi → pengisian dimulai.
 */
public class Pengingat extends BroadcastReceiver {
    static final String AKSI = "id.bhpmedan.jurnalsimpeg.PENGINGAT";

    @Override public void onReceive(Context c, Intent i) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(i.getAction())) { jadwalkan(c); return; }
        SharedPreferences p = Catatan.pref(c);
        if (!p.getBoolean("pengingat", true)) return;
        Calendar k = Calendar.getInstance();
        int hari = k.get(Calendar.DAY_OF_WEEK);
        if (hari == Calendar.SATURDAY || hari == Calendar.SUNDAY) return;
        String iso = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(k.getTime());
        if (("," + p.getString("libur", "") + ",").contains("," + iso + ",")) return;
        int tgl = k.get(Calendar.DAY_OF_MONTH), dari = p.getInt("tutupDari", 14), sampai = p.getInt("tutupSampai", 18);
        if (dari > 0 && sampai > 0 && (dari <= sampai ? (tgl >= dari && tgl <= sampai) : (tgl >= dari || tgl <= sampai))) return;
        if (p.getString("selesai:" + iso, "").length() > 0 && p.getBoolean("lengkap:" + iso, false)) return;
        Intent buka = new Intent(c, MainActivity.class).putExtra("mulai", iso);
        Catatan.beritahu(c, 1, "Waktunya isi Jurnal SIMPEG", "Ketuk untuk mengisi jurnal hari ini otomatis. Pastikan HP tidak terkunci dan sudah login di aplikasi SIMPEG.", buka);
        Catatan.tulis(c, "Pengingat harian dikirim untuk " + iso);
    }

    static void jadwalkan(Context c) {
        SharedPreferences p = Catatan.pref(c);
        String[] jam = p.getString("jam", "08:15").split(":");
        Calendar k = Calendar.getInstance();
        k.set(Calendar.HOUR_OF_DAY, Integer.parseInt(jam[0]));
        k.set(Calendar.MINUTE, Integer.parseInt(jam[1]));
        k.set(Calendar.SECOND, 0);
        if (k.getTimeInMillis() <= System.currentTimeMillis()) k.add(Calendar.DAY_OF_MONTH, 1);
        PendingIntent pi = PendingIntent.getBroadcast(c, 0, new Intent(c, Pengingat.class).setAction(AKSI),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(pi);
        if (p.getBoolean("pengingat", true)) am.setInexactRepeating(AlarmManager.RTC_WAKEUP, k.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
    }
}
