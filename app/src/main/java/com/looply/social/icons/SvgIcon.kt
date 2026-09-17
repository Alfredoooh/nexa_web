package com.looply.social.icons

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
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