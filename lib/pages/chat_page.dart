import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../models/chat_message.dart';
import '../widgets/message_bubble.dart';

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

class _ChatPageState extends State<ChatPage>
    with SingleTickerProviderStateMixin {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _sendBtnVisible = false;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
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

    // Simulação de stream (substituir pela API real do Gemini)
    state.isStreaming = true;
    final buffer = StringBuffer();
    const fullResponse =
        'Esta é uma resposta **completa** com formatação Markdown.\n\n'
        '| Coluna A | Coluna B |\n'
        '|----------|----------|\n'
        '| Dado 1   | Dado 2   |\n'
        '| Dado 3   | Dado 4   |\n\n'
        'E também um widget nativo:\n'
        '<widget_bar>{"title": "Vendas", "items": [{"label": "Jan", "value": 30, "color": "#6F5AF6"}, {"label": "Fev", "value": 50, "color": "#FF9500"}, {"label": "Mar", "value": 70, "color": "#34C759"}]}</widget_bar>\n\n'
        'Obrigado por testar!';

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

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return Consumer<ChatState>(
      builder: (context, chatState, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF2F2F7),
          appBar: _buildAppBar(chatState),
          drawer: _buildDrawer(chatState),
          body: Stack(
            children: [
              Column(
                children: [
                  Expanded(
                    child: chatState.displayMessages.isEmpty
                        ? _buildEmptyState()
                        : _buildChatList(chatState),
                  ),
                  _buildInputRow(chatState, bottomPadding),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar(ChatState state) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: SvgPicture.asset(
          'assets/icons/svg/menu.svg',
          width: 17,
          height: 17,
          colorFilter: const ColorFilter.mode(Colors.black, BlendMode.srcIn),
        ),
        onPressed: () => Scaffold.of(context).openDrawer(),
      ),
      title: Text(
        'IPC',
        style: TextStyle(
          fontFamily: 'TimesNewRoman',
          fontWeight: FontWeight.bold,
          fontSize: 20,
          color: Colors.black,
        ),
      ),
      actions: [
        // Botão Nova Conversa (animado)
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
          child: IconButton(
            icon: SvgPicture.asset(
              'assets/icons/svg/new_chat.svg',
              width: 17,
              height: 17,
              colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
            ),
            onPressed: state.displayMessages.isEmpty
                ? null
                : () => state.resetConversation(),
          ),
        ),
        // Botão More (Extras)
        AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: state.displayMessages.isNotEmpty ? 1.0 : 0.0,
          child: IconButton(
            icon: SvgPicture.asset(
              'assets/icons/svg/more.svg',
              width: 17,
              height: 17,
              colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
            ),
            onPressed: () => _showExtrasSheet(state),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    final hour = DateTime.now().hour;
    final greeting =
        hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(top: 80),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/icons/svg/logo.png', width: 72, height: 72),
            const SizedBox(height: 16),
            Text(
              greeting,
              style: TextStyle(
                fontFamily: 'TimesNewRoman',
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Em que estás a pensar?',
              style: TextStyle(
                fontSize: 16.5,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatList(ChatState state) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(top: 8, bottom: 160),
      itemCount: state.displayMessages.length,
      itemBuilder: (context, index) {
        final msg = state.displayMessages[index];
        return MessageBubble(
          message: msg,
          onThinkTap: msg.thinkingContent.isNotEmpty
              ? () => _showThinkModal(msg.thinkingContent)
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

  Widget _buildInputRow(ChatState state, double bottomPadding) {
    return Container(
      margin: EdgeInsets.fromLTRB(16, 0, 16, 20 + bottomPadding),
      decoration: BoxDecoration(
        color: Colors.white,
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
            padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                IconButton(
                  icon: SvgPicture.asset(
                    'assets/icons/svg/add.svg',
                    width: 18,
                    height: 18,
                    colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
                  ),
                  onPressed: () {},
                ),
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    maxLines: 5,
                    minLines: 1,
                    style: const TextStyle(fontSize: 15),
                    decoration: const InputDecoration(
                      hintText: 'Escreve aqui...',
                      hintStyle: TextStyle(color: Colors.grey),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(vertical: 12),
                    ),
                    onChanged: (text) {
                      setState(() {
                        _sendBtnVisible = text.trim().isNotEmpty;
                      });
                    },
                  ),
                ),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _sendBtnVisible
                      ? Container(
                          key: const ValueKey('send'),
                          margin: const EdgeInsets.only(right: 4),
                          child: IconButton(
                            icon: const Icon(Icons.send_rounded, size: 18),
                            color: Colors.white,
                            style: IconButton.styleFrom(
                              backgroundColor: const Color(0xFF6F5AF6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                            onPressed: () => _sendMessage(_inputController.text),
                          ),
                        )
                      : IconButton(
                          key: const ValueKey('mic'),
                          icon: SvgPicture.asset(
                            'assets/icons/svg/mic.svg',
                            width: 18,
                            height: 18,
                            colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
                          ),
                          onPressed: () {},
                        ),
                ),
              ],
            ),
          ),
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(19),
                  ),
                  child: Row(
                    children: [
                      SvgPicture.asset('assets/icons/svg/preview.svg', width: 14, height: 14),
                      const SizedBox(width: 6),
                      const Text('Preview', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showExtrasSheet(ChatState state) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const Text(
              'Extras',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildExtraCard(
                  title: 'Flash',
                  iconOff: 'assets/icons/svg/flash.svg',
                  iconOn: 'assets/icons/svg/flash_filled.svg',
                  active: state.flashMode,
                  onTap: () => state.toggleFlashMode(),
                ),
                _buildExtraCard(
                  title: 'Think More',
                  iconOff: 'assets/icons/svg/brain.svg',
                  iconOn: 'assets/icons/svg/brain_filled.svg',
                  active: state.thinkMoreMode,
                  onTap: () => state.toggleThinkMoreMode(),
                ),
                _buildExtraCard(
                  title: 'Sheets',
                  iconOff: 'assets/icons/svg/sheets.svg',
                  iconOn: 'assets/icons/svg/sheets_filled.svg',
                  active: state.sheetsEnabled,
                  onTap: () => state.toggleSheets(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExtraCard({
    required String title,
    required String iconOff,
    required String iconOn,
    required bool active,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active
              ? const Color(0xFF6F5AF6).withOpacity(0.1)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(16),
          border: !active
              ? Border.all(color: const Color(0xFFE0E0E0))
              : null,
        ),
        child: Column(
          children: [
            SvgPicture.asset(
              active ? iconOn : iconOff,
              width: 20,
              height: 20,
              colorFilter: ColorFilter.mode(
                active ? const Color(0xFF6F5AF6) : Colors.grey,
                BlendMode.srcIn,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: active ? const Color(0xFF6F5AF6) : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showThinkModal(String thinkingContent) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              Row(
                children: [
                  SvgPicture.asset(
                    'assets/icons/svg/brain_filled.svg',
                    width: 18,
                    height: 18,
                    colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Processo de raciocínio',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const Divider(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(
                    thinkingContent,
                    style: const TextStyle(fontSize: 14, height: 1.6, color: Colors.grey),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Drawer _buildDrawer(ChatState state) {
    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 12),
              child: Text(
                'IPC',
                style: TextStyle(
                  fontFamily: 'TimesNewRoman',
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView(
                children: [
                  _drawerConversationItem('Conversa 1', 'Hoje', true),
                  _drawerConversationItem('Conversa 2', 'Ontem', false),
                  _drawerConversationItem('Conversa 3', '12/06', false),
                ],
              ),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Definições'),
              onTap: () {},
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _drawerConversationItem(String title, String subtitle, bool isActive) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF6F5AF6).withOpacity(0.1) : null,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontSize: 15)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        onTap: () {},
      ),
    );
  }
}