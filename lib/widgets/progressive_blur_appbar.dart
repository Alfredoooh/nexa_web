import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class ProgressiveBlurAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget title;
  final List<Widget> actions;
  final VoidCallback onMenuTap;
  final bool isDark;
  final Color iconColor;

  const ProgressiveBlurAppBar({
    super.key,
    required this.title,
    required this.actions,
    required this.onMenuTap,
    required this.isDark,
    required this.iconColor,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final topColor = isDark ? const Color(0xFF000000) : Colors.white;
    final blurTopOpacity = isDark ? 0.28 : 0.96;
    final blurMidOpacity = isDark ? 0.16 : 0.84;
    final blurLowOpacity = isDark ? 0.06 : 0.28;

    return ClipRect(
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
              child: const SizedBox.expand(),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: const [0.0, 0.18, 0.52, 1.0],
                  colors: [
                    topColor.withOpacity(blurTopOpacity),
                    topColor.withOpacity(blurMidOpacity),
                    topColor.withOpacity(blurLowOpacity),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.0, 0.45, 1.0],
                    colors: isDark
                        ? [
                            Colors.black.withOpacity(0.06),
                            Colors.black.withOpacity(0.02),
                            Colors.transparent,
                          ]
                        : [
                            Colors.white.withOpacity(0.10),
                            Colors.white.withOpacity(0.03),
                            Colors.transparent,
                          ],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: SizedBox(
              height: kToolbarHeight,
              child: Row(
                children: [
                  const SizedBox(width: 8),
                  _PulseTap(
                    onTap: onMenuTap,
                    child: SizedBox(
                      width: 40,
                      height: 40,
                      child: Center(
                        child: SvgPicture.asset(
                          'assets/icons/svg/menu.svg',
                          width: 16,
                          height: 16,
                          colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: title),
                  ...actions,
                  const SizedBox(width: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PulseTap extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;

  const _PulseTap({
    required this.child,
    required this.onTap,
  });

  @override
  State<_PulseTap> createState() => _PulseTapState();
}

class _PulseTapState extends State<_PulseTap> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTapDown: (_) => _setPressed(true),
      onTapCancel: () => _setPressed(false),
      onTapUp: (_) => _setPressed(false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.965 : 1.0,
        duration: const Duration(milliseconds: 110),
        curve: Curves.easeOut,
        child: AnimatedOpacity(
          opacity: _pressed ? 0.86 : 1.0,
          duration: const Duration(milliseconds: 110),
          child: widget.child,
        ),
      ),
    );
  }
}