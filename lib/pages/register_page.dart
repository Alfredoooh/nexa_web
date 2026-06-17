import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/auth_api_service.dart';
import 'chat_page.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _passConfirmCtrl = TextEditingController();
  bool _passwordVisible = false;
  bool _passwordConfirmVisible = false;
  bool _loading = false;
  String? _error;

  Map<String, Color> _colors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? IPCApp.darkColors : IPCApp.lightColors;
  }

  Future<void> _register() async {
    if (_passCtrl.text != _passConfirmCtrl.text) {
      setState(() => _error = 'As passwords não coincidem.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    final user = await AuthApiService.register(_nameCtrl.text, _emailCtrl.text, _passCtrl.text);
    if (!mounted) return;
    setState(() => _loading = false);
    if (user != null) {
      context.read<AuthState>().setUser(user);
      Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ChatPage()), (route) => false);
    } else {
      setState(() => _error = 'Não foi possível criar a conta.');
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
          child: Column(
            children: [
              // AppBar custom — botão circular 40dp + título, igual ao Kotlin
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 16, 0),
                child: SizedBox(
                  height: 56,
                  child: Row(
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(color: colors['appbarBtnBg'], shape: BoxShape.circle),
                        child: IconButton(
                          padding: EdgeInsets.zero,
                          icon: SvgPicture.asset(
                            'assets/icons/svg/back_arrow.svg',
                            width: 18, height: 18,
                            colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
                          ),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ),
                      const SizedBox(width: 12),
                     Expanded(
                        child: Text('Criar conta',
                            style: TextStyle(
                              fontFamily: 'TimesNewRoman',
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: colors['textPrimary'],
                            )),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(32, 24, 32, 48),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Preenche os campos para começar',
                        style: TextStyle(fontSize: 15, color: colors['textSecondary']),
                      ),
                      const SizedBox(height: 32),

                      _authField(controller: _nameCtrl, hint: 'Nome completo', colors: colors),
                      const SizedBox(height: 14),
                      _authField(controller: _emailCtrl, hint: 'Email', colors: colors, keyboardType: TextInputType.emailAddress),
                      const SizedBox(height: 14),
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
                      const SizedBox(height: 14),
                      // Confirmar password — faltava por completo na versão anterior
                      _authField(
                        controller: _passConfirmCtrl,
                        hint: 'Confirmar password',
                        colors: colors,
                        obscure: !_passwordConfirmVisible,
                        trailing: GestureDetector(
                          onTap: () => setState(() => _passwordConfirmVisible = !_passwordConfirmVisible),
                          child: SvgPicture.asset(
                            _passwordConfirmVisible ? 'assets/icons/svg/eye.svg' : 'assets/icons/svg/eye_closed.svg',
                            width: 20, height: 20,
                            colorFilter: ColorFilter.mode(colors['iconTintSecondary']!, BlendMode.srcIn),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: Text(_error!, style: const TextStyle(fontSize: 13, color: Color(0xFFFF3B30)), textAlign: TextAlign.center),
                        ),

                      SizedBox(
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _register,
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
                              : const Text('Criar conta', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 16),

                      Row(children: [
                        Expanded(child: Divider(color: colors['divider'])),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text('ou', style: TextStyle(fontSize: 13, color: colors['textSecondary'])),
                        ),
                        Expanded(child: Divider(color: colors['divider'])),
                      ]),
                      const SizedBox(height: 16),

                      Opacity(
                        opacity: 0.5,
                        child: Container(
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
                          Text('Já tens conta? ', style: TextStyle(fontSize: 14, color: colors['textSecondary'])),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Text(
                              'Inicia sessão',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: colors['authBtnBg']),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
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