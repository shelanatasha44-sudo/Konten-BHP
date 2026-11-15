package id.bhpmedan.jurnalsimpeg;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.io.File;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Log berkas sederhana + preferensi + notifikasi. */
final class Catatan {
    static final String KANAL = "jurnal";
    private static final long MAKS = 400 * 1024;

    private Catatan() {}

    static SharedPreferences pref(Context c) { return c.getSharedPreferences("jurnal", Context.MODE_PRIVATE); }

    static synchronized void tulis(Context c, String pesan) {
        try {
            File f = new File(c.getFilesDir(), "log.txt");
            if (f.length() > MAKS) {   // potong separuh awal supaya berkas tidak membengkak
                String isi = baca(c);
                FileOutputStream o = new FileOutputStream(f, false);
                o.write(isi.substring(isi.length() / 2).getBytes("UTF-8"));
                o.close();
            }
            String waktu = new SimpleDateFormat("dd/MM HH:mm:ss", Locale.US).format(new Date());
            FileOutputStream o = new FileOutputStream(f, true);
            o.write((waktu + "  " + pesan + "\n").getBytes("UTF-8"));
            o.close();
        } catch (Exception e) { /* abaikan */ }
    }

    static synchronized String baca(Context c) {
        try {
            File f = new File(c.getFilesDir(), "log.txt");
            if (!f.exists()) return "";
            RandomAccessFile r = new RandomAccessFile(f, "r");
            byte[] b = new byte[(int) r.length()];
            r.readFully(b); r.close();
            return new String(b, "UTF-8");
        } catch (Exception e) { return ""; }
    }

    static synchronized void hapus(Context c) { new File(c.getFilesDir(), "log.txt").delete(); }

    static void beritahu(Context c, int id, String judul, String isi, Intent buka) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(KANAL) == null) {
            nm.createNotificationChannel(new NotificationChannel(KANAL, "Jurnal SIMPEG", NotificationManager.IMPORTANCE_HIGH));
        }
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, KANAL) : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_menu_edit).setContentTitle(judul).setContentText(isi)
            .setStyle(new Notification.BigTextStyle().bigText(isi)).setAutoCancel(true);
        if (buka == null) buka = new Intent(c, MainActivity.class);
        buka.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        b.setContentIntent(PendingIntent.getActivity(c, id, buka, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        nm.notify(id, b.build());
    }
}
