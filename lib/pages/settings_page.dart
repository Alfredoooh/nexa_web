// settings_page.dart
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
        title: const Text(
          'Definições',
          style: TextStyle(
            fontFamily: 'TimesNewRoman',
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: PulseTap(
            onTap: () => Navigator.pop(context),
            child: Center(
              child: SvgPicture.asset(
                'assets/icons/svg/back_arrow.svg',
                width: 18,
                height: 18,
                colorFilter: const ColorFilter.mode(Colors.black, BlendMode.srcIn),
              ),
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        children: [
          _simpleAction(
            context: context,
            title: 'Sair',
            icon: Icons.logout,
            iconColor: Colors.red,
            titleColor: Colors.red,
            onTap: () => _logout(context, auth),
          ),
          const SizedBox(height: 12),
          _sectionTitle('Conta'),
          _settingTile(
            context: context,
            label: 'Personalização',
            icon: 'assets/icons/svg/customise.svg',
            onTap: () {},
          ),
          _divider(),
          _settingTile(
            context: context,
            label: 'Controlo de Dados',
            icon: 'assets/icons/svg/database.svg',
            onTap: () {},
          ),
          _divider(),
          _settingTile(
            context: context,
            label: 'Segurança',
            icon: 'assets/icons/svg/security.svg',
            onTap: () {},
          ),
          const SizedBox(height: 18),
          _sectionTitle('Aparência'),
          _settingTile(
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
          _settingTile(
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

  Widget _settingTile({
    required BuildContext context,
    required String label,
    required String icon,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return PulseTap(
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
            if (trailing != null) trailing else const Icon(Icons.chevron_right, size: 18, color: Color(0xFFB0B0B0)),
          ],
        ),
      ),
    );
  }

  Widget _simpleAction({
    required BuildContext context,
    required String title,
    required IconData icon,
    required Color iconColor,
    required Color titleColor,
    required VoidCallback onTap,
  }) {
    return PulseTap(
      onTap: onTap,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 14),
            Text(
              title,
              style: TextStyle(
                color: titleColor,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showThemeSheet(BuildContext context, ThemeState themeState) {
    showModalBottomSheet(
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
                    onTap: () {
                      themeState.setTheme('light');
                      Navigator.pop(sheetContext);
                    },
                  ),
                  _modalDivider(),
                  _modalOption(
                    label: 'Escuro',
                    onTap: () {
                      themeState.setTheme('dark');
                      Navigator.pop(sheetContext);
                    },
                  ),
                  _modalDivider(),
                  _modalOption(
                    label: 'Sistema',
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
      onTapUp: widget.onTap == null
          ? null
          : (_) {
              _setPressed(false);
            },
      onTap: widget.onTap == null
          ? null
          : () {
              widget.onTap?.call();
            },
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