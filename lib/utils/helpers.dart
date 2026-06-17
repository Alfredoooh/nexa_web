import 'package:flutter/material.dart';

Color parseColor(String hex) {
  hex = hex.replaceFirst('#', '');
  if (hex.length == 6) hex = 'FF$hex';
  return Color(int.parse(hex, radix: 16));
}

double evaluateSimpleExpr(String expr, double x) {
  try {
    final e = expr
        .replaceAll('x', x.toString())
        .replaceAll('pi', '3.1415926535')
        .replaceAll('e', '2.7182818284');
    return _evalBasic(e);
  } catch (_) {
    return double.nan;
  }
}

double _evalBasic(String expr) {
  final parts = expr.split(RegExp(r'(\+|\-|\*|\/)'));
  if (parts.length == 2) {
    final a = double.tryParse(parts[0]) ?? 0;
    final b = double.tryParse(parts[1]) ?? 0;
    if (expr.contains('+')) return a + b;
    if (expr.contains('-')) return a - b;
    if (expr.contains('*')) return a * b;
    if (expr.contains('/')) return a / b;
  }
  return double.tryParse(expr) ?? 0;
}