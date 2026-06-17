import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../utils/helpers.dart';

// ─── Container comum para widgets ───
class WidgetContainer extends StatelessWidget {
  final String? title;
  final Widget child;
  const WidgetContainer({super.key, this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E5EA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              decoration: const BoxDecoration(
                color: Color(0xFFF5F7FA),
                borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
              ),
              child: Text(
                title!,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(height: 1),
          ],
          child,
        ],
      ),
    );
  }
}

// ─── Widget: Bar Chart (widget_bar) ───
class NativeBarChart extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeBarChart({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final title = json['title'] ?? 'Gráfico';
    final items = json['items'] as List<dynamic>? ?? [];
    if (items.isEmpty) return const SizedBox.shrink();

    final barItems = items.map((e) {
      final colorStr = e['color'] as String?;
      return _BarItem(
        label: e['label'] ?? '',
        value: (e['value'] as num).toDouble(),
        color: colorStr != null ? parseColor(colorStr) : const Color(0xFF6F5AF6),
      );
    }).toList();

    final maxVal = barItems.map((e) => e.value).reduce((a, b) => a > b ? a : b);

    return WidgetContainer(
      title: title,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: SizedBox(
          height: 256,
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: maxVal * 1.1,
              barGroups: barItems.asMap().entries.map((entry) {
                final i = entry.key;
                final item = entry.value;
                return BarChartGroupData(
                  x: i,
                  barRods: [
                    BarChartRodData(
                      toY: item.value,
                      color: item.color,
                      width: 22,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(7),
                        topRight: Radius.circular(7),
                      ),
                    ),
                  ],
                );
              }).toList(),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final idx = value.toInt();
                      if (idx < 0 || idx >= barItems.length) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          barItems[idx].label,
                          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        ),
                      );
                    },
                  ),
                ),
              ),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: maxVal / 4,
                getDrawingHorizontalLine: (value) => FlLine(
                  color: Colors.grey[200]!,
                  strokeWidth: 1,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BarItem {
  final String label;
  final double value;
  final Color color;
  _BarItem({required this.label, required this.value, required this.color});
}

// ─── Widget: Pie Chart (widget_pie) ───
class NativePieChart extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativePieChart({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final title = json['title'] ?? 'Gráfico de Pizza';
    final slices = json['slices'] as List<dynamic>? ?? [];
    if (slices.isEmpty) return const SizedBox.shrink();

    const colors = [
      Color(0xFF6F5AF6), Color(0xFFFF3B30), Color(0xFF34C759),
      Color(0xFFFF9500), Color(0xFF007AFF), Color(0xFFAF52DE),
    ];

    final items = slices.asMap().entries.map((entry) {
      final e = entry.value;
      final colorStr = e['color'] as String?;
      return _SliceItem(
        label: e['label'] ?? '',
        value: (e['value'] as num).toDouble(),
        color: colorStr != null ? parseColor(colorStr) : colors[entry.key % colors.length],
      );
    }).toList();

    final total = items.fold<double>(0, (sum, item) => sum + item.value);

    return WidgetContainer(
      title: title,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 180,
              width: 180,
              child: PieChart(
                PieChartData(
                  sections: items.map((item) {
                    final pct = total > 0 ? (item.value / total * 100) : 0.0;
                    return PieChartSectionData(
                      color: item.color,
                      value: item.value,
                      title: pct >= 5 ? '${pct.toStringAsFixed(0)}%' : '',
                      titleStyle: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      radius: 80,
                    );
                  }).toList(),
                  sectionsSpace: 2,
                  centerSpaceRadius: 0,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: items.map((item) {
                final pct = total > 0 ? (item.value / total * 100).toStringAsFixed(0) : '0';
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 10, height: 10,
                      decoration: BoxDecoration(
                        color: item.color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${item.label} ($pct%)',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _SliceItem {
  final String label;
  final double value;
  final Color color;
  _SliceItem({required this.label, required this.value, required this.color});
}

// ─── Widget: Table (widget_table) ───
class NativeTable extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeTable({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final headers = (json['headers'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
    final rows = (json['rows'] as List<dynamic>?)
        ?.map((r) => (r as List<dynamic>).map((e) => e.toString()).toList())
        .toList() ?? [];
    final aligns = (json['align'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

    if (rows.isEmpty && headers.isEmpty) return const SizedBox.shrink();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFBDBDBD)),
          color: Colors.white,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (headers.isNotEmpty)
              _TableRow(
                cells: headers,
                isHeader: true,
                aligns: aligns,
              ),
            for (int i = 0; i < rows.length; i++) ...[
              if (i > 0 || headers.isNotEmpty)
                const Divider(height: 1, thickness: 1, color: Color(0xFFBDBDBD)),
              _TableRow(
                cells: rows[i],
                aligns: aligns,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TableRow extends StatelessWidget {
  final List<String> cells;
  final bool isHeader;
  final List<String> aligns;

  const _TableRow({
    required this.cells,
    this.isHeader = false,
    required this.aligns,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        children: cells.asMap().entries.map((entry) {
          final i = entry.key;
          final text = entry.value;
          return [
            if (i > 0) const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFBDBDBD)),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(10),
                color: isHeader ? const Color(0xFFF2F2F2) : null,
                child: Text(
                  text,
                  style: GoogleFonts.tinos(
                    fontSize: 16,
                    fontWeight: isHeader ? FontWeight.bold : FontWeight.normal,
                    height: 1.2,
                  ),
                  textAlign: _parseAlign(i),
                ),
              ),
            ),
          ];
        }).expand((x) => x).toList(),
      ),
    );
  }

  TextAlign _parseAlign(int colIndex) {
    final a = aligns.length > colIndex ? aligns[colIndex] : (colIndex == 0 ? 'left' : 'center');
    switch (a) {
      case 'right': return TextAlign.right;
      case 'center': return TextAlign.center;
      default: return TextAlign.left;
    }
  }
}

// ─── Widget: Calendar (widget_calendar) ───
// Implementação simplificada usando TableCalendar
import 'package:table_calendar/table_calendar.dart';

class NativeCalendar extends StatefulWidget {
  final Map<String, dynamic> json;
  const NativeCalendar({super.key, required this.json});

  @override
  State<NativeCalendar> createState() => _NativeCalendarState();
}

class _NativeCalendarState extends State<NativeCalendar> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Map<String, List<Map<String, dynamic>>> eventsMap = {};

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _parseEvents();
  }

  void _parseEvents() {
    final eventsJson = widget.json['events'] as Map<String, dynamic>?;
    if (eventsJson != null) {
      eventsJson.forEach((key, value) {
        eventsMap[key] = (value as List<dynamic>)
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return WidgetContainer(
      title: null,
      child: Column(
        children: [
          TableCalendar(
            firstDay: DateTime(2020),
            lastDay: DateTime(2030),
            focusedDay: _focusedDay,
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay;
              });
            },
            calendarStyle: CalendarStyle(
              selectedDecoration: const BoxDecoration(
                color: Color(0xFF6F5AF6),
                shape: BoxShape.circle,
              ),
              todayDecoration: BoxDecoration(
                color: const Color(0xFF6F5AF6).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
            ),
          ),
          const Divider(),
          // Eventos do dia selecionado
          _buildEventsList(),
        ],
      ),
    );
  }

  Widget _buildEventsList() {
    final dateKey = _selectedDay != null
        ? '${_selectedDay!.year}-${_selectedDay!.month.toString().padLeft(2, '0')}-${_selectedDay!.day.toString().padLeft(2, '0')}'
        : '';
    final dayEvents = eventsMap[dateKey] ?? [];

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Eventos do dia',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 8),
          if (dayEvents.isEmpty)
            const Text('Nenhum evento neste dia',
                style: TextStyle(fontSize: 13, color: Colors.grey))
          else
            ...dayEvents.map((ev) => Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 10, height: 10,
                        decoration: BoxDecoration(
                          color: parseColor(ev['color'] ?? '#6F5AF6'),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(ev['name'] ?? '',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                            if (ev['time'] != null)
                              Text(ev['time'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
        ],
      ),
    );
  }
}

// ─── Widget: Code Block (widget_code) ───
class NativeCodeBlock extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeCodeBlock({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final lang = (json['language'] ?? 'CODE').toString().toUpperCase();
    final code = json['code'] ?? '';
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1B1B1B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF2F2F2F)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF2A2A2A),
              borderRadius: BorderRadius.vertical(top: Radius.circular(13)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(lang,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFF2F2F2),
                          letterSpacing: 0.5)),
                ),
                GestureDetector(
                  onTap: () => Clipboard.setData(ClipboardData(text: code)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF353535),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF4A4A4A)),
                    ),
                    child: SvgPicture.asset('assets/icons/copy.svg',
                        width: 14, height: 14,
                        colorFilter: const ColorFilter.mode(Color(0xFFF2F2F2), BlendMode.srcIn)),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFF2F2F2F)),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(16),
            child: SelectableText(
              code,
              style: const TextStyle(
                fontSize: 13,
                fontFamily: 'monospace',
                color: Color(0xFFE8E8E8),
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Widget: Timer (widget_timer) ───
class NativeTimer extends StatefulWidget {
  final Map<String, dynamic> json;
  const NativeTimer({super.key, required this.json});

  @override
  State<NativeTimer> createState() => _NativeTimerState();
}

class _NativeTimerState extends State<NativeTimer> with SingleTickerProviderStateMixin {
  late int elapsedMs;
  bool running = false;
  Timer? _timer;
  DateTime? _startTime;
  int _startElapsed = 0;

  @override
  void initState() {
    super.initState();
    final initialMs = widget.json['milliseconds'] as int? ?? 0;
    final isCountdown = widget.json['countdown'] as bool? ?? false;
    elapsedMs = isCountdown && initialMs > 0 ? initialMs : 0;
    if (widget.json['autoStart'] as bool? ?? true) _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    if (running) return;
    setState(() {
      running = true;
      _startTime = DateTime.now();
      _startElapsed = elapsedMs;
    });
    _timer = Timer.periodic(const Duration(milliseconds: 10), (_) {
      if (!running) return;
      final delta = DateTime.now().difference(_startTime!).inMilliseconds;
      final isCountdown = widget.json['countdown'] as bool? ?? false;
      final initialMs = widget.json['milliseconds'] as int? ?? 0;
      setState(() {
        if (isCountdown && initialMs > 0) {
          elapsedMs = (_startElapsed - delta).clamp(0, initialMs);
          if (elapsedMs == 0) _stopTimer();
        } else {
          elapsedMs = _startElapsed + delta;
        }
      });
    });
  }

  void _stopTimer() {
    _timer?.cancel();
    setState(() => running = false);
  }

  void _resetTimer() {
    _stopTimer();
    final isCountdown = widget.json['countdown'] as bool? ?? false;
    final initialMs = widget.json['milliseconds'] as int? ?? 0;
    setState(() => elapsedMs = isCountdown && initialMs > 0 ? initialMs : 0);
  }

  String _formatTime(int ms) {
    final totalCs = ms ~/ 10;
    final cs = totalCs % 100;
    final totalSec = totalCs ~/ 100;
    final sec = totalSec % 60;
    final min = (totalSec ~/ 60) % 60;
    final hr = totalSec ~/ 3600;
    return '${hr.toString().padLeft(2, '0')}:${min.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}:${cs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.json['label'] as String? ?? '';
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E5EA)),
      ),
      child: Column(
        children: [
          if (label.isNotEmpty)
            Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text(
            _formatTime(elapsedMs),
            style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _timerButton(
                icon: running ? Icons.pause : Icons.play_arrow,
                onTap: running ? _stopTimer : _startTimer,
              ),
              const SizedBox(width: 8),
              _timerButton(
                icon: Icons.refresh,
                onTap: _resetTimer,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _timerButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44, height: 44,
        decoration: const BoxDecoration(
          color: Color(0xFF6F5AF6),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 18),
      ),
    );
  }
}

// ─── Widget: Math Graph (widget_graph) ───
class NativeMathGraph extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeMathGraph({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final expression = json['expression'] as String? ?? 'x';
    final xMin = (json['xMin'] as num?)?.toDouble() ?? -10;
    final xMax = (json['xMax'] as num?)?.toDouble() ?? 10;
    final title = json['title'] as String? ?? '';

    return WidgetContainer(
      title: title.isNotEmpty ? title : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 220,
          child: CustomPaint(
            painter: _MathGraphPainter(
              expression: expression,
              xMin: xMin,
              xMax: xMax,
            ),
          ),
        ),
      ),
    );
  }
}

class _MathGraphPainter extends CustomPainter {
  final String expression;
  final double xMin, xMax;
  _MathGraphPainter({required this.expression, required this.xMin, required this.xMax});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF6F5AF6)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final gridPaint = Paint()
      ..color = const Color(0xFFE5E5EA)
      ..strokeWidth = 1;

    final steps = 200;
    final path = Path();
    bool firstPoint = true;

    for (int i = 0; i <= steps; i++) {
      final x = xMin + (xMax - xMin) * i / steps;
      final y = evaluateSimpleExpr(expression, x);
      if (y.isFinite) {
        final px = ((x - xMin) / (xMax - xMin)) * size.width;
        final py = size.height / 2 - y * 20;
        if (firstPoint) {
          path.moveTo(px, py);
          firstPoint = false;
        } else {
          path.lineTo(px, py);
        }
      }
    }

    // Grid
    for (int i = 0; i <= 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// ─── Widget: Mind Map (widget_mindmap) ───
class NativeMindMap extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeMindMap({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final root = _MindNode.fromJson(json);
    final title = json['title'] as String? ?? '';

    return WidgetContainer(
      title: title.isNotEmpty ? title : null,
      child: SizedBox(
        height: 280,
        child: CustomPaint(
          painter: _MindMapPainter(root: root),
        ),
      ),
    );
  }
}

class _MindNode {
  final String label;
  final Color color;
  final List<_MindNode> children;
  _MindNode({required this.label, required this.color, this.children = const []});

  factory _MindNode.fromJson(Map<String, dynamic> json) {
    final colorStr = json['color'] as String?;
    final childrenJson = json['children'] as List<dynamic>?;
    return _MindNode(
      label: json['label'] ?? '',
      color: colorStr != null ? parseColor(colorStr) : const Color(0xFF6F5AF6),
      children: childrenJson?.map((e) => _MindNode.fromJson(Map<String, dynamic>.from(e))).toList() ?? [],
    );
  }
}

class _MindMapPainter extends CustomPainter {
  final _MindNode root;
  _MindMapPainter({required this.root});

  @override
  void paint(Canvas canvas, Size size) {
    // Simplificado: apenas desenha o nó raiz
    final paint = Paint()..color = root.color;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(20, size.height / 2 - 14, 60, 28),
        const Radius.circular(8),
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// ─── Widget: Market (widget_market) ───
class NativeMarket extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeMarket({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final name = json['name'] ?? 'Ativo';
    final symbol = json['symbol'] ?? '';
    final priceStr = json['price_str'] ?? '—';
    final change = (json['change'] as num?)?.toDouble() ?? 0;
    final isUp = change >= 0;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E5EA)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F0F0),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    symbol.isNotEmpty ? symbol.substring(0, 3).toUpperCase() : name.substring(0, 2).toUpperCase(),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                      Text(symbol, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(priceStr, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    if (change != 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isUp
                              ? const Color(0xFF22C55E).withOpacity(0.1)
                              : const Color(0xFFEF4444).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${isUp ? "▲" : "▼"} ${change.abs().toStringAsFixed(2)}%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isUp ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          // Linha de tempo simplificada
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: ['1D', '1S', '1M', '3M', '1A']
                .map((e) => Text(e, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)))
                .toList(),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ─── Widget: Map Placeholder (widget_map) ───
class NativeMapPlaceholder extends StatelessWidget {
  final Map<String, dynamic> json;
  const NativeMapPlaceholder({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    final locationName = json['location'] ?? 'Localização';
    final lat = (json['lat'] as num?)?.toDouble() ?? 0;
    final lng = (json['lng'] as num?)?.toDouble() ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E5EA)),
      ),
      child: Column(
        children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
              color: const Color(0xFFCDD8E0),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: const Center(
              child: Icon(Icons.location_on, size: 40, color: Color(0xFFFF3B30)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Row(
              children: [
                const Icon(Icons.pin_drop, size: 16, color: Color(0xFF6F5AF6)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(locationName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      Text('${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}',
                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {/* abrir mapa */},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6F5AF6),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                  child: const Text('Abrir', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Dispatcher principal que escolhe o widget com base no tipo ───
Widget buildNativeWidget(String widgetType, String jsonData) {
  try {
    final json = jsonDecode(jsonData) as Map<String, dynamic>;
    switch (widgetType) {
      case 'widget_bar': return NativeBarChart(json: json);
      case 'widget_pie': return NativePieChart(json: json);
      case 'widget_table': return NativeTable(json: json);
      case 'widget_calendar': return NativeCalendar(json: json);
      case 'widget_code': return NativeCodeBlock(json: json);
      case 'widget_timer': return NativeTimer(json: json);
      case 'widget_graph': return NativeMathGraph(json: json);
      case 'widget_mindmap': return NativeMindMap(json: json);
      case 'widget_market': return NativeMarket(json: json);
      case 'widget_map': return NativeMapPlaceholder(json: json);
      default: return const Text('Widget desconhecido');
    }
  } catch (e) {
    return Text('Erro ao carregar widget: $e');
  }
}