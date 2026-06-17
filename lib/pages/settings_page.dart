// lib/pages/settings_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/auth_api_service.dart';
import 'login_page.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final themeState = context.watch<ThemeState>();
    final theme = Theme.of(context);

    final bg = theme.scaffoldBackgroundColor;
    final surface = theme.colorScheme.surface;
    final textPrimary = theme.colorScheme.onSurface;
    final textSecondary = theme.hintColor;
    final iconColor = theme.iconTheme.color ?? textPrimary;
    final dividerColor = theme.dividerColor;
    final dangerColor = Colors.red.shade600;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        titleSpacing: 0,
        leadingWidth: 56,
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: PulseTap(
            onTap: () => Navigator.pop(context),
            child: Center(
              child: SvgPicture.asset(
                'assets/icons/svg/back_arrow.svg',
                width: 18,
                height: 18,
                colorFilter: ColorFilter.mode(textPrimary, BlendMode.srcIn),
              ),
            ),
          ),
        ),
        title: Text(
          'Definições',
          style: TextStyle(
            fontFamily: 'TimesNewRoman',
            fontWeight: FontWeight.bold,
            color: textPrimary,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: PulseTap(
              onTap: () => _logout(context, auth),
              child: Center(
                child: Icon(
                  Icons.logout_rounded,
                  size: 22,
                  color: dangerColor,
                ),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        children: [
          _sectionTitle('Conta', textSecondary),
          _tile(
            context: context,
            label: 'Personalização',
            icon: 'assets/icons/svg/customise.svg',
            iconColor: iconColor,
            textColor: textPrimary,
            onTap: () {},
          ),
          _tile(
            context: context,
            label: 'Controlo de Dados',
            icon: 'assets/icons/svg/database.svg',
            iconColor: iconColor,
            textColor: textPrimary,
            onTap: () {},
          ),
          _tile(
            context: context,
            label: 'Segurança',
            icon: 'assets/icons/svg/security.svg',
            iconColor: iconColor,
            textColor: textPrimary,
            onTap: () {},
          ),
          const SizedBox(height: 18),
          _sectionTitle('Aparência', textSecondary),
          _tile(
            context: context,
            label: 'Tema',
            icon: 'assets/icons/svg/appearance.svg',
            iconColor: iconColor,
            textColor: textPrimary,
            trailing: Text(
              themeState.mode == ThemeMode.dark
                  ? 'Escuro'
                  : themeState.mode == ThemeMode.light
                      ? 'Claro'
                      : 'Sistema',
              style: TextStyle(
                color: textSecondary,
                fontSize: 14,
              ),
            ),
            onTap: () => _showThemeSheet(context, themeState, surface),
          ),
          _tile(
            context: context,
            label: 'Idioma',
            icon: 'assets/icons/svg/language.svg',
            iconColor: iconColor,
            textColor: textPrimary,
            trailing: Text(
              'Português',
              style: TextStyle(
                color: textSecondary,
                fontSize: 14,
              ),
            ),
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          letterSpacing: 0.8,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _tile({
    required BuildContext context,
    required String label,
    required String icon,
    required Color iconColor,
    required Color textColor,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return PulseTap(
      onTap: onTap,
      child: Container(
        color: Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            SvgPicture.asset(
              icon,
              width: 20,
              height: 20,
              colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: textColor,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (trailing != null)
              trailing
            else
              Icon(
                Icons.chevron_right,
                size: 18,
                color: textColor.withOpacity(0.35),
              ),
          ],
        ),
      ),
    );
  }

  void _showThemeSheet(BuildContext context, ThemeState themeState, Color surface) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: SafeArea(
            top: false,
            child: Container(
              decoration: BoxDecoration(
                color: surface,
                borderRadius: BorderRadius.circular(16),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _modalOption(
                    context: sheetContext,
                    label: 'Claro',
                    active: themeState.mode == ThemeMode.light,
                    onTap: () {
                      themeState.setTheme('light');
                      Navigator.pop(sheetContext);
                    },
                  ),
                  _modalOption(
                    context: sheetContext,
                    label: 'Escuro',
                    active: themeState.mode == ThemeMode.dark,
                    onTap: () {
                      themeState.setTheme('dark');
                      Navigator.pop(sheetContext);
                    },
                  ),
                  _modalOption(
                    context: sheetContext,
                    label: 'Sistema',
                    active: themeState.mode == ThemeMode.system,
                    onTap: () {
                      themeState.setTheme('system');
                      Navigator.pop(sheetContext);
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _modalOption({
    required BuildContext context,
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    final textColor = theme.colorScheme.onSurface;
    final accent = theme.colorScheme.primary;

    return PulseTap(
      onTap: onTap,
      child: Container(
        color: Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            const SizedBox(width: 20, height: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  color: textColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            AnimatedOpacity(
              duration: const Duration(milliseconds: 120),
              opacity: active ? 1 : 0,
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _logout(BuildContext context, AuthState auth) async {
    final token = auth.user?.token ?? '';
    await AuthApiService.logout(token);
    auth.clear();
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }
}

class PulseTap extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const PulseTap({
    super.key,
    required this.child,
    required this.onTap,
  });

  @override
  State<PulseTap> createState() => _PulseTapState();
}

class _PulseTapState extends State<PulseTap> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTapDown: widget.onTap == null ? null : (_) => _setPressed(true),
      onTapCancel: widget.onTap == null ? null : () => _setPressed(false),
      onTapUp: widget.onTap == null ? null : (_) => _setPressed(false),
      onTap: widget.onTap == null ? null : widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
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