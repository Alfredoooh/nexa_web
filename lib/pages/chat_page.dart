// chat_page.dart
import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../models/user.dart';
import '../models/chat_message.dart';
import '../services/auth_api_service.dart';
import '../widgets/message_bubble.dart';
import 'settings_page.dart';

class ChatState extends ChangeNotifier {
  String currentConversationId = '';
  String currentConversationTitle = 'Nova conversa';
  bool titleGenerated = false;
  List<ChatMessage> chatHistory = [];
  List<DisplayMessage> displayMessages = [];
  bool flashMode = false;
  bool thinkMoreMode = false;
  bool sheetsEnabled = false;
  bool isStreaming = false;

  void addUserMessage(String text) {
    chatHistory.add(ChatMessage(role: 'user', content: text));
    displayMessages.add(DisplayMessage(role: 'user', content: text));
    notifyListeners();
  }

  void addAssistantPlaceholder() {
    final ai = DisplayMessage(role: 'assistant', content: '', isStreaming: true);
    displayMessages.add(ai);
    notifyListeners();
  }

  void updateAssistantMessage(int index, DisplayMessage updated) {
    displayMessages[index] = updated;
    notifyListeners();
  }

  void finishAssistantMessage(int index, String content, String thinking) {
    final msg = displayMessages[index];
    msg.content = content;
    msg.isStreaming = false;
    msg.isThinking = false;
    msg.thinkingContent = '';
    chatHistory.add(ChatMessage(role: 'assistant', content: content));
    notifyListeners();
  }

  void resetConversation() {
    currentConversationId = '';
    currentConversationTitle = 'Nova conversa';
    titleGenerated = false;
    chatHistory.clear();
    displayMessages.clear();
    notifyListeners();
  }

  void toggleFlashMode() {
    flashMode = !flashMode;
    if (flashMode) thinkMoreMode = false;
    notifyListeners();
  }

  void toggleThinkMoreMode() {
    thinkMoreMode = !thinkMoreMode;
    if (thinkMoreMode) flashMode = false;
    notifyListeners();
  }

