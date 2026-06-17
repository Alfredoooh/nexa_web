import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import '../main.dart';

class ThinkingSkeleton extends StatefulWidget {
  const ThinkingSkeleton({super.key});

  @override
  State<ThinkingSkeleton> createState() => _ThinkingSkeletonState();
}

class _ThinkingSkeletonState extends State<ThinkingSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    // Kotlin: ValueAnimator.ofFloat(0.4f, 1f, 0.4f), duration=1200ms, INFINITE
    // -> ciclo completo (subida+descida) de 1200ms = 600ms de ida + 600ms de volta.
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? IPCApp.darkColors : IPCApp.lightColors;
    final screenWidth = MediaQuery.of(context).size.width;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 4, 8, 6),
            child: Text(
              '🧠 A pensar…',
              style: TextStyle(fontSize: 14, color: colors['textSecondary']),
            ),
          ),
          for (final widthFraction in [0.85, 0.7, 0.55])
            AnimatedBuilder(
              animation: _controller,
              builder: (_, child) {
                final opacity = 0.4 + (_controller.value * 0.6); // 0.4 -> 1.0 -> 0.4
                return Opacity(opacity: opacity, child: child);
              },
              child: Container(
                height: 12,
                width: screenWidth * widthFraction * 0.78,
                margin: const EdgeInsets.only(bottom: 6),
                decoration: BoxDecoration(
                  color: colors['cardBackground'],
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Equivalente exato ao buildLoaderView() do Kotlin: container 48x48dp
/// com LottieAnimationView a tocar icons/lottie/loader.json em loop infinito.
class ChatLoader extends StatelessWidget {
  const ChatLoader({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Lottie.asset(
        'assets/icons/lottie/loader.json',
        repeat: true,
        animate: true,
      ),
    );
  }
}