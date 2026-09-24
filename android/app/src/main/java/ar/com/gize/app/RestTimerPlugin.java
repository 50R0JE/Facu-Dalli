package ar.com.gize.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Descanso entre series con la pantalla apagada: una notificación fija con la cuenta
 * regresiva corriendo (cronómetro de Android). Se borra sola al terminar (setTimeoutAfter);
 * el aviso con sonido lo programa aparte el plugin LocalNotifications (app/ui/restnotif.js).
 */
@CapacitorPlugin(name = "RestTimer")
public class RestTimerPlugin extends Plugin {
    private static final String CHANNEL = "descanso_en_curso";
    private static final int ID = 4100;

    @PluginMethod
    public void show(PluginCall call) {
        Double endAtD = call.getDouble("endAt");
        if (endAtD == null) { call.reject("Falta endAt"); return; }
        long endAt = endAtD.longValue();
        long left = endAt - System.currentTimeMillis();
        if (left <= 0) { hideNow(); call.resolve(); return; }
        String title = call.getString("title", "Descanso");
        Context ctx = getContext();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Descanso en curso", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Muestra el tiempo que queda del descanso entre series.");
            ch.setShowBadge(false);
            ctx.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent pi = open == null ? null : PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_gize)
                .setColor(0xFF2FA0FF)
                .setContentTitle(title)
                .setContentText("Tocá para volver a la rutina")
                .setWhen(endAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setTimeoutAfter(left);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) b.setChronometerCountDown(true);
        if (pi != null) b.setContentIntent(pi);
        try {
            NotificationManagerCompat.from(ctx).notify(ID, b.build());
        } catch (SecurityException e) {
            // Sin permiso de notificaciones: no se muestra, el descanso sigue igual en la app.
        }
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        hideNow();
        call.resolve();
    }

    private void hideNow() {
        NotificationManagerCompat.from(getContext()).cancel(ID);
    }
}
