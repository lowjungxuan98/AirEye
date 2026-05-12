import 'package:core/core.dart';

class ServerTile extends StatelessWidget {
  const ServerTile({
    super.key,
    required this.server,
    required this.onTap,
    required this.onDelete,
  });

  final ServerConfig server;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(server.host),
      subtitle: Text('${server.username}@${server.host}:${server.port}'),
      onTap: onTap,
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline),
        onPressed: onDelete,
      ),
    );
  }
}
