package dev.grigorii.tasks;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.view.View;
import android.view.Window;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Цвет окна и системных панелей под тему приложения. Без этого на новых Android под приложением
 * просвечивает белый фон окна: сверху у часов и снизу у кнопок навигации получаются белые полосы
 */
@CapacitorPlugin(name = "WindowColors")
public class WindowColorsPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        final String color = call.getString("color", "#050505");
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", true));
        getActivity().runOnUiThread(() -> {
            try {
                int c = Color.parseColor(color);
                Window w = getActivity().getWindow();
                w.setBackgroundDrawable(new ColorDrawable(c));
                w.setStatusBarColor(c);
                w.setNavigationBarColor(c);
                View decor = w.getDecorView();
                int flags = decor.getSystemUiVisibility();
                // Тёмная тема: светлые значки. Светлая: тёмные значки
                if (dark) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                decor.setSystemUiVisibility(flags);
                call.resolve();
            } catch (IllegalArgumentException e) {
                call.reject("Неверный цвет: " + color);
            }
        });
    }
}
