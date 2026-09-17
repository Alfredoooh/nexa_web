package com.looply.social.icons

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import com.caverock.androidsvg.SVG

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
            ColorDrawable(Color.TRANSPARENT)
        }
    }

    private fun renderToDrawable(context: Context, svg: SVG, sizePx: Int, tint: Int): Drawable {
        // Não forçar documentWidth/Height — deixa o SVG usar o seu viewBox natural
        // e escalar via Matrix para evitar distorção nas linhas (causa do bold falso)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(Color.TRANSPARENT)
        val canvas = Canvas(bitmap)

        val vb = svg.documentViewBox
        if (vb != null && vb.width() > 0 && vb.height() > 0) {
            val scale = sizePx / maxOf(vb.width(), vb.height())
            val dx = (sizePx - vb.width() * scale) / 2f
            val dy = (sizePx - vb.height() * scale) / 2f
            canvas.translate(dx, dy)
            canvas.scale(scale, scale)
        } else {
            // fallback: forçar tamanho se não tiver viewBox
            svg.documentWidth = sizePx.toFloat()
            svg.documentHeight = sizePx.toFloat()
        }

        svg.renderToCanvas(canvas)

        val drawable = BitmapDrawable(context.resources, bitmap)
        drawable.setColorFilter(PorterDuffColorFilter(tint, PorterDuff.Mode.SRC_IN))
        return drawable
    }
}