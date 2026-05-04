import 'package:core/core.dart';
import 'select_role_controller.dart';
import 'select_role_state.dart';
import 'widgets/ready_body.dart';

class SelectRoleView extends BasePage {
  const SelectRoleView({super.key});

  @override
  Widget buildPage(context, ref) {
    final state = ref.watch(selectRoleControllerProvider);
    final controller = ref.read(selectRoleControllerProvider.notifier);

    return Scaffold(
      body: SafeArea(
        child: switch (state) {
          SelectRoleLoading() => const Center(child: CircularProgressIndicator()),
          SelectRoleError(:final message) => Center(
            child: Text(
              message,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
          SelectRoleReady(:final provider, :final isUpdatingProvider) => ReadyBody(
            provider: provider,
            isUpdatingProvider: isUpdatingProvider,
            controller: controller,
          ),
        },
      ),
    );
  }
}
