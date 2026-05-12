import 'package:core/core.dart';

import '../session_list_controller.dart';
import '../session_list_state.dart';
import 'session_tile.dart';

class SessionListBody extends StatelessWidget {
  const SessionListBody({
    super.key,
    required this.state,
    required this.server,
    required this.controller,
  });

  final SessionListState state;
  final ServerConfig server;
  final SessionListController controller;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      SessionListLoading() => const Center(child: CircularProgressIndicator()),
      SessionListError(:final message) => _SessionListErrorBody(
        message: message,
        onRetry: () => controller.load(server),
      ),
      SessionListReady(:final sessions) =>
        sessions.isEmpty
            ? const Center(child: Text('No Claude Code sessions found'))
            : RefreshIndicator(
                onRefresh: () => controller.refresh(server),
                child: ListView.builder(
                  itemCount: sessions.length,
                  itemBuilder: (context, index) {
                    final session = sessions[index];
                    return SessionTile(
                      session: session,
                      onTap: () {
                        controller.navigateToTerminal(context, server.id);
                      },
                    );
                  },
                ),
              ),
    };
  }
}

class _SessionListErrorBody extends StatelessWidget {
  const _SessionListErrorBody({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            message,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
