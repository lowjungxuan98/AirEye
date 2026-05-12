import 'package:core/core.dart';

import 'server_controller.dart';
import 'widgets/server_body.dart';

class ServerView extends BasePage {
  const ServerView({super.key});

  @override
  Widget buildPage(context, ref) {
    final state = ref.watch(serverControllerProvider);
    final controller = ref.read(serverControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Servers'),
        leading: const GrimBackButton(),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => controller.addServerFromForm(context),
          ),
        ],
      ),
      body: ServerBody(state: state, controller: controller),
    );
  }
}
