package com.looply.social

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import com.looply.social.databinding.ActivityMainBinding
import com.looply.social.editor.EditorActivity
import com.looply.social.settings.SettingsActivity

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupWebView()
        setupDrawer()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.mainWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
        }
        binding.mainWebView.setBackgroundColor(Color.TRANSPARENT)
        binding.mainWebView.isLongClickable = false
        binding.mainWebView.isHapticFeedbackEnabled = false

        binding.mainWebView.addJavascriptInterface(MainBridge(), "LooplyBridge")

        binding.mainWebView.webViewClient = object : android.webkit.WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val isDark = isDarkMode()
                binding.mainWebView.evaluateJavascript(
                    "window.setTheme('${if (isDark) "dark" else "light"}')", null
                )
            }
        }

        binding.mainWebView.loadUrl("file:///android_asset/main.html")
    }

    inner class MainBridge {
        @JavascriptInterface
        fun openDrawer() {
            runOnUiThread { binding.drawerLayout.openDrawer(Gravity.START) }
        }

        @JavascriptInterface
        fun openEditor() {
            runOnUiThread { startActivity(Intent(this@MainActivity, EditorActivity::class.java)) }
        }

        @JavascriptInterface
        fun openSettings() {
            runOnUiThread { startActivity(Intent(this@MainActivity, SettingsActivity::class.java)) }
        }

        @JavascriptInterface
        fun openPlayStore() {
            runOnUiThread { this@MainActivity.openPlayStore() }
        }

        @JavascriptInterface
        fun shareApp() {
            runOnUiThread { this@MainActivity.shareApp() }
        }

        @JavascriptInterface
        fun getStatusBarHeight(): Int {
            val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
            return if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else dp(24)
        }
    }

    private fun setupDrawer() {
        val onSurface = getColorAttr(R.attr.colorOnSurface)
        val onSurfaceVariant = getColorAttr(R.attr.colorOnSurfaceVariant)

        binding.drawerItems.removeAllViews()

        addDrawerItem(
            icon = android.R.drawable.ic_menu_preferences,
            label = getString(R.string.drawer_settings),
            tint = onSurface
        ) {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        addDrawerItem(
            icon = android.R.drawable.btn_star_big_on,
            label = getString(R.string.drawer_rate),
            tint = onSurface
        ) {
            openPlayStore()
        }

        addDrawerItem(
            icon = android.R.drawable.ic_menu_share,
            label = getString(R.string.drawer_share),
            tint = onSurface
        ) {
            shareApp()
        }

        addDrawerItem(
            icon = android.R.drawable.ic_menu_compass,
            label = getString(R.string.drawer_explore),
            tint = onSurfaceVariant
        ) {}
    }

    private fun addDrawerItem(
        icon: Int,
        label: String,
        tint: Int,
        onClick: () -> Unit
    ) {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(52)
            setPadding(dp(20), 0, dp(20), 0)
            isClickable = true
            isFocusable = true
            background = resolveSelectableItemBackground()
        }

        val iconView = ImageView(this).apply {
            layoutParams = LinearLayout.LayoutParams(dp(22), dp(22))
            setImageResource(icon)
            setColorFilter(tint)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            contentDescription = null
        }

        val labelView = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(16)
            }
            text = label
            textSize = 15f
            setTextColor(tint)
        }

        root.addView(iconView)
        root.addView(labelView)
        root.setOnClickListener {
            binding.drawerLayout.closeDrawers()
            onClick()
        }

        binding.drawerItems.addView(root)
    }

    private fun resolveSelectableItemBackground(): android.graphics.drawable.Drawable? {
        val typedValue = TypedValue()
        theme.resolveAttribute(android.R.attr.selectableItemBackground, typedValue, true)
        return if (typedValue.resourceId != 0) {
            androidx.core.content.ContextCompat.getDrawable(this, typedValue.resourceId)
        } else {
            null
        }
    }

    private fun openPlayStore() {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName")))
        } catch (e: Exception) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$packageName")))
        }
    }

    private fun shareApp() {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, "Experimenta o Looply: https://play.google.com/store/apps/details?id=$packageName")
        }
        startActivity(Intent.createChooser(intent, getString(R.string.drawer_share)))
    }

    private fun isDarkMode(): Boolean {
        val prefs = getSharedPreferences("looply_settings", Context.MODE_PRIVATE)
        return when (prefs.getString("theme_mode", "system")) {
            "dark" -> true
            "light" -> false
            else -> {
                val flags = resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK
                flags == android.content.res.Configuration.UI_MODE_NIGHT_YES
            }
        }
    }

    private fun getColorAttr(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}