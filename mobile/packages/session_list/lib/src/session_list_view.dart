import 'package:core/core.dart';

import 'session_list_controller.dart';
import 'session_list_state.dart';
import 'widgets/session_list_body.dart';

class SessionListView extends BasePage {
  const SessionListView({super.key, required this.server});

  final ServerConfig server;

  @override
  Widget buildPage(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sessionListControllerProvider);
    final controller = ref.read(sessionListControllerProvider.notifier);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state is SessionListLoading || controller.serverId != server.id) {
        controller.load(server);
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(server.host),
        leading: const GrimBackButton(),
        actions: [
          if (state is SessionListReady)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => controller.refresh(server),
            ),
        ],
      ),
      body: SessionListBody(
        state: state,
        server: server,
        controller: controller,
      ),
    );
  }
}
