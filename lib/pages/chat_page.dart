import 'dart:async';
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
    msg.thinkingContent = thinking;
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

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    final token = context.read<AuthState>().user?.token ?? '';
    final list = await AuthApiService.listConversations(token);
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
    _scrollToBottom();

    state.addAssistantPlaceholder();
    final aiIndex = state.displayMessages.length - 1;
    _scrollToBottom();

    if (!state.titleGenerated) {
      state.titleGenerated = true;
      state.currentConversationTitle =
          text.trim().split(RegExp(r'\s+')).take(4).join(' ').substring(0, 40);
    }

    state.isStreaming = true;
    final buffer = StringBuffer();
    const fullResponse = 'Resposta de exemplo com **markdown**.';

    for (int i = 0; i < fullResponse.length; i++) {
      await Future.delayed(const Duration(milliseconds: 20));
      buffer.write(fullResponse[i]);
      final updated = DisplayMessage(
        role: 'assistant',
        content: buffer.toString(),
        isStreaming: true,
        isThinking: false,
      );
      state.updateAssistantMessage(aiIndex, updated);
      _scrollToBottom();
    }

    state.finishAssistantMessage(aiIndex, buffer.toString(), 'Pensamento simulado...');
    state.isStreaming = false;
  }

  Map<String, Color> _colors() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? IPCApp.darkColors : IPCApp.lightColors;
  }

  // Botão circular da appbar — equivalente exato ao drawable appbar_btn_bg (oval, 36dp)
  Widget _appBarCircleBtn({
    required String iconAsset,
    required double iconSize,
    required Map<String, Color> colors,
    required VoidCallback? onPressed,
  }) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(color: colors['appbarBtnBg'], shape: BoxShape.circle),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: SvgPicture.asset(
          iconAsset,
          width: iconSize,
          height: iconSize,
          colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
        ),
        onPressed: onPressed,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final colors = _colors();
    final auth = context.watch<AuthState>();
    final state = context.watch<ChatState>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: colors['background'],
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                colors['appbarSolid']!,
                colors['appbarSolid']!.withOpacity(0.0),
              ],
            ),
          ),
          child: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            scrolledUnderElevation: 0,
            titleSpacing: 8,
            // Kotlin não tem título nenhum na appbar do chat — só os 3 botões.
            title: null,
            leading: Padding(
              padding: const EdgeInsets.only(left: 8),
              child: _appBarCircleBtn(
                iconAsset: 'assets/icons/svg/menu.svg',
                iconSize: 16,
                colors: colors,
                onPressed: () {
                  _loadConversations();
                  _scaffoldKey.currentState?.openDrawer();
                },
              ),
            ),
            actions: [
              TweenAnimationBuilder<double>(
                tween: Tween(
                  begin: state.displayMessages.isEmpty ? 0.8 : 0.0,
                  end: state.displayMessages.isEmpty ? 0.8 : 0.0,
                ),
                duration: const Duration(milliseconds: 300),
                curve: Curves.decelerate,
                builder: (context, value, child) {
                  return Transform.translate(
                    offset: Offset(value * 42, 0),
                    child: Opacity(
                      opacity: state.displayMessages.isNotEmpty ? 1.0 : 0.35,
                      child: child,
                    ),
                  );
                },
                child: _appBarCircleBtn(
                  iconAsset: 'assets/icons/svg/new_chat.svg',
                  iconSize: 17,
                  colors: colors,
                  onPressed: state.displayMessages.isEmpty ? null : () => state.resetConversation(),
                ),
              ),
              const SizedBox(width: 6),
              AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: state.displayMessages.isNotEmpty ? 1.0 : 0.0,
                child: _appBarCircleBtn(
                  iconAsset: 'assets/icons/svg/more_vertical.svg',
                  iconSize: 16,
                  colors: colors,
                  onPressed: () {},
                ),
              ),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
      drawer: Drawer(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: colors['drawerBackground'], // agora branco puro no claro
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
                    // Sem Times New Roman aqui, por pedido — sans-serif simples.
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
                title: Text(auth.user?.name ?? 'Utilizador',
                    style: TextStyle(color: colors['drawerText'])),
                subtitle: Text(auth.user?.email ?? '',
                    style: TextStyle(color: colors['textSecondary'])),
                trailing: SvgPicture.asset(
                  'assets/icons/svg/chevron_right.svg',
                  width: 15,
                  height: 15,
                  colorFilter: ColorFilter.mode(colors['iconTintSecondary']!, BlendMode.srcIn),
                ),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsPage()));
                },
              ),
              Divider(color: colors['divider']),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 6),
                child: Text('CONVERSAS',
                    style: TextStyle(fontSize: 11, color: colors['settings_section_label'])),
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
            child: state.displayMessages.isEmpty
                ? _buildEmptyState(colors)
                : _buildChatList(state, colors),
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
          onThinkTap: msg.thinkingContent.isNotEmpty
              ? () => _showThinkModal(msg.thinkingContent, colors)
              : null,
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
              style: TextStyle(fontSize: 15, color: colors['textPrimary']),
              decoration: InputDecoration(
                hintText: 'Escreve aqui...',
                hintStyle: TextStyle(color: colors['textHint']),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onChanged: (text) => setState(() => _sendBtnVisible = text.trim().isNotEmpty),
            ),
          ),
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              children: [
                Container(
                  width: 40, height: 40,
                  margin: const EdgeInsets.only(left: 4),
                  decoration: BoxDecoration(
                    color: colors['addCircleBg'],
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: SvgPicture.asset(
                      'assets/icons/svg/add.svg',
                      width: 18, height: 18,
                      colorFilter: ColorFilter.mode(colors['iconTint']!, BlendMode.srcIn),
                    ),
                    onPressed: () => _showAddPopup(colors),
                    padding: EdgeInsets.zero,
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
                          width: 20, height: 20,
                          colorFilter: ColorFilter.mode(colors['textPrimary']!, BlendMode.srcIn),
                        ),
                        const SizedBox(width: 6),
                        Text('Preview',
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
                const Spacer(),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _sendBtnVisible
                      ? Container(
                          key: const ValueKey('send'),
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: colors['sendBtnColor'],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: IconButton(
                            icon: SvgPicture.asset(
                              'assets/icons/svg/ic_send_arrow.svg',
                              width: 15, height: 15,
                              colorFilter: ColorFilter.mode(colors['sendIconColor']!, BlendMode.srcIn),
                            ),
                            onPressed: () => _sendMessage(_inputController.text),
                            padding: EdgeInsets.zero,
                          ),
                        )
                      : Container(
                          key: const ValueKey('mic'),
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: colors['sendBtnColor'],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: IconButton(
                            icon: SvgPicture.asset(
                              'assets/icons/svg/record.svg',
                              width: 18, height: 18,
                              colorFilter: ColorFilter.mode(colors['sendIconColor']!, BlendMode.srcIn),
                            ),
                            onPressed: () => _showVoiceModal(colors),
                            padding: EdgeInsets.zero,
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
              Container(width: 36, height: 4, decoration: BoxDecoration(color: colors['divider'], borderRadius: BorderRadius.circular(3))),
              const SizedBox(height: 40),
              Image.asset('assets/icons/png/preview.png', width: 96, height: 96),
              const SizedBox(height: 20),
              Text('Resultado da Análise', style: TextStyle(fontFamily: 'TimesNewRoman', fontSize: 26, fontWeight: FontWeight.bold, color: colors['textPrimary'])),
              const SizedBox(height: 8),
              Text('O output da sua consulta será apresentado aqui.', style: TextStyle(fontSize: 17, color: colors['textSecondary']), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }

  void _showVoiceModal(Map<String, Color> colors) {}

  void _showAddPopup(Map<String, Color> colors) {
    showModalBottomSheet(
      context: context,
      backgroundColor: colors['dialogBackground'],
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(14))),
      builder: (_) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          _popupItem('assets/icons/svg/camera.svg', 'Câmara', colors, () {}),
          Divider(height: 1, indent: 62, color: colors['divider']),
          _popupItem('assets/icons/svg/download.svg', 'Importar Ficheiro', colors, () {}),
          Divider(height: 1, indent: 62, color: colors['divider']),
          _popupItem('assets/icons/svg/external.svg', 'URL / Link', colors, () {}, dimmed: true),
          Divider(height: 1, indent: 62, color: colors['divider']),
          _popupItem('assets/icons/svg/extras.svg', 'Extras', colors, () { Navigator.pop(context); _showExtrasSheet(colors); }),
        ]),
      ),
    );
  }

  Widget _popupItem(String icon, String label, Map<String, Color> colors, VoidCallback onTap, {bool dimmed = false}) {
    return ListTile(
      leading: SvgPicture.asset(icon, width: 20, height: 20, colorFilter: ColorFilter.mode(dimmed ? colors['textHint']! : colors['iconTint']!, BlendMode.srcIn)),
      title: Text(label, style: TextStyle(fontSize: 15, color: dimmed ? colors['textHint'] : colors['textPrimary'])),
      enabled: !dimmed,
      onTap: dimmed ? null : onTap,
    );
  }

  void _showExtrasSheet(Map<String, Color> colors) {
    final state = context.read<ChatState>();
    showModalBottomSheet(
      context: context,
      backgroundColor: colors['dialogBackground'],
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 8), decoration: BoxDecoration(color: colors['divider'], borderRadius: BorderRadius.circular(3))),
          Text('Extras', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colors['textPrimary'])),
          const SizedBox(height: 20),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _extraCard('Flash', 'assets/icons/svg/flash.svg', 'assets/icons/svg/flash_filled.svg', state.flashMode, colors, () => state.toggleFlashMode()),
            _extraCard('Think More', 'assets/icons/svg/brain.svg', 'assets/icons/svg/brain_filled.svg', state.thinkMoreMode, colors, () => state.toggleThinkMoreMode()),
            _extraCard('Sheets', 'assets/icons/svg/sheets.svg', 'assets/icons/svg/sheets_filled.svg', state.sheetsEnabled, colors, () => state.toggleSheets()),
          ]),
        ]),
      ),
    );
  }

  Widget _extraCard(String title, String iconOff, String iconOn, bool active, Map<String, Color> colors, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active ? colors['extrasCardActive'] : colors['cardBackground'],
          borderRadius: BorderRadius.circular(16),
          border: !active ? Border.all(color: colors['divider']!) : null,
        ),
        child: Column(children: [
          SvgPicture.asset(active ? iconOn : iconOff, width: 20, height: 20, colorFilter: ColorFilter.mode(active ? colors['extrasCardActiveText']! : colors['iconTintSecondary']!, BlendMode.srcIn)),
          const SizedBox(height: 8),
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: active ? colors['extrasCardActiveText'] : colors['textSecondary'])),
        ]),
      ),
    );
  }

  void _showThinkModal(String thinkingContent, Map<String, Color> colors) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors['dialogBackground'],
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(children: [
            Container(width: 36, height: 4, decoration: BoxDecoration(color: colors['divider'], borderRadius: BorderRadius.circular(3))),
            const SizedBox(height: 8),
            Row(children: [
              SvgPicture.asset('assets/icons/svg/brain_filled.svg', width: 18, height: 18, colorFilter: ColorFilter.mode(IPCApp.primary, BlendMode.srcIn)),
              const SizedBox(width: 10),
              Text('Processo de raciocínio', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colors['textPrimary'])),
            ]),
            Divider(height: 20, color: colors['divider']),
            Expanded(child: SingleChildScrollView(controller: scrollController, child: Text(thinkingContent, style: TextStyle(fontSize: 14, height: 1.6, color: colors['textSecondary'])))),
          ]),
        ),
      ),
    );
  }

  String _formatTimestamp(int millis) {
    final dt = DateTime.fromMillisecondsSinceEpoch(millis);
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) return 'Hoje';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}