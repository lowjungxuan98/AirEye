import 'package:core/core.dart';
import 'package:terminal/terminal.dart';

import 'session_list_model.dart';
import 'session_list_state.dart';

class SessionListController extends BaseController<SessionListState> {
  String? _serverId;
  var _isLoadingServer = false;

  String? get serverId => _serverId;

  @override
  SessionListState build() => const SessionListLoading();

  @override
  bool get isLoading => state is SessionListLoading;

  @override
  void setLoading() => state = const SessionListLoading();

  @override
  void setError(String message) => state = SessionListError(message);

  Future<void> load(ServerConfig server) async {
    if (_isLoadingServer && _serverId == server.id) return;

    _serverId = server.id;
    _isLoadingServer = true;
    setLoading();

    try {
      await _connect(server);
      state = SessionListReady(await _fetch(server.id));
    } catch (e) {
      setError(e.toString());
    } finally {
      _isLoadingServer = false;
    }
  }

  Future<void> refresh(ServerConfig server) async {
    try {
      state = SessionListReady(await _fetch(server.id));
    } catch (e) {
      setError(e.toString());
    }
  }

  void navigateToTerminal(BuildContext context, String serverId) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => TerminalView(serverId: serverId)));
  }

  Future<void> _connect(ServerConfig server) async {
    final ssh = ref.read(grimSshProvider.notifier);
    if (ssh.isConnected(server.id)) return;

    await ssh.connect(
      id: server.id,
      host: server.host,
      port: server.port,
      username: server.username,
      credential: server.credential,
      useKey: server.useKey,
    );
  }

  Future<List<ClaudeSession>> _fetch(String serverId) async {
    final client = ref.read(grimSshProvider)[serverId];
    if (client == null) throw StateError('SSH not connected');

    const script = r'''
find ~/.claude/projects -maxdepth 2 -name "*.jsonl" -printf "%T@ %s %p\n" | sort -rn | while read ts bytes path; do
  bname=$(basename "$path")
  uuid="${bname%.jsonl}"
  dir=$(dirname "$path")

  [ -d "$dir/$uuid" ] && continue

  echo "==SESSION== $ts $bytes $path"
  grep '"type":"ai-title"' "$path" 2>/dev/null | tail -1
  grep '"type":"last-prompt"' "$path" 2>/dev/null | tail -1
  grep -m 1 '"type":"user"' "$path" 2>/dev/null
done
''';

    final output = await client.execute(script);
    return parseSessionsOutput(output);
  }
}

final sessionListControllerProvider =
    BaseNotifierProvider<SessionListController, SessionListState>(
      SessionListController.new,
    );