  void toggleSheets() {
    sheetsEnabled = !sheetsEnabled;
    notifyListeners();
  }
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _sendBtnVisible = false;
  List<Conversation> _conversations = [];
  double _appBarBlurProgress = 0.0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_handleScroll);
    _loadConversations();
  }

  @override
  void dispose() {
    _scrollController.removeListener(_handleScroll);
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleScroll() {
    if (!mounted) return;
    final offset = _scrollController.hasClients ? _scrollController.offset : 0.0;
    final progress = (offset / 120.0).clamp(0.0, 1.0);
    if (progress != _appBarBlurProgress) {
      setState(() => _appBarBlurProgress = progress);
    }
  }

  Future<void> _loadConversations() async {
    final token = context.read<AuthState>().user?.token ?? '';
    final list = await AuthApiService.listConversations(token);
    if (!mounted) return;
    setState(() => _conversations = list);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    final state = context.read<ChatState>();
    if (state.isStreaming) return;

    state.addUserMessage(text);
    _inputController.clear();
    if (mounted) {
      setState(() => _sendBtnVisible = false);
    }
    _scrollToBottom();

    if (!state.titleGenerated) {
      state.titleGenerated = true;
      final parts = text.trim().split(RegExp(r'\s+')).take(4).join(' ');
      state.currentConversationTitle = parts.length > 40 ? parts.substring(0, 40) : parts;
    }

    state.isStreaming = false;
  }

  Map<String, Color> _colors() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? IPCApp.darkColors : IPCApp.lightColors;
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final colors = _colors();
    final auth = context.watch<AuthState>();
    final state = context.watch<ChatState>();

    final appBarBlur = 18.0 * _appBarBlurProgress;
    final appBarOverlayOpacity = 0.22 * _appBarBlurProgress;
    final appBarBottomFade = 1.0 - _appBarBlurProgress;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: colors['background'],
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: ClipRect(
          child: Stack(
            children: [
              Positioned.fill(
                child: BackdropFilter(
                  filter: ImageFilter.blur(
                    sigmaX: appBarBlur,
                    sigmaY: appBarBlur,
                  ),
                  child: Container(
                    color: Colors.white.withOpacity(appBarOverlayOpacity),
                  ),
                ),
              ),
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.white.withOpacity(0.34 * _appBarBlurProgress),
                          Colors.white.withOpacity(0.14 * _appBarBlurProgress),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.45, 1.0],
                      ),
                    ),
                  ),
                ),
              ),
              AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                scrolledUnderElevation: 0,
                surfaceTintColor: Colors.transparent,
                shadowColor: Colors.transparent,
                titleSpacing: 8,
                title: null,
                leading: Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: PulseTap(
                    onTap: () {
                      _loadConversations();
                      _scaffoldKey.currentState?.openDrawer();
                    },
                    circular: true,
                    child: Center(
                      child: SvgPicture.asset(
                        'assets/icons/svg/menu.svg',
                        width: 16,
                        height: 16,
                        colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
                      ),
                    ),
                  ),
                ),
                actions: [
                  if (state.displayMessages.isNotEmpty)
                    PulseTap(
                      onTap: () => state.resetConversation(),
                      circular: true,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: SvgPicture.asset(
                          'assets/icons/svg/new_chat.svg',
                          width: 17,
                          height: 17,
                          colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
                        ),
                      ),
                    ),
                  if (state.displayMessages.isNotEmpty)
                    PulseTap(
                      onTap: () => _showAddPopup(context, colors),
                      circular: true,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: SvgPicture.asset(
                          'assets/icons/svg/more_vertical.svg',
                          width: 16,
                          height: 16,
                          colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
                        ),
                      ),
                    ),
                  const SizedBox(width: 8),
                ],
              ),
            ],
          ),
        ),
      ),
      drawer: Drawer(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: colors['drawerBackground'],
        width: MediaQuery.of(context).size.width * 0.75,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 12),
                child: Text(
                  'IPC',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: colors['drawerText'],
                  ),
                ),
              ),
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: IPCApp.primary,
                  child: Text(
                    (auth.user?.name ?? 'U').substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                title: Text(
                  auth.user?.name ?? 'Utilizador',
                  style: TextStyle(color: colors['drawerText']),
                ),
                subtitle: Text(
                  auth.user?.email ?? '',
                  style: TextStyle(color: colors['textSecondary']),
                ),
                trailing: SvgPicture.asset(
                  'assets/icons/svg/chevron_right.svg',
                  width: 15,
                  height: 15,
                  colorFilter: ColorFilter.mode(colors['iconTintSecondary']!, BlendMode.srcIn),
                ),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettingsPage()),
                  );
                },
              ),
              Divider(color: colors['divider']),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 6),
                child: Text(
                  'CONVERSAS',
                  style: TextStyle(fontSize: 11, color: colors['settings_section_label']),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _conversations.length,
                  itemBuilder: (_, i) {
                    final conv = _conversations[i];
                    return ListTile(
                      title: Text(conv.title, style: TextStyle(color: colors['drawerText'])),
                      subtitle: Text(
                        _formatTimestamp(conv.updatedAt),
                        style: TextStyle(color: colors['textSecondary'], fontSize: 12),
                      ),
                      onTap: () => Navigator.pop(context),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: state.displayMessages.isEmpty ? _buildEmptyState(colors) : _buildChatList(state, colors),
          ),
          _buildBottomBar(state, bottomPadding, colors),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Map<String, Color> colors) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(top: 80),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/icons/png/logo.png', width: 72, height: 72),
            const SizedBox(height: 16),
            Text(
              greeting,
              style: TextStyle(
                fontFamily: 'TimesNewRoman',
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: colors['textPrimary'],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Em que estás a pensar?',
              style: TextStyle(fontSize: 16.5, color: colors['textSecondary']),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatList(ChatState state, Map<String, Color> colors) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(top: 8, bottom: 160),
      itemCount: state.displayMessages.length,
      itemBuilder: (context, index) {
        final msg = state.displayMessages[index];
        return MessageBubble(
          message: msg,
          onThinkTap: null,
          onAction: (action) => _handleAction(action, msg.content),
        );
      },
    );
  }

  void _handleAction(String action, String content) {
    switch (action) {
      case 'Copiar':
        Clipboard.setData(ClipboardData(text: content));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Copiado!'), duration: Duration(seconds: 1)),
        );
        break;
      case 'Regenerar':
        final state = context.read<ChatState>();
        final lastUser = state.chatHistory.lastWhere((m) => m.role == 'user');
        _sendMessage(lastUser.content);
        break;
    }
  }

  Widget _buildBottomBar(ChatState state, double bottomPadding, Map<String, Color> colors) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inputFill = isDark ? (colors['bottomBarSolid'] ?? Colors.grey.shade900) : Colors.white;
    final inputTextColor = isDark ? Colors.white : Colors.black87;
    final hintColor = isDark ? const Color(0xFFB6B6B6) : const Color(0xFF9A9A9A);

    return Container(
      margin: EdgeInsets.fromLTRB(16, 0, 16, 20 + bottomPadding),
      decoration: BoxDecoration(
        color: colors['bottomBarSolid'],
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
            child: TextField(
              controller: _inputController,
              maxLines: 5,
              minLines: 1,
              cursorColor: inputTextColor,
              style: TextStyle(fontSize: 15, color: inputTextColor),
              decoration: InputDecoration(
                hintText: 'Escreve aqui...',
                hintStyle: TextStyle(color: hintColor),
                filled: true,
                fillColor: inputFill,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                isDense: true,
              ),
              onChanged: (text) {
                final visible = text.trim().isNotEmpty;
                if (_sendBtnVisible != visible) {
                  setState(() => _sendBtnVisible = visible);
                }
              },
            ),
          ),
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  margin: const EdgeInsets.only(left: 4),
                  decoration: BoxDecoration(
                    color: colors['addCircleBg'],
                    shape: BoxShape.circle,
                  ),
                  child: PulseTap(
                    onTap: () => _showAddPopup(context, colors),
                    circular: true,
                    child: Center(
                      child: SvgPicture.asset(
                        'assets/icons/svg/add.svg',
                        width: 18,
                        height: 18,
                        colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => _showPreviewModal(colors),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: colors['tabPreviewPillBg'],
                      borderRadius: BorderRadius.circular(19),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SvgPicture.asset(
                          'assets/icons/svg/preview_filled.svg',
                          width: 20,
                          height: 20,
                          colorFilter: ColorFilter.mode(colors['textPrimary']!, BlendMode.srcIn),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Preview',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: colors['textPrimary'],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _sendBtnVisible
                      ? Container(
                          key: const ValueKey('send'),
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: colors['sendBtnColor'],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: PulseTap(
                            onTap: () => _sendMessage(_inputController.text),
                            circular: true,
                            child: Center(
                              child: SvgPicture.asset(
                                'assets/icons/svg/ic_send_arrow.svg',
                                width: 15,
                                height: 15,
                                colorFilter: ColorFilter.mode(colors['sendIconColor']!, BlendMode.srcIn),
                              ),
                            ),
                          ),
                        )
                      : Container(
                          key: const ValueKey('mic'),
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: colors['sendBtnColor'],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: PulseTap(
                            onTap: () => _showVoiceModal(colors),
                            circular: true,
                            child: Center(
                              child: SvgPicture.asset(
                                'assets/icons/svg/record.svg',
                                width: 18,
                                height: 18,
                                colorFilter: ColorFilter.mode(colors['sendIconColor']!, BlendMode.srcIn),
                              ),
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showPreviewModal(Map<String, Color> colors) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: colors['dialogBackground'],
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: colors['divider'],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(height: 40),
              Image.asset('assets/icons/png/preview.png', width: 96, height: 96),
              const SizedBox(height: 20),
              Text(
                'Resultado da Análise',
                style: TextStyle(
                  fontFamily: 'TimesNewRoman',
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: colors['textPrimary'],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'O output da sua consulta será apresentado aqui.',
                style: TextStyle(fontSize: 17, color: colors['textSecondary']),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showVoiceModal(Map<String, Color> colors) {}

  void _showAddPopup(BuildContext pageContext, Map<String, Color> colors) {
    showModalBottomSheet<void>(
      context: pageContext,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: SafeArea(
            top: false,
            child: Container(
              decoration: BoxDecoration(
                color: colors['dialogBackground'],
                borderRadius: BorderRadius.circular(16),
              ),
              clipBehavior: Clip.antiAlias,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _popupItem(
                      icon: 'assets/icons/svg/camera.svg',
                      label: 'Câmara',
                      colors: colors,
                      onTap: () => Navigator.pop(sheetContext),
                    ),
                    Divider(height: 1, indent: 62, color: colors['divider']),
                    _popupItem(
                      icon: 'assets/icons/svg/download.svg',
                      label: 'Importar Ficheiro',
                      colors: colors,
                      onTap: () => Navigator.pop(sheetContext),
                    ),
                    Divider(height: 1, indent: 62, color: colors['divider']),
                    _popupItem(
                      icon: 'assets/icons/svg/external.svg',
                      label: 'URL / Link',
                      colors: colors,
                      onTap: null,
                      dimmed: true,
                    ),
                    Divider(height: 1, indent: 62, color: colors['divider']),
                    _popupItem(
                      icon: 'assets/icons/svg/extras.svg',
                      label: 'Extras',
                      colors: colors,
                      onTap: () {
                        Navigator.pop(sheetContext);
                        Future.delayed(const Duration(milliseconds: 180), () {
                          if (!mounted) return;
                          _showExtrasSheet(pageContext, colors);
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _popupItem({
    required String icon,
    required String label,
    required Map<String, Color> colors,
    required VoidCallback? onTap,
    bool dimmed = false,
  }) {
    return PulseTap(
      onTap: dimmed ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            SvgPicture.asset(
              icon,
              width: 20,
              height: 20,
              colorFilter: ColorFilter.mode(
                dimmed ? colors['textHint']! : colors['iconTint']!,
                BlendMode.srcIn,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  color: dimmed ? colors['textHint'] : colors['textPrimary'],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showExtrasSheet(BuildContext pageContext, Map<String, Color> colors) {
    final state = context.read<ChatState>();
    showModalBottomSheet(
      context: pageContext,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: SafeArea(
            top: false,
            child: Container(
              decoration: BoxDecoration(
                color: colors['dialogBackground'],
                borderRadius: BorderRadius.circular(16),
              ),
              clipBehavior: Clip.antiAlias,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _extraMenuItem(
                      title: 'Flash',
                      iconOff: 'assets/icons/svg/flash.svg',
                      iconOn: 'assets/icons/svg/flash_filled.svg',
                      active: state.flashMode,
                      colors: colors,
                      onTap: () {
                        state.toggleFlashMode();
                        Navigator.pop(sheetContext);
                      },
                    ),
                    Divider(height: 1, indent: 62, color: colors['divider']),
                    _extraMenuItem(
                      title: 'Think More',
                      iconOff: 'assets/icons/svg/brain.svg',
                      iconOn: 'assets/icons/svg/brain_filled.svg',
                      active: state.thinkMoreMode,
                      colors: colors,
                      onTap: () {
                        state.toggleThinkMoreMode();
                        Navigator.pop(sheetContext);
                      },
                    ),
                    Divider(height: 1, indent: 62, color: colors['divider']),
                    _extraMenuItem(
                      title: 'Sheets',
                      iconOff: 'assets/icons/svg/sheets.svg',
                      iconOn: 'assets/icons/svg/sheets_filled.svg',
                      active: state.sheetsEnabled,
                      colors: colors,
                      onTap: () {
                        state.toggleSheets();
                        Navigator.pop(sheetContext);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _extraMenuItem({
    required String title,
    required String iconOff,
    required String iconOn,
    required bool active,
    required Map<String, Color> colors,
    required VoidCallback onTap,
  }) {
    return PulseTap(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        color: active ? colors['extrasCardActive']?.withOpacity(0.08) : Colors.transparent,
        child: Row(
          children: [
            SvgPicture.asset(
              active ? iconOn : iconOff,
              width: 20,
              height: 20,
              colorFilter: ColorFilter.mode(
                active ? colors['extrasCardActiveText']! : colors['iconTintSecondary']!,
                BlendMode.srcIn,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: active ? colors['extrasCardActiveText'] : colors['textPrimary'],
                ),
              ),
            ),
            if (active)
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: colors['extrasCardActiveText'],
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showThinkModal(String thinkingContent, Map<String, Color> colors) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors['dialogBackground'],
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: colors['divider'],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  SvgPicture.asset(
                    'assets/icons/svg/brain_filled.svg',
                    width: 18,
                    height: 18,
                    colorFilter: ColorFilter.mode(IPCApp.primary, BlendMode.srcIn),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Processo de raciocínio',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: colors['textPrimary'],
                    ),
                  ),
                ],
              ),
              Divider(height: 20, color: colors['divider']),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(
                    thinkingContent,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.6,
                      color: colors['textSecondary'],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimestamp(int millis) {
    final dt = DateTime.fromMillisecondsSinceEpoch(millis);
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return 'Hoje';
    }
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class PulseTap extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final bool circular;

  const PulseTap({
    super.key,
    required this.child,
    required this.onTap,
    this.circular = false,
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
          child: widget.circular
              ? ClipOval(child: widget.child)
              : widget.child,
        ),
      ),
    );
  }
}