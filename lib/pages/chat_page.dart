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
  bool drawerOpen = false;
  bool popupVisible = false;

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

  void toggleDrawer() {
    drawerOpen = !drawerOpen;
    notifyListeners();
  }
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> with SingleTickerProviderStateMixin {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
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
          key: _scaffoldKey,
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
                  _buildBottomBar(chatState, bottomPadding),
                ],
              ),
              // Scrim do drawer
              if (chatState.drawerOpen)
                GestureDetector(
                  onTap: () => chatState.toggleDrawer(),
                  child: Container(color: Colors.black.withOpacity(0.4)),
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
          width: 16,
          height: 16,
          colorFilter: const ColorFilter.mode(Colors.black, BlendMode.srcIn),
        ),
        onPressed: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      title: const Text(
        'IPC',
        style: TextStyle(
          fontFamily: 'TimesNewRoman',
          fontWeight: FontWeight.bold,
          fontSize: 20,
          color: Colors.black,
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
        AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: state.displayMessages.isNotEmpty ? 1.0 : 0.0,
          child: IconButton(
            icon: SvgPicture.asset(
              'assets/icons/svg/more_vertical.svg',
              width: 16,
              height: 16,
              colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
            ),
            onPressed: () => _showMorePopup(state),
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
            Image.asset('assets/icons/logo.png', width: 72, height: 72),
            const SizedBox(height: 16),
            Text(
              greeting,
              style: const TextStyle(
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

  Widget _buildBottomBar(ChatState state, double bottomPadding) {
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
          // Linha 1: campo de texto + botão microfone/enviar
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(width: 8),
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
                            'assets/icons/svg/record.svg',
                            width: 18,
                            height: 18,
                            colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
                          ),
                          onPressed: () => _showVoiceModal(),
                        ),
                ),
              ],
            ),
          ),
          // Linha 2: botão + (esquerda), tab Preview (centro), botão record/send (direita)
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              children: [
                // Botão +
                IconButton(
                  icon: SvgPicture.asset(
                    'assets/icons/svg/add.svg',
                    width: 18,
                    height: 18,
                    colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
                  ),
                  onPressed: () => _showAddPopup(),
                ),
                const Spacer(),
                // Tab Preview
                GestureDetector(
                  onTap: () => _showPreviewModal(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(19),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SvgPicture.asset(
                          'assets/icons/svg/preview_filled.svg',
                          width: 20,
                          height: 20,
                          colorFilter: const ColorFilter.mode(Colors.black, BlendMode.srcIn),
                        ),
                        const SizedBox(width: 6),
                        const Text('Preview', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                // Botão record/send (mesmo da linha de cima? No original, é o mesmo que alterna)
                // Aqui replicamos o mesmo botão para manter a UI, mas no original ele fica na direita.
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _sendBtnVisible
                      ? Container(
                          key: const ValueKey('send2'),
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
                          key: const ValueKey('mic2'),
                          icon: SvgPicture.asset(
                            'assets/icons/svg/record.svg',
                            width: 18,
                            height: 18,
                            colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn),
                          ),
                          onPressed: () => _showVoiceModal(),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Modal Preview ───
  void _showPreviewModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.7,
        maxChildSize: 0.95,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(height: 40),
              Image.asset('assets/icons/preview.png', width: 96, height: 96),
              const SizedBox(height: 20),
              const Text(
                'Resultado da Análise',
                style: TextStyle(
                  fontFamily: 'TimesNewRoman',
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'O output da sua consulta será apresentado aqui.',
                style: TextStyle(fontSize: 17, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Modal Voice ───
  void _showVoiceModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
        ),
        child: const Center(child: Text('Voice recognition UI placeholder')),
      ),
    );
  }

  // ─── Add Popup ───
  void _showAddPopup() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _popupItem('assets/icons/svg/camera.svg', 'Câmara', () {}),
            const Divider(height: 1, indent: 62),
            _popupItem('assets/icons/svg/download.svg', 'Importar Ficheiro', () {}),
            const Divider(height: 1, indent: 62),
            _popupItem('assets/icons/svg/external.svg', 'URL / Link', () {}, dimmed: true),
            const Divider(height: 1, indent: 62),
            _popupItem('assets/icons/svg/extras.svg', 'Extras', () {
              Navigator.pop(context);
              _showExtrasSheet(context.read<ChatState>());
            }),
          ],
        ),
      ),
    );
  }

  Widget _popupItem(String icon, String label, VoidCallback onTap, {bool dimmed = false}) {
    return ListTile(
      leading: SvgPicture.asset(icon, width: 20, height: 20),
      title: Text(label, style: TextStyle(fontSize: 15, color: dimmed ? Colors.grey : Colors.black)),
      enabled: !dimmed,
      onTap: dimmed ? null : onTap,
    );
  }

  // ─── More Popup ───
  void _showMorePopup(ChatState state) {
    // similar ao add popup, com opções de fixar, arquivar, partilhar, eliminar
  }

  // ─── Extras Sheet ───
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
              width: 36, height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(3)),
            ),
            const SizedBox(height: 8),
            const Text('Extras', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _extraCard('Flash', 'assets/icons/svg/flash.svg', 'assets/icons/svg/flash_filled.svg', state.flashMode, () => state.toggleFlashMode()),
                _extraCard('Think More', 'assets/icons/svg/brain.svg', 'assets/icons/svg/brain_filled.svg', state.thinkMoreMode, () => state.toggleThinkMoreMode()),
                _extraCard('Sheets', 'assets/icons/svg/sheets.svg', 'assets/icons/svg/sheets_filled.svg', state.sheetsEnabled, () => state.toggleSheets()),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _extraCard(String title, String iconOff, String iconOn, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF6F5AF6).withOpacity(0.1) : Colors.grey[100],
          borderRadius: BorderRadius.circular(16),
          border: !active ? Border.all(color: const Color(0xFFE0E0E0)) : null,
        ),
        child: Column(
          children: [
            SvgPicture.asset(
              active ? iconOn : iconOff,
              width: 20, height: 20,
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
              Container(width: 36, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(3))),
              const SizedBox(height: 8),
              Row(
                children: [
                  SvgPicture.asset('assets/icons/svg/brain_filled.svg', width: 18, height: 18,
                      colorFilter: const ColorFilter.mode(Color(0xFF6F5AF6), BlendMode.srcIn)),
                  const SizedBox(width: 10),
                  const Text('Processo de raciocínio', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                ],
              ),
              const Divider(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(thinkingContent, style: const TextStyle(fontSize: 14, height: 1.6, color: Colors.grey)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Drawer ───
  Drawer _buildDrawer(ChatState state) {
    return Drawer(
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
                  fontFamily: 'TimesNewRoman',
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 12, 24, 6),
              child: Text('CONVERSAS', style: TextStyle(fontSize: 11, color: Colors.grey)),
            ),
            Expanded(
              child: ListView(
                children: [
                  _drawerConversationItem('Conversa 1', 'Hoje', true),
                  _drawerConversationItem('Conversa 2', 'Ontem', false),
                ],
              ),
            ),
            const Divider(),
            ListTile(
              leading: SvgPicture.asset('assets/icons/svg/menu.svg', width: 20, height: 20),
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