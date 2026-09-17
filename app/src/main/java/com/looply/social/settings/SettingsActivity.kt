package com.looply.social.settings

import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.looply.social.R
import com.looply.social.databinding.ActivitySettingsBinding
import com.looply.social.icons.SvgIcon

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefs: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences("looply_settings", Context.MODE_PRIVATE)

        setupHeader()
        setupThemeToggle()
    }

    private fun setupHeader() {
        val onSurface = getColorAttr(R.attr.colorOnSurface)
        binding.btnBack.setImageDrawable(SvgIcon.load(this, "ui", "back", dp(19), onSurface))
        binding.btnBack.setOnClickListener { finish() }
    }

    private fun setupThemeToggle() {
        val onSurface = getColorAttr(R.attr.colorOnSurface)
        val checkIcon = SvgIcon.load(this, "ui", "check", dp(16), onSurface)
        binding.checkSystem.setImageDrawable(checkIcon)
        binding.checkLight.setImageDrawable(checkIcon)
        binding.checkDark.setImageDrawable(checkIcon)

        val currentMode = prefs.getString("theme_mode", "system")
        updateThemeSelection(currentMode)

        binding.themeOptionLight.setOnClickListener { applyTheme("light") }
        binding.themeOptionDark.setOnClickListener { applyTheme("dark") }
        binding.themeOptionSystem.setOnClickListener { applyTheme("system") }
    }

    private fun applyTheme(mode: String) {
        prefs.edit().putString("theme_mode", mode).apply()
        updateThemeSelection(mode)

        val nightMode = when (mode) {
            "dark" -> AppCompatDelegate.MODE_NIGHT_YES
            "light" -> AppCompatDelegate.MODE_NIGHT_NO
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        AppCompatDelegate.setDefaultNightMode(nightMode)
    }

    private fun updateThemeSelection(mode: String?) {
        val effectiveMode = mode ?: "system"
        binding.checkSystem.visibility = if (effectiveMode == "system") View.VISIBLE else View.INVISIBLE
        binding.checkLight.visibility = if (effectiveMode == "light") View.VISIBLE else View.INVISIBLE
        binding.checkDark.visibility = if (effectiveMode == "dark") View.VISIBLE else View.INVISIBLE
    }

    private fun getColorAttr(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}