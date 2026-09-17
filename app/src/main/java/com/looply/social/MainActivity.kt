package com.looply.social

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import com.looply.social.databinding.ActivityMainBinding
import com.looply.social.databinding.DrawerItemBinding
import com.looply.social.editor.EditorActivity
import com.looply.social.icons.SvgIcon
import com.looply.social.settings.SettingsActivity
import com.looply.social.ui.creations.CreationsFragment
import com.looply.social.ui.home.HomeFragment
import com.looply.social.ui.templates.TemplatesFragment

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private enum class Tab { HOME, CREATIONS, TEMPLATES }
    private var currentTab = Tab.HOME

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(binding.topBar) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(
                view.paddingLeft,
                systemBars.top,
                view.paddingRight,
                view.paddingBottom
            )
            insets
        }

        setupIcons()
        setupBottomNav()
        setupDrawer()
        setupFab()

        if (savedInstanceState == null) {
            switchTab(Tab.HOME)
        }
    }

    private fun setupIcons() {
        val onSurface = getColorAttr(R.attr.colorOnSurface)
        val primary   = getColorAttr(androidx.appcompat.R.attr.colorPrimary)
        val variant   = getColorAttr(R.attr.colorOnSurfaceVariant)

        binding.btnMenu.setImageDrawable(SvgIcon.load(this, "ui", "menu", dp(20), onSurface))
        binding.fabNewCreation.setImageDrawable(SvgIcon.load(this, "ui", "add", dp(24), android.graphics.Color.WHITE))

        binding.navHomeIcon.setImageDrawable(SvgIcon.load(this, "ui", "apps", dp(22), primary))
        binding.navCreationsIcon.setImageDrawable(SvgIcon.load(this, "ui", "library", dp(22), variant))
        binding.navTemplatesIcon.setImageDrawable(SvgIcon.load(this, "ui", "stacks", dp(22), variant))
    }

    private fun setupBottomNav() {
        binding.navHome.setOnClickListener { switchTab(Tab.HOME) }
        binding.navCreations.setOnClickListener { switchTab(Tab.CREATIONS) }
        binding.navTemplates.setOnClickListener { switchTab(Tab.TEMPLATES) }
    }

    private fun switchTab(tab: Tab) {
        currentTab = tab
        val fragment: Fragment = when (tab) {
            Tab.HOME      -> HomeFragment()
            Tab.CREATIONS -> CreationsFragment()
            Tab.TEMPLATES -> TemplatesFragment()
        }
        supportFragmentManager.commit {
            replace(R.id.fragmentContainer, fragment)
        }
        binding.topBarTitle.text = when (tab) {
            Tab.HOME      -> getString(R.string.nav_home)
            Tab.CREATIONS -> getString(R.string.nav_creations)
            Tab.TEMPLATES -> getString(R.string.nav_templates)
        }
        updateNavHighlight()
    }

    private fun updateNavHighlight() {
        val white = android.graphics.Color.WHITE
        val muted = android.graphics.Color.parseColor("#99FFFFFF")

        binding.navHome.background      = null
        binding.navCreations.background = null
        binding.navTemplates.background = null

        val (homeColor, creationsColor, templatesColor) = when (currentTab) {
            Tab.HOME      -> Triple(white, muted, muted).also { binding.navHome.setBackgroundResource(R.drawable.bg_nav_pill_active) }
            Tab.CREATIONS -> Triple(muted, white, muted).also { binding.navCreations.setBackgroundResource(R.drawable.bg_nav_pill_active) }
            Tab.TEMPLATES -> Triple(muted, muted, white).also { binding.navTemplates.setBackgroundResource(R.drawable.bg_nav_pill_active) }
        }

        binding.navHomeIcon.setImageDrawable(SvgIcon.load(this, "ui", "apps", dp(22), homeColor))
        binding.navCreationsIcon.setImageDrawable(SvgIcon.load(this, "ui", "library", dp(22), creationsColor))
        binding.navTemplatesIcon.setImageDrawable(SvgIcon.load(this, "ui", "stacks", dp(22), templatesColor))

        binding.navHomeLabel.setTextColor(homeColor)
        binding.navCreationsLabel.setTextColor(creationsColor)
        binding.navTemplatesLabel.setTextColor(templatesColor)
    }

    private fun setupDrawer() {
        binding.btnMenu.setOnClickListener {
            binding.drawerLayout.openDrawer(Gravity.START)
        }

        val onSurface = getColorAttr(R.attr.colorOnSurface)

        bindDrawerItem(findViewById(R.id.drawerSettings), "settings", getString(R.string.drawer_settings), onSurface) {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        bindDrawerItem(findViewById(R.id.drawerRate), "thumbs_up", getString(R.string.drawer_rate), onSurface) {
            openPlayStore()
        }
        bindDrawerItem(findViewById(R.id.drawerShare), "share1", getString(R.string.drawer_share), onSurface) {
            shareApp()
        }
        bindDrawerItem(findViewById(R.id.drawerExplore), "apps", getString(R.string.drawer_explore), onSurface) {}
    }

    private fun bindDrawerItem(root: android.view.View, iconName: String, label: String, tint: Int, onClick: () -> Unit) {
        val drawerBinding = DrawerItemBinding.bind(root)
        drawerBinding.drawerItemIcon.setImageDrawable(SvgIcon.load(this, "ui", iconName, dp(21), tint))
        drawerBinding.drawerItemLabel.text = label
        root.setOnClickListener {
            binding.drawerLayout.closeDrawers()
            onClick()
        }
    }

    private fun setupFab() {
        binding.fabNewCreation.setOnClickListener {
            startActivity(Intent(this, EditorActivity::class.java))
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

    private fun getColorAttr(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}