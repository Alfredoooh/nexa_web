import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/auth_api_service.dart';
import 'chat_page.dart';

class RegisterPage extends StatelessWidget {
  const RegisterPage({super.key});

  Map<String, Color> _colors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? IPCApp.darkColors : IPCApp.lightColors;
  }

  @override
  Widget build(BuildContext context) {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final colors = _colors(context);

    return Scaffold(
      backgroundColor: colors['background'],
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: SvgPicture.asset(
            'assets/icons/svg/back_arrow.svg',
            width: 24,
            height: 24,
            colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  decoration: BoxDecoration(
                    boxShadow: [
                      BoxShadow(
                        color: colors['textPrimary']!.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Image.asset('assets/icons/png/logo.png', width: 80, height: 80),
                ),
                const SizedBox(height: 24),
                Text(
                  'IPC',
                  style: TextStyle(
                    fontFamily: 'TimesNewRoman',
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    color: colors['textPrimary'],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Criar conta',
                  style: TextStyle(
                    fontSize: 16,
                    color: colors['textSecondary'],
                  ),
                ),
                const SizedBox(height: 40),
                _buildTextField(
                  controller: nameCtrl,
                  hint: 'Nome',
                  icon: 'assets/icons/svg/user.svg',
                  colors: colors,
                  obscure: false,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: emailCtrl,
                  hint: 'Email',
                  icon: 'assets/icons/svg/mail.svg',
                  colors: colors,
                  obscure: false,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: passCtrl,
                  hint: 'Password',
                  icon: 'assets/icons/svg/lock.svg',
                  colors: colors,
                  obscure: true,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () async {
                    final user = await AuthApiService.register(
                      nameCtrl.text,
                      emailCtrl.text,
                      passCtrl.text,
                    );
                    if (user != null) {
                      context.read<AuthState>().setUser(user);
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const ChatPage()),
                        (route) => false,
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Erro ao criar conta')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors['authBtnBg'],
                    foregroundColor: colors['authBtnText'],
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('Criar conta', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Já tem conta? ',
                      style: TextStyle(color: colors['textSecondary']),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Text(
                        'Iniciar sessão',
                        style: TextStyle(
                          color: IPCApp.primary,
                          fontWeight: FontWeight.bold,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required String icon,
    required Map<String, Color> colors,
    required bool obscure,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: TextStyle(color: colors['authInputText']),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: colors['authInputHint']),
        prefixIcon: Padding(
          padding: const EdgeInsets.all(14),
          child: SvgPicture.asset(
            icon,
            width: 20,
            height: 20,
            colorFilter: ColorFilter.mode(colors['authInputHint']!, BlendMode.srcIn),
          ),
        ),
        filled: true,
        fillColor: colors['authInputFill'],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: IPCApp.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 18),
      ),
    );
  }
}