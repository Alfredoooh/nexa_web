import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_api_service.dart';
import 'login_page.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text('Definições', style: TextStyle(fontFamily: 'TimesNewRoman')),
        leading: IconButton(
          icon: SvgPicture.asset('assets/icons/svg/back_arrow.svg', width: 12, height: 12),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        children: [
          _section('Conta', children: [
            _tile('Personalização', 'assets/icons/svg/customise.svg', () {}),
            _tile('Controlo de Dados', 'assets/icons/svg/database.svg', () {}),
            _tile('Segurança', 'assets/icons/svg/security.svg', () {}),
          ]),
          const SizedBox(height: 32),
          _section('Aparência', children: [
            ListTile(
              leading: SvgPicture.asset('assets/icons/svg/appearance.svg', width: 10, height: 10),
              title: const Text('Tema'),
              trailing: const Text('Claro'),
              onTap: () => _showThemeSheet(context),
            ),
            ListTile(
              leading: SvgPicture.asset('assets/icons/svg/language.svg', width: 10, height: 10),
              title: const Text('Idioma'),
              trailing: const Text('Português'),
              onTap: () {},
            ),
          ]),
          const SizedBox(height: 32),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Sair', style: TextStyle(color: Colors.red)),
            onTap: () => _logout(context),
          ),
        ],
      ),
    );
  }

  void _showThemeSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: ['Claro', 'Escuro'].map((theme) => ListTile(
            title: Text(theme),
            onTap: () => Navigator.pop(context),
          )).toList(),
        ),
      ),
    );
  }

  void _logout(BuildContext context) async {
    final token = context.read<AuthState>().user?.token ?? '';
    await AuthApiService.logout(token);
    context.read<AuthState>().clear();
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }

  Widget _section(String title, {required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 6),
          child: Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _tile(String label, String icon, VoidCallback onTap) {
    return ListTile(
      leading: SvgPicture.asset(icon, width: 10, height: 10),
      title: Text(label),
      trailing: SvgPicture.asset('assets/icons/svg/chevron_right.svg', width: 15, height: 15),
      onTap: onTap,
    );
  }
}