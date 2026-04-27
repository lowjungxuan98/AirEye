import 'package:core/core.dart';
import 'select_role_controller.dart';
import 'select_role_state.dart';

class SelectRoleView extends BasePage {
  const SelectRoleView({super.key});

  @override
  Widget buildPage(context, ref) {
    final state = ref.watch(selectRoleControllerProvider);

    return Scaffold(
      body: Center(
        child: switch (state) {
          SelectRoleLoading() => const CircularProgressIndicator(),
          SelectRoleError(:final message) => Text(
            message,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          _ => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextButton(
                onPressed: () => ref.read(selectRoleControllerProvider.notifier).navigateToSender(context),
                child: const Text('Sender'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => ref.read(selectRoleControllerProvider.notifier).navigateToReceiver(context),
                child: const Text('Receiver'),
              ),
            ],
          ),
        },
      ),
    );
  }
}
