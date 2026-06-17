import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/auth_api_service.dart';
import 'chat_page.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _passwordVisible = false;
  bool _loading = false;
  String? _error;

  Map<String, Color> _colors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? IPCApp.darkColors : IPCApp.lightColors;
  }

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    final user = await AuthApiService.login(_emailCtrl.text, _passCtrl.text);
    if (!mounted) return;
    setState(() => _loading = false);
    if (user != null) {
      context.read<AuthState>().setUser(user);
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ChatPage()));
    } else {
      setState(() => _error = 'Email ou password incorretos.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = _colors(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark
              ? null
              : const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFFFFFFF), Color(0xFFF0EEFF)],
                ),
          color: isDark ? colors['background'] : null,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(32, 72, 32, 48),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Image.asset('assets/icons/png/logo.png', width: 80, height: 80, fit: BoxFit.contain),
                  const SizedBox(height: 32),
                 Text(
                    'Bem-vindo',
                    style: TextStyle(
                      fontFamily: 'TimesNewRoman',
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: colors['textPrimary'],
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Entra na tua conta para continuar',
                    style: TextStyle(fontSize: 15, color: colors['textSecondary']),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 48),

                  // Email — sem ícone, igual ao Kotlin
                  _authField(
                    controller: _emailCtrl,
                    hint: 'Email',
                    colors: colors,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 14),

                  // Password — com toggle de visibilidade (eye / eye_closed)
                  _authField(
                    controller: _passCtrl,
                    hint: 'Password',
                    colors: colors,
                    obscure: !_passwordVisible,
                    trailing: GestureDetector(
                      onTap: () => setState(() => _passwordVisible = !_passwordVisible),
                      child: SvgPicture.asset(
                        _passwordVisible ? 'assets/icons/svg/eye.svg' : 'assets/icons/svg/eye_closed.svg',
                        width: 20, height: 20,
                        colorFilter: ColorFilter.mode(colors['iconTintSecondary']!, BlendMode.srcIn),
                      ),
                    ),
                  ),

                  Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(0, 8, 0, 20),
                      child: GestureDetector(
                        onTap: () {},
                        child: Text(
                          'Esqueceste a password?',
                          style: TextStyle(fontSize: 13, color: colors['authBtnBg']),
                        ),
                      ),
                    ),
                  ),

                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Text(_error!, style: const TextStyle(fontSize: 13, color: Color(0xFFFF3B30)), textAlign: TextAlign.center),
                    ),

                  // Botão Entrar — pill 28dp, igual ao auth_btn_bg
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors['authBtnBg'],
                        foregroundColor: colors['authBtnText'],
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                        elevation: 0,
                      ),
                      child: _loading
                          ? SizedBox(
                              width: 24, height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2.5, color: colors['authBtnText']),
                            )
                          : const Text('Entrar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Divisor "ou"
                  Row(children: [
                    Expanded(child: Divider(color: colors['divider'])),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text('ou', style: TextStyle(fontSize: 13, color: colors['textSecondary'])),
                    ),
                    Expanded(child: Divider(color: colors['divider'])),
                  ]),
                  const SizedBox(height: 16),

                  // Botão Google — desativado, alpha 0.5, igual ao Kotlin
                  Opacity(
                    opacity: 0.5,
                    child: Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(color: colors['authInputFill'], borderRadius: BorderRadius.circular(28)),
                      child: Row(
                        children: [
                          const SizedBox(width: 20),
                          Image.asset('assets/icons/png/google.png', width: 22, height: 22, fit: BoxFit.contain),
                          Expanded(
                            child: Center(
                              child: Text('Continuar com Google',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colors['textPrimary'])),
                            ),
                          ),
                          const SizedBox(width: 42),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Não tens conta? ', style: TextStyle(fontSize: 14, color: colors['textSecondary'])),
                      GestureDetector(
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterPage())),
                        child: Text(
                          'Regista-te',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: colors['authBtnBg']),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _authField({
    required TextEditingController controller,
    required String hint,
    required Map<String, Color> colors,
    bool obscure = false,
    TextInputType? keyboardType,
    Widget? trailing,
  }) {
    return Container(
      height: 56,
      padding: EdgeInsets.only(left: 20, right: trailing != null ? 16 : 20),
      decoration: BoxDecoration(color: colors['authInputFill'], borderRadius: BorderRadius.circular(28)),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              obscureText: obscure,
              keyboardType: keyboardType,
              style: TextStyle(fontSize: 15, color: colors['authInputText']),
              decoration: InputDecoration(
                isCollapsed: true,
                hintText: hint,
                hintStyle: TextStyle(color: colors['authInputHint']),
                border: InputBorder.none,
              ),
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing],
        ],
      ),
    );
  }
}