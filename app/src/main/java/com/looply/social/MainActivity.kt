package com.looply.social

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import androidx.appcompat.app.AppCompatActivity
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
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupIcons()
        setupBottomNav()
        setupDrawer()
        setupFab()

        if (savedInstanceState == null) {
            switchTab(Tab.HOME)
        }
    }

    private fun setupIcons() {
        val onSurface = getColorAttr(com.google.android.material.R.attr.colorOnSurface)
        val primary = getColorAttr(com.google.android.material.R.attr.colorPrimary)
        val variant = getColorAttr(com.google.android.material.R.attr.colorOnSurfaceVariant)

        binding.btnMenu.icon = SvgIcon.load(this, "ui", "menu", dp(20), onSurface)
        binding.fabNewCreation.setImageDrawable(
            SvgIcon.load(this, "ui", "add", dp(24), getColorAttr(com.google.android.material.R.attr.colorOnPrimary))
        )

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
        val fragment = when (tab) {
            Tab.HOME -> HomeFragment()
            Tab.CREATIONS -> CreationsFragment()
            Tab.TEMPLATES -> TemplatesFragment()
        }
        supportFragmentManager.commit {
            replace(R.id.fragmentContainer, fragment)
        }
        binding.topBarTitle.text = when (tab) {
            Tab.HOME -> getString(R.string.nav_home)
            Tab.CREATIONS -> getString(R.string.nav_creations)
            Tab.TEMPLATES -> getString(R.string.nav_templates)
        }
        updateNavHighlight()
    }

    private fun updateNavHighlight() {
        val primary = getColorAttr(com.google.android.material.R.attr.colorPrimary)
        val variant = getColorAttr(com.google.android.material.R.attr.colorOnSurfaceVariant)

        binding.navHomeIcon.setImageDrawable(
            SvgIcon.load(this, "ui", "apps", dp(22), if (currentTab == Tab.HOME) primary else variant)
        )
        binding.navCreationsIcon.setImageDrawable(
            SvgIcon.load(this, "ui", "library", dp(22), if (currentTab == Tab.CREATIONS) primary else variant)
        )
        binding.navTemplatesIcon.setImageDrawable(
            SvgIcon.load(this, "ui", "stacks", dp(22), if (currentTab == Tab.TEMPLATES) primary else variant)
        )
    }

    private fun setupDrawer() {
        binding.btnMenu.setOnClickListener {
            binding.drawerLayout.openDrawer(Gravity.START)
        }

        val onSurface = getColorAttr(com.google.android.material.R.attr.colorOnSurface)

        bindDrawerItem(findViewById(R.id.drawerSettings), "settings", getString(R.string.drawer_settings), onSurface) {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        bindDrawerItem(findViewById(R.id.drawerRate), "thumbs_up", getString(R.string.drawer_rate), onSurface) {
            openPlayStore()
        }
        bindDrawerItem(findViewById(R.id.drawerShare), "share1", getString(R.string.drawer_share), onSurface) {
            shareApp()
        }
        bindDrawerItem(findViewById(R.id.drawerExplore), "apps", getString(R.string.drawer_explore), onSurface) {
            // TODO: link para outros apps
        }
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
        val typedValue = android.util.TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}