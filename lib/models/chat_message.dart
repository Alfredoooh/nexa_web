class ChatMessage {
  final String role;
  final String content;
  ChatMessage({required this.role, required this.content});
}

class DisplayMessage {
  final String role;
  String content;
  bool isStreaming;
  bool isThinking;
  String thinkingContent;

  DisplayMessage({
    required this.role,
    required this.content,
    this.isStreaming = false,
    this.isThinking = false,
    this.thinkingContent = '',
  });
}