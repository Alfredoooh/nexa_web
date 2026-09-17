package com.looply.social.icons

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.caverock.androidsvg.SVG
import androidx.core.content.ContextCompat
import com.looply.social.R

/**
 * Carrega um SVG de assets/icons/<category>/<name>.svg e devolve um
 * Drawable colorido, pronto a aplicar num ImageView/MenuItem.
 *
 * category: "ui" ou "editor" (pastas reais dentro do teu zip de assets)
 *
 * Fallback: se o ficheiro não existir em assets, tenta resolver um
 * ícone Material Symbols Rounded equivalente via MaterialFallback —
 * assim nunca fica um espaço vazio na UI enquanto os SVGs em falta
 * não chegam.
 */
object SvgIcon {

    private val cache = mutableMapOf<String, SVG>()

    fun load(context: Context, category: String, name: String, sizePx: Int, tint: Int): Drawable {
        val path = "icons/$category/$name.svg"
        return try {
            val svg = cache.getOrPut(path) {
                context.assets.open(path).use { SVG.getFromInputStream(it) }
            }
            renderToDrawable(context, svg, sizePx, tint)
        } catch (e: Exception) {
            // Fallback: Material Symbols Rounded
            MaterialFallback.forName(name)?.let { resId ->
                val d = ContextCompat.getDrawable(context, resId)?.mutate()
                d?.setColorFilter(PorterDuffColorFilter(tint, PorterDuff.Mode.SRC_IN))
                d ?: ContextCompat.getDrawable(context, R.drawable.ic_fallback_generic)!!
            } ?: ContextCompat.getDrawable(context, R.drawable.ic_fallback_generic)!!
        }
    }

    private fun renderToDrawable(context: Context, svg: SVG, sizePx: Int, tint: Int): Drawable {
        svg.documentWidth = sizePx.toFloat()
        svg.documentHeight = sizePx.toFloat()
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        svg.renderToCanvas(canvas)
        val drawable = BitmapDrawable(context.resources, bitmap)
        drawable.setColorFilter(PorterDuffColorFilter(tint, PorterDuff.Mode.SRC_IN))
        return drawable
    }
}