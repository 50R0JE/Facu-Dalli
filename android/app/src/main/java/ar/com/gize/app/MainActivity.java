package ar.com.gize.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio de la app (no viene de npm): cuenta regresiva del descanso.
        registerPlugin(RestTimerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
