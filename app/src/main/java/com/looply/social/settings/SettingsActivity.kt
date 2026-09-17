package com.looply.social.settings

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.looply.social.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val prefs = getSharedPreferences("looply_settings", Context.MODE_PRIVATE)

        binding.settingsWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
        }
        binding.settingsWebView.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        binding.settingsWebView.isLongClickable = false
        binding.settingsWebView.isHapticFeedbackEnabled = false

        binding.settingsWebView.addJavascriptInterface(object : Any() {
            @JavascriptInterface
            fun applyTheme(mode: String) {
                runOnUiThread {
                    prefs.edit().putString("theme_mode", mode).apply()
                    val nightMode = when (mode) {
                        "dark" -> AppCompatDelegate.MODE_NIGHT_YES
                        "light" -> AppCompatDelegate.MODE_NIGHT_NO
                        else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
                    }
                    AppCompatDelegate.setDefaultNightMode(nightMode)
                }
            }

            @JavascriptInterface
            fun goBack() {
                runOnUiThread { finish() }
            }

            @JavascriptInterface
            fun getStatusBarHeight(): Int {
                val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
                return if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else dp(24)
            }
        }, "LooplyBridge")

        binding.settingsWebView.webViewClient = object : android.webkit.WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val mode = prefs.getString("theme_mode", "system") ?: "system"
                val isDark = when (mode) {
                    "dark" -> true
                    "light" -> false
                    else -> {
                        val flags = resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK
                        flags == android.content.res.Configuration.UI_MODE_NIGHT_YES
                    }
                }
                binding.settingsWebView.evaluateJavascript(
                    "window.init('$mode','${if (isDark) "dark" else "light"}')", null
                )
                binding.settingsWebView.evaluateJavascript(
                    "(function(){var h=LooplyBridge.getStatusBarHeight();document.documentElement.style.setProperty('--status-h',h+'px');})();",
                    null
                )
            }
        }

        binding.settingsWebView.loadUrl("file:///android_asset/settings.html")
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
