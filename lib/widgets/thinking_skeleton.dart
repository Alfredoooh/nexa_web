import 'package:flutter/material.dart';

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
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🧠 A pensar…', style: TextStyle(fontSize: 14, color: Colors.grey)),
          const SizedBox(height: 6),
          for (final widthFraction in [0.85, 0.7, 0.55])
            AnimatedBuilder(
              animation: _controller,
              builder: (_, child) => Opacity(
                opacity: _controller.value,
                child: child,
              ),
              child: Container(
                height: 12,
                width: MediaQuery.of(context).size.width * widthFraction * 0.78,
                margin: const EdgeInsets.only(bottom: 6),
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
        ],
      ),
    );
  }
}