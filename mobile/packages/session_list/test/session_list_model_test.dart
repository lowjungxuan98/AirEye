import 'package:flutter_test/flutter_test.dart';
import 'package:session_list/session_list.dart';

void main() {
  group('parseSessionsOutput', () {
    test('parses ai title metadata first', () {
      const output = '''
==SESSION== 1710000000.5 2048 /Users/me/.claude/projects/-Users-me-app/abc123.jsonl
{"type":"ai-title","aiTitle":"Implement package refactor"}
{"type":"last-prompt","lastPrompt":"Fallback prompt"}
{"type":"user","cwd":"/Users/me/app","gitBranch":"main","message":{"role":"user","content":"First prompt"}}
''';

      final sessions = parseSessionsOutput(output);

      expect(sessions, hasLength(1));
      expect(sessions.single.sessionId, 'abc123');
      expect(sessions.single.title, 'Implement package refactor');
      expect(sessions.single.fileSizeBytes, 2048);
      expect(sessions.single.cwd, '/Users/me/app');
      expect(sessions.single.gitBranch, 'main');
    });

    test('falls back to user content and decoded project path', () {
      const output = '''
==SESSION== 1710000000 512 /Users/me/.claude/projects/-tmp-demo/session-long-id.jsonl
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Inspect terminal package"}]}}
''';

      final sessions = parseSessionsOutput(output);

      expect(sessions, hasLength(1));
      expect(sessions.single.title, 'Inspect terminal package');
      expect(sessions.single.cwd, '/tmp/demo');
      expect(sessions.single.isFallbackTitle, isFalse);
    });

    test('uses short session id when no title source exists', () {
      const output = '''
==SESSION== 1710000000 100 /Users/me/.claude/projects/-tmp-demo/1234567890abcdef.jsonl
''';

      final sessions = parseSessionsOutput(output);

      expect(sessions.single.title, '12345678');
      expect(sessions.single.isFallbackTitle, isTrue);
    });
  });

  test('decodeProjectPath converts Claude project folder names', () {
    expect(decodeProjectPath('-Users-me-project'), '/Users/me/project');
  });
}
