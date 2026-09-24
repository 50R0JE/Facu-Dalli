package ar.com.gize.app;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente con la app web (app/ui/restnotif.js): muestra y saca la barra del descanso
 * (RestTimerService).
 */
@CapacitorPlugin(name = "RestTimer")
public class RestTimerPlugin extends Plugin {

    @PluginMethod
    public void show(PluginCall call) {
        Double endAt = call.getDouble("endAt");
        Integer total = call.getInt("total");
        if (endAt == null || total == null) { call.reject("Faltan endAt y total"); return; }
        Context ctx = getContext();
        Intent i = new Intent(ctx, RestTimerService.class)
                .putExtra(RestTimerService.EXTRA_END_AT, endAt.longValue())
                .putExtra(RestTimerService.EXTRA_TOTAL, (long) total)
                .putExtra(RestTimerService.EXTRA_TITLE, call.getString("title", "Descanso"));
        try {
            ContextCompat.startForegroundService(ctx, i);
            call.resolve();
        } catch (Exception e) {
            // Android puede no dejar arrancar el servicio (ej. sin permisos): el descanso sigue igual.
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        getContext().stopService(new Intent(getContext(), RestTimerService.class));
        call.resolve();
    }
}
