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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? IPCApp.darkColors : IPCApp.lightColors;

    return Scaffold(
      backgroundColor: colors['background'],
      appBar: AppBar(
        backgroundColor: colors['appbarSolid'],
        title: Text('Definições', style: TextStyle(fontFamily: 'TimesNewRoman', color: colors['textPrimary'])),
        leading: IconButton(
          icon: SvgPicture.asset(
            'assets/icons/svg/back_arrow.svg',
            width: 12, height: 12,
            colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        children: [
          _section('Conta', colors, children: [
            _tile('Personalização', 'assets/icons/svg/customise.svg', colors, () {}),
            _tile('Controlo de Dados', 'assets/icons/svg/database.svg', colors, () {}),
            _tile('Segurança', 'assets/icons/svg/security.svg', colors, () {}),
          ]),
          const SizedBox(height: 32),
          _section('Aparência', colors, children: [
            ListTile(
              leading: SvgPicture.asset('assets/icons/svg/appearance.svg', width: 10, height: 10,
                  colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn)),
              title: Text('Tema', style: TextStyle(color: colors['textPrimary'])),
              trailing: Text('Claro', style: TextStyle(color: colors['textSecondary'])),
              onTap: () => _showThemeSheet(context, colors),
            ),
            ListTile(
              leading: SvgPicture.asset('assets/icons/svg/language.svg', width: 10, height: 10,
                  colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn)),
              title: Text('Idioma', style: TextStyle(color: colors['textPrimary'])),
              trailing: Text('Português', style: TextStyle(color: colors['textSecondary'])),
              onTap: () {},
            ),
          ]),
          const SizedBox(height: 32),
          ListTile(
            leading: Icon(Icons.logout, color: Colors.red),
            title: const Text('Sair', style: TextStyle(color: Colors.red)),
            onTap: () => _logout(context, auth),
          ),
        ],
      ),
    );
  }

  void _showThemeSheet(BuildContext context, Map<String, Color> colors) {
    showModalBottomSheet(
      context: context,
      backgroundColor: colors['dialogBackground'],
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: ['Claro', 'Escuro'].map((theme) => ListTile(
            title: Text(theme, style: TextStyle(color: colors['textPrimary'])),
            onTap: () => Navigator.pop(context),
          )).toList(),
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

  Widget _section(String title, Map<String, Color> colors, {required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 6),
          child: Text(title, style: TextStyle(fontSize: 12, color: colors['settings_section_label'])),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: colors['cardBackground'],
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _tile(String label, String icon, Map<String, Color> colors, VoidCallback onTap) {
    return ListTile(
      leading: SvgPicture.asset(icon, width: 10, height: 10,
          colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn)),
      title: Text(label, style: TextStyle(color: colors['textPrimary'])),
      trailing: SvgPicture.asset('assets/icons/svg/chevron_right.svg', width: 15, height: 15,
          colorFilter: ColorFilter.mode(colors['iconTintSecondary']!, BlendMode.srcIn)),
      onTap: onTap,
    );
  }
}