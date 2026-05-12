import 'package:core/core.dart';
import 'package:server_form/server_form.dart';
import 'package:session_list/session_list.dart';

import 'server_repository.dart';
import 'server_state.dart';

class ServerController extends BaseController<ServerState> {
  final _repository = ServerRepository();

  @override
  ServerState build() {
    load();
    return const ServerInitial();
  }

  @override
  bool get isLoading => state is ServerLoading;

  @override
  void setLoading() => state = const ServerLoading();

  @override
  void setError(String message) => state = ServerError(message);

  Future<void> load() async {
    try {
      final servers = await _repository.loadAll();
      state = ServerReady(servers);
    } catch (e) {
      setError(e.toString());
    }
  }

  Future<void> addServer(ServerConfig server) async {
    final current = state;
    if (current is! ServerReady) return;

    final updated = [...current.servers, server];
    await _repository.saveAll(updated);
    state = ServerReady(updated);
  }

  Future<void> addServerFromForm(BuildContext context) async {
    final result = await Navigator.of(context).push<ServerFormResult>(
      MaterialPageRoute(builder: (_) => const ServerFormView()),
    );
    if (result == null) return;

    await addServer(
      ServerConfig(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        host: result.host,
        port: result.port,
        username: result.username,
        credential: result.credential,
        useKey: result.useKey,
      ),
    );
  }

  Future<void> deleteServer(String id) async {
    final current = state;
    if (current is! ServerReady) return;

    final updated = current.servers.where((s) => s.id != id).toList();
    await _repository.saveAll(updated);
    state = ServerReady(updated);
  }

  void connect(ServerConfig server, BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => SessionListView(server: server)));
  }
}

final serverControllerProvider =
    BaseNotifierProvider<ServerController, ServerState>(ServerController.new);
