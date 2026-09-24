package ar.com.gize.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.ServiceCompat;

/**
 * Descanso entre series con la pantalla bloqueada: notificación fija con una barra que se va
 * llenando y el tiempo que queda. Es un "servicio en primer plano" (como un reproductor de
 * música) para que la barra se pueda actualizar cada segundo con el celular bloqueado.
 * Se detiene solo al terminar; el aviso con sonido lo programa aparte LocalNotifications.
 */
public class RestTimerService extends Service {
    static final String EXTRA_END_AT = "endAt";
    static final String EXTRA_TOTAL = "total";
    static final String EXTRA_TITLE = "title";
    private static final String CHANNEL = "descanso_en_curso";
    private static final int ID = 4100;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long endAt;
    private long totalMs;
    private String title = "Descanso";

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            long left = endAt - System.currentTimeMillis();
            if (left <= 0) { finish(); return; }
            try { NotificationManagerCompat.from(RestTimerService.this).notify(ID, build(left)); } catch (SecurityException ignored) {}
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { finish(); return START_NOT_STICKY; }
        endAt = intent.getLongExtra(EXTRA_END_AT, 0);
        totalMs = Math.max(1000, intent.getLongExtra(EXTRA_TOTAL, 0) * 1000);
        String t = intent.getStringExtra(EXTRA_TITLE);
        if (t != null) title = t;
        long left = endAt - System.currentTimeMillis();
        if (left <= 0) { finish(); return START_NOT_STICKY; }

        createChannel();
        int type = Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        ServiceCompat.startForeground(this, ID, build(left), type);
        handler.removeCallbacks(tick);
        handler.postDelayed(tick, 1000);
        return START_NOT_STICKY;
    }

    private Notification build(long left) {
        long elapsed = Math.max(0, totalMs - left);
        int max = 1000;
        int progress = (int) Math.min(max, elapsed * max / totalMs);
        long secs = (left + 999) / 1000;
        String quedan = "Quedan " + (secs / 60) + ":" + String.format("%02d", secs % 60);

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = open == null ? null : PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_gize)
                .setColor(0xFF2FA0FF)
                .setContentTitle(title)
                .setContentText(quedan)
                .setProgress(max, progress, false)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        if (pi != null) b.setContentIntent(pi);
        return b.build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Descanso en curso", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Muestra el tiempo que queda del descanso entre series.");
        ch.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    private void finish() {
        handler.removeCallbacks(tick);
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override public void onDestroy() { handler.removeCallbacks(tick); super.onDestroy(); }

    @Override public IBinder onBind(Intent intent) { return null; }
}
