import 'package:core/core.dart';

import '../server_controller.dart';
import '../server_state.dart';
import 'server_tile.dart';

class ServerBody extends StatelessWidget {
  const ServerBody({super.key, required this.state, required this.controller});

  final ServerState state;
  final ServerController controller;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      ServerInitial() ||
      ServerLoading() => const Center(child: CircularProgressIndicator()),
      ServerError(:final message) => Center(
        child: Text(
          message,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      ),
      ServerReady(:final servers) =>
        servers.isEmpty
            ? const Center(
                child: Text(
                  'No servers configured',
                  style: TextStyle(color: GrimColors.onSurface),
                ),
              )
            : ListView.builder(
                itemCount: servers.length,
                itemBuilder: (context, index) {
                  final server = servers[index];
                  return ServerTile(
                    server: server,
                    onTap: () => controller.connect(server, context),
                    onDelete: () => controller.deleteServer(server.id),
                  );
                },
              ),
    };
  }
}
