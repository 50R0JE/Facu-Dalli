package ar.com.gize.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio de la app (no viene de npm): cuenta regresiva del descanso.
        registerPlugin(RestTimerPlugin.class);
        super.onCreate(savedInstanceState);
        // Con el "tamaño de fuente" del sistema agrandado, el WebView escalaba todo el texto de la
        // app (títulos gigantes, series y barra de abajo cortadas). La app ya usa tamaños pensados
        // para leerse bien: se deja el texto al 100 %.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
        }
    }
}
