package com.looply.social.editor

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.PopupMenu
import androidx.appcompat.app.AppCompatActivity
import com.looply.social.R
import com.looply.social.databinding.ActivityEditorBinding
import org.json.JSONObject

class EditorActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEditorBinding
    private lateinit var prefs: SharedPreferences

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEditorBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences("looply_settings", Context.MODE_PRIVATE)

        setupWebView()
        setupNativeOverlay()
    }

    private fun setupWebView() {
        val webView = binding.editorWebView
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
        }
        webView.setBackgroundColor(android.graphics.Color.TRANSPARENT)

        webView.addJavascriptInterface(EditorBridge(), "LooplyBridge")

        webView.webViewClient = object : android.webkit.WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val isDark = isDarkThemeActive()
                webView.evaluateJavascript(
                    "window.setThemeMode('${if (isDark) "dark" else "light"}')",
                    null
                )
            }
        }

        webView.loadUrl("file:///android_asset/editor.html")
    }

    private fun isDarkThemeActive(): Boolean {
        val mode = prefs.getString("theme_mode", "system")
        return when (mode) {
            "dark" -> true
            "light" -> false
            else -> {
                val nightModeFlags = resources.configuration.uiMode and
                    android.content.res.Configuration.UI_MODE_NIGHT_MASK
                nightModeFlags == android.content.res.Configuration.UI_MODE_NIGHT_YES
            }
        }
    }

    inner class EditorBridge {
        @JavascriptInterface
        fun onEditorEvent(json: String) {
            runOnUiThread {
                try {
                    val obj = JSONObject(json)
                    when (obj.getString("action")) {
                        "close" -> finish()
                        "openMoreMenu" -> showMoreMenu()
                        "export" -> handleExport(obj.getJSONObject("payload").getString("imageBase64"))
                        "exportError" -> { /* TODO: snackbar de erro */ }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun showMoreMenu() {
        val anchor = binding.moreMenuAnchor
        val popup = PopupMenu(this, anchor, Gravity.END)
        popup.menuInflater.inflate(R.menu.menu_editor_more, popup.menu)

        popup.menu.findItem(R.id.action_export)?.setIcon(android.R.drawable.ic_menu_upload)
        popup.menu.findItem(R.id.action_clear)?.setIcon(android.R.drawable.ic_menu_delete)

        popup.setOnMenuItemClickListener { item ->
            val action = when (item.itemId) {
                R.id.action_export -> "export"
                R.id.action_clear -> "clear"
                else -> return@setOnMenuItemClickListener false
            }
            binding.editorWebView.evaluateJavascript(
                "window.editorApiOnMoreMenuAction('$action')", null
            )
            true
        }
        popup.show()
    }

    private fun handleExport(base64Png: String) {
        // TODO: decodificar base64, guardar em Creation via Room
    }

    private fun setupNativeOverlay() {
        binding.moreMenuAnchor.visibility = View.INVISIBLE
    }

    private fun getColorAttr(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}