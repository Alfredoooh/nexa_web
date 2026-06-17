import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'models/user.dart';
import 'pages/login_page.dart';
import 'pages/chat_page.dart';

class AuthState extends ChangeNotifier {
  AuthUser? _user;
  AuthUser? get user => _user;

  Future<void> loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token != null) {
      final name = prefs.getString('auth_user_name') ?? '';
      final email = prefs.getString('auth_user_email') ?? '';
      final id = prefs.getString('auth_user_id') ?? '';
      _user = AuthUser(id: id, name: name, email: email, token: token);
      notifyListeners();
    }
  }

  void setUser(AuthUser user) async {
    _user = user;
    final prefs = await SharedPreferences.getInstance();
    prefs.setString('auth_token', user.token);
    prefs.setString('auth_user_name', user.name);
    prefs.setString('auth_user_email', user.email);
    prefs.setString('auth_user_id', user.id);
    notifyListeners();
  }

  void clear() async {
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}

class ThemeState extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  Future<void> loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final theme = prefs.getString('theme') ?? 'system';
    switch (theme) {
      case 'light': _mode = ThemeMode.light; break;
      case 'dark': _mode = ThemeMode.dark; break;
      default: _mode = ThemeMode.system;
    }
    notifyListeners();
  }

  void setTheme(String theme) async {
    switch (theme) {
      case 'light': _mode = ThemeMode.light; break;
      case 'dark': _mode = ThemeMode.dark; break;
      default: _mode = ThemeMode.system;
    }
    final prefs = await SharedPreferences.getInstance();
    prefs.setString('theme', theme);
    notifyListeners();
  }
}

class IPCApp extends StatelessWidget {
  const IPCApp({super.key});

  static const Color primary = Color(0xFF2F7BF6);

  static const Map<String, Color> lightColors = {
    'background': Color(0xFFFFFFFF),
    'appbarSolid': Color(0xFFFFFFFF),
    'bottomBarSolid': Color(0xFFFFFFFF),
    'textPrimary': Color(0xFF000000),
    'textSecondary': Color(0xFF888888),
    'textHint': Color(0xFFAAAAAA),
    // Pedido explícito: branco puro no claro (no Kotlin original é #F2F2F7,
    // mas a instrução atual sobrepõe-se a isso).
    'drawerBackground': Color(0xFFFFFFFF),
    'drawerText': Color(0xFF000000),
    'cardBackground': Color(0xFFF2F2F7),
    'dialogBackground': Color(0xFFF2F2F7),
    'divider': Color(0xFFE5E5EA),
    'iconTint': Color(0xFF000000),
    'iconTintSecondary': Color(0xFF888888),
    'sendBtnColor': Color(0xFF2F7BF6),
    'sendIconColor': Color(0xFFFFFFFF),
    'addCircleBg': Color(0xFFE8E8E8),
    'appbarBtnBg': Color(0xFFE8E8E8),
    'tabPreviewPillBg': Color(0xFFE0EBFE),
    'extrasCardActive': Color(0xFFEEF2FF),
    'extrasCardActiveText': Color(0xFF2F7BF6),
    'settings_section_label': Color(0xFF888888),
    'authInputFill': Color(0xFFF2F2F7),
    'authInputText': Color(0xFF000000),
    'authInputHint': Color(0xFFAAAAAA),
    'authBtnBg': Color(0xFF2F7BF6),
    'authBtnText': Color(0xFFFFFFFF),
  };

  static const Map<String, Color> darkColors = {
    'background': Color(0xFF121212),
    'appbarSolid': Color(0xFF121212),
    'bottomBarSolid': Color(0xFF1F1F1F),
    'textPrimary': Color(0xFFF2F2F2),
    'textSecondary': Color(0xFF939393),
    'textHint': Color(0xFF6E6E6E),
    'drawerBackground': Color(0xFF1F1F1F),
    'drawerText': Color(0xFFF2F2F2),
    'cardBackground': Color(0xFF1F1F1F),
    'dialogBackground': Color(0xFF1F1F1F),
    'divider': Color(0xFF2A2A2A),
    'iconTint': Color(0xFFF2F2F2),
    'iconTintSecondary': Color(0xFF939393),
    'sendBtnColor': Color(0xFF2F7BF6),
    'sendIconColor': Color(0xFFFFFFFF),
    'addCircleBg': Color(0xFF2C2C2E),
    'appbarBtnBg': Color(0xFF2C2C2E),
    'tabPreviewPillBg': Color(0xFF1F2D4A),
    'extrasCardActive': Color(0xFF1E2D4F),
    'extrasCardActiveText': Color(0xFFA8C8FA),
    'settings_section_label': Color(0xFF939393),
    'authInputFill': Color(0xFF1F1F1F),
    'authInputText': Color(0xFFF2F2F2),
    'authInputHint': Color(0xFF6E6E6E),
    'authBtnBg': Color(0xFF2F7BF6),
    'authBtnText': Color(0xFFFFFFFF),
  };

  static ThemeData _buildTheme(Brightness brightness, Map<String, Color> colors) {
    return ThemeData(
      brightness: brightness,
      primaryColor: primary,
      scaffoldBackgroundColor: colors['background'],
      // SEM fontFamily global: no Kotlin, Times New Roman só é usado em
      // pontos específicos (greeting, preview, títulos de auth). É aplicado
      // explicitamente nesses Text widgets, não aqui.
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: brightness,
        surface: colors['cardBackground']!,
        onSurface: colors['textPrimary']!,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: colors['iconTint']),
        titleTextStyle: TextStyle(
          color: colors['textPrimary'],
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors['authInputFill'],
        hintStyle: TextStyle(color: colors['authInputHint']),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeState>(
      builder: (context, themeState, _) {
        return MaterialApp(
          title: 'IPC',
          debugShowCheckedModeBanner: false,
          theme: _buildTheme(Brightness.light, lightColors),
          darkTheme: _buildTheme(Brightness.dark, darkColors),
          themeMode: themeState.mode,
          home: Consumer<AuthState>(
            builder: (context, authState, _) {
              return authState.user != null ? const ChatPage() : const LoginPage();
            },
          ),
        );
      },
    );
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authState = AuthState();
  final themeState = ThemeState();
  await authState.loadUser();
  await themeState.loadTheme();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authState),
        ChangeNotifierProvider.value(value: themeState),
        ChangeNotifierProvider(create: (_) => ChatState()),
      ],
      child: const IPCApp(),
    ),
  );
}