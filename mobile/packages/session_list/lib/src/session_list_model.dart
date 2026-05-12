import 'dart:convert';

class ClaudeSession {
  const ClaudeSession({
    required this.sessionId,
    required this.title,
    required this.lastModified,
    required this.fileSizeBytes,
    required this.cwd,
    this.gitBranch,
  });

  final String sessionId;
  final String title;
  final DateTime lastModified;
  final int fileSizeBytes;
  final String? gitBranch;
  final String cwd;

  bool get isFallbackTitle {
    final short = sessionId.length > 8 ? sessionId.substring(0, 8) : sessionId;
    return title == short;
  }
}

List<ClaudeSession> parseSessionsOutput(String output) {
  final sessions = <ClaudeSession>[];
  final blocks = output.split('==SESSION==');

  for (final block in blocks) {
    if (block.trim().isEmpty) continue;

    final lines = block.trim().split('\n');
    if (lines.isEmpty) continue;

    final meta = lines[0].trim().split(' ');
    if (meta.length < 3) continue;

    final ts = double.tryParse(meta[0]);
    final bytes = int.tryParse(meta[1]);
    if (ts == null || bytes == null) continue;

    final path = meta.sublist(2).join(' ');
    if (path.isEmpty) continue;

    final sessionId = path.split('/').last.replaceAll('.jsonl', '');

    Map<String, dynamic>? aiTitle;
    Map<String, dynamic>? lastPrompt;
    Map<String, dynamic>? userMsg;
    var lineIdx = 1;

    if (lines.length > lineIdx &&
        lines[lineIdx].trim().startsWith('{"type":"ai-title"')) {
      try {
        aiTitle = jsonDecode(lines[lineIdx]) as Map<String, dynamic>;
      } catch (_) {}
      lineIdx++;
    }

    if (lines.length > lineIdx &&
        lines[lineIdx].trim().startsWith('{"type":"last-prompt"')) {
      try {
        lastPrompt = jsonDecode(lines[lineIdx]) as Map<String, dynamic>;
      } catch (_) {}
      lineIdx++;
    }

    if (lines.length > lineIdx &&
        lines[lineIdx].trim().startsWith('{"type":"user"')) {
      try {
        userMsg = jsonDecode(lines[lineIdx]) as Map<String, dynamic>;
      } catch (_) {}
    }

    final title = _sessionTitle(
      sessionId: sessionId,
      aiTitle: aiTitle,
      lastPrompt: lastPrompt,
      userMsg: userMsg,
    );
    final cwd = _sessionCwd(path: path, userMsg: userMsg);
    final gitBranch = userMsg?['gitBranch'] as String?;

    sessions.add(
      ClaudeSession(
        sessionId: sessionId,
        title: title,
        lastModified: DateTime.fromMillisecondsSinceEpoch((ts * 1000).round()),
        fileSizeBytes: bytes,
        cwd: cwd,
        gitBranch: gitBranch,
      ),
    );
  }

  return sessions;
}

String _sessionTitle({
  required String sessionId,
  required Map<String, dynamic>? aiTitle,
  required Map<String, dynamic>? lastPrompt,
  required Map<String, dynamic>? userMsg,
}) {
  final aiTitleValue = aiTitle?['aiTitle'];
  if (aiTitleValue is String && aiTitleValue.isNotEmpty) {
    return _truncateTitle(aiTitleValue);
  }

  final lastPromptValue = lastPrompt?['lastPrompt'];
  if (lastPromptValue is String && lastPromptValue.isNotEmpty) {
    return _truncateTitle(lastPromptValue);
  }

  if (userMsg != null) {
    final userContent = _extractUserContent(userMsg);
    if (userContent != null && userContent.isNotEmpty) {
      return _truncateTitle(userContent);
    }
  }

  return _fallbackTitle(sessionId);
}

String _sessionCwd({
  required String path,
  required Map<String, dynamic>? userMsg,
}) {
  final cwd = userMsg?['cwd'];
  if (cwd is String && cwd.isNotEmpty) return cwd;

  final folderName = path.split('/.claude/projects/').last.split('/').first;
  return decodeProjectPath(folderName);
}

String _truncateTitle(String value) {
  return value.length > 60 ? '${value.substring(0, 60)}...' : value;
}

String _fallbackTitle(String sessionId) {
  return sessionId.length > 8 ? sessionId.substring(0, 8) : sessionId;
}

String? _extractUserContent(Map<String, dynamic> userMsg) {
  final message = userMsg['message'];
  if (message is! Map) {
    final topContent = userMsg['content'];
    if (topContent is String) return topContent;
    return null;
  }

  final content = message['content'];
  if (content is String) return content;
  if (content is List && content.isNotEmpty) {
    for (final block in content) {
      if (block is Map && block['text'] is String) {
        return block['text'] as String;
      }
    }
  }
  return null;
}

String decodeProjectPath(String folderName) {
  return '/${folderName.substring(1).replaceAll('-', '/')}';
}
