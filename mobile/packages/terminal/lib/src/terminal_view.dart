import 'package:core/core.dart';

class TerminalView extends ConsumerWidget {
  const TerminalView({super.key, required this.serverId});

  final String serverId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.watch(grimSshProvider)[serverId];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Terminal'),
        leading: const GrimBackButton(),
      ),
      body: client != null
          ? GrimTerminal(client: client)
          : const Center(child: CircularProgressIndicator()),
    );
  }
}
