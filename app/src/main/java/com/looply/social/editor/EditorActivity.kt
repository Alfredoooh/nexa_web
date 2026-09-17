package com.looply.social.editor

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.PopupMenu
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.looply.social.R
import com.looply.social.databinding.ActivityEditorBinding
import com.looply.social.icons.SvgIcon
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

        // Bridge: o HTML chama window.LooplyBridge.onEditorEvent(json)
        webView.addJavascriptInterface(EditorBridge(), "LooplyBridge")

        webView.webViewClient = object : android.webkit.WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Aplica o tema atual assim que a página carrega —
                // o HTML não decide o tema sozinho, o Kotlin é que manda.
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
        // Lê a preferência definida em SettingsActivity; por defeito
        // segue o tema do sistema.
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

    /**
     * Bridge JS -> Kotlin. O HTML nunca decide UI nativa sozinho —
     * qualquer coisa que precise de aparência nativa (popup de menu,
     * partilha, fechar ecrã) passa por aqui.
     */
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

    /**
     * Popup ancorado NATIVO — PopupMenu real do Android, com
     * elevação/sombra Material própria do sistema, não simulado
     * em CSS. Ancorado ao botão de três pontos do próprio WebView
     * (usamos um View invisível posicionado no canto para servir
     * de anchor, já que o botão real vive dentro do HTML).
     */
    private fun showMoreMenu() {
        val anchor = binding.moreMenuAnchor
        val popup = PopupMenu(this, anchor, Gravity.END)
        popup.menuInflater.inflate(R.menu.menu_editor_more, popup.menu)

        // Ícones do menu via SvgIcon, tal como o resto do app
        val onSurface = getColorAttr(com.google.android.material.R.attr.colorOnSurfaceVariant)
        popup.menu.findItem(R.id.action_export)?.icon =
            SvgIcon.load(this, "ui", "arrow_up", dp(18), onSurface)
        popup.menu.findItem(R.id.action_clear)?.icon =
            SvgIcon.load(this, "ui", "trash", dp(18), onSurface)

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
        // TODO: decodificar base64, guardar em Creation via Room,
        // ligado à Fase 3 (persistência das criações).
    }

    /**
     * Overlay nativo mínimo: só o anchor invisível para o PopupMenu.
     * Tudo o resto da UI do editor vive dentro do WebView.
     */
    private fun setupNativeOverlay() {
        binding.moreMenuAnchor.visibility = View.INVISIBLE
    }

    private fun getColorAttr(attr: Int): Int {
        val typedValue = android.util.TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}