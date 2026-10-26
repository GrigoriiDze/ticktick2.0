package dev.grigorii.tasks;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WindowColorsPlugin.class);
        super.onCreate(savedInstanceState);
        disableZoom();
    }

    @Override
    public void onStart() {
        super.onStart();
        disableZoom();
    }

    @Override
    public void onResume() {
        super.onResume();
        disableZoom();
    }

    private void disableZoom() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings s = getBridge().getWebView().getSettings();
            s.setSupportZoom(false);
            s.setBuiltInZoomControls(false);
            s.setDisplayZoomControls(false);
        }
    }
}
