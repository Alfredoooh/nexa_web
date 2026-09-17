package com.looply.social.icons

import com.looply.social.R

/**
 * Mapa de nomes de ícones em falta (do teu pack SVG) para o
 * equivalente mais próximo em Material Symbols Rounded, incluído
 * como drawables locais (ver instruções de setup no fim da entrega).
 *
 * Atualiza este mapa à medida que fores adicionando SVGs próprios —
 * remove a entrada daqui assim que o .svg existir em assets/icons/.
 */
object MaterialFallback {

    private val map = mapOf(
        "star" to R.drawable.ic_msr_star_rounded,
        "gradient" to R.drawable.ic_msr_gradient_rounded,
        "layers" to R.drawable.ic_msr_layers_rounded,
        "rotate" to R.drawable.ic_msr_rotate_right_rounded,
        "corner_radius" to R.drawable.ic_msr_rounded_corner_rounded,
        "stroke_width" to R.drawable.ic_msr_line_weight_rounded,
        "opacity" to R.drawable.ic_msr_opacity_rounded,
        "duplicate" to R.drawable.ic_msr_content_copy_rounded,
        "flip_horizontal" to R.drawable.ic_msr_flip_rounded,
        "align_top" to R.drawable.ic_msr_vertical_align_top_rounded,
        "align_bottom" to R.drawable.ic_msr_vertical_align_bottom_rounded,
        "shadow" to R.drawable.ic_msr_flare_rounded,
        "text_spacing" to R.drawable.ic_msr_format_letter_spacing_rounded,
        "line_height" to R.drawable.ic_msr_format_line_spacing_rounded,
        "grid" to R.drawable.ic_msr_grid_view_rounded,
        "component" to R.drawable.ic_msr_widgets_rounded
    )

    fun forName(name: String) = map[name]
}