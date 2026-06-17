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

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
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
            child: const Center(
              child: Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 20,
                color: Colors.black,
              ),
            ),
          ),
        ),
        title: const Text(
          'Definições',
          style: TextStyle(
            fontFamily: 'TimesNewRoman',
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: PulseTap(
              onTap: () => _logout(context, auth),
              child: const Center(
                child: Icon(
                  Icons.logout_rounded,
                  size: 22,
                  color: Colors.red,
                ),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        children: [
          _sectionTitle('Conta'),
          _tile(
            context: context,
            label: 'Personalização',
            icon: 'assets/icons/svg/customise.svg',
            trailing: null,
            onTap: () {},
          ),
          _divider(),
          _tile(
            context: context,
            label: 'Controlo de Dados',
            icon: 'assets/icons/svg/database.svg',
            trailing: null,
            onTap: () {},
          ),
          _divider(),
          _tile(
            context: context,
            label: 'Segurança',
            icon: 'assets/icons/svg/security.svg',
            trailing: null,
            onTap: () {},
          ),
          const SizedBox(height: 18),
          _sectionTitle('Aparência'),
          _tile(
            context: context,
            label: 'Tema',
            icon: 'assets/icons/svg/appearance.svg',
            trailing: Text(
              themeState.mode == ThemeMode.dark
                  ? 'Escuro'
                  : themeState.mode == ThemeMode.light
                      ? 'Claro'
                      : 'Sistema',
              style: const TextStyle(
                color: Color(0xFF7A7A7A),
                fontSize: 14,
              ),
            ),
            onTap: () => _showThemeSheet(context, themeState),
          ),
          _divider(),
          _tile(
            context: context,
            label: 'Idioma',
            icon: 'assets/icons/svg/language.svg',
            trailing: const Text(
              'Português',
              style: TextStyle(
                color: Color(0xFF7A7A7A),
                fontSize: 14,
              ),
            ),
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 6),
      child: Text(
        '',
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          letterSpacing: 0.8,
          color: Color(0xFF9A9A9A),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _divider() {
    return const Divider(
      height: 1,
      thickness: 0.6,
      indent: 20,
      endIndent: 20,
      color: Color(0xFFEDEDED),
    );
  }

  Widget _tile({
    required BuildContext context,
    required String label,
    required String icon,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return Column(
      children: [
        PulseTap(
          onTap: onTap,
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              children: [
                SvgPicture.asset(
                  icon,
                  width: 20,
                  height: 20,
                  colorFilter: const ColorFilter.mode(Colors.black, BlendMode.srcIn),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (trailing != null)
                  trailing
                else
                  const Icon(
                    Icons.chevron_right,
                    size: 18,
                    color: Color(0xFFB0B0B0),
                  ),
              ],
            ),
          ),
        ),
        const Padding(
          padding: EdgeInsets.only(left: 54),
          child: Divider(
            height: 1,
            thickness: 0.6,
            color: Color(0xFFEDEDED),
          ),
        ),
      ],
    );
  }

  void _showThemeSheet(BuildContext context, ThemeState themeState) {
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
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _modalOption(
                    label: 'Claro',
                    active: themeState.mode == ThemeMode.light,
                    onTap: () {
                      themeState.setTheme('light');
                      Navigator.pop(sheetContext);
                    },
                  ),
                  _modalDivider(),
                  _modalOption(
                    label: 'Escuro',
                    active: themeState.mode == ThemeMode.dark,
                    onTap: () {
                      themeState.setTheme('dark');
                      Navigator.pop(sheetContext);
                    },
                  ),
                  _modalDivider(),
                  _modalOption(
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

  Widget _modalDivider() {
    return const Divider(
      height: 1,
      thickness: 0.6,
      indent: 62,
      color: Color(0xFFEDEDED),
    );
  }

  Widget _modalOption({
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    return PulseTap(
      onTap: onTap,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            const SizedBox(width: 20, height: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                  color: Colors.black,
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
                decoration: const BoxDecoration(
                  color: Colors.black,
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