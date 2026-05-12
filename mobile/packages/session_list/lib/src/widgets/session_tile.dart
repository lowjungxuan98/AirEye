import 'package:core/core.dart';

import '../session_list_model.dart';

class SessionTile extends StatelessWidget {
  const SessionTile({super.key, required this.session, required this.onTap});

  final ClaudeSession session;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      leading: const Icon(Icons.terminal, size: 20),
      title: Text(
        session.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: session.isFallbackTitle
            ? TextStyle(
                fontStyle: FontStyle.italic,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              )
            : null,
      ),
      subtitle: Text(
        _formatSubtitle(session),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  String _formatSubtitle(ClaudeSession session) {
    final parts = <String>[];
    parts.add(_formatDate(session.lastModified));
    if (session.gitBranch != null) {
      parts.add(session.gitBranch!);
    }
    parts.add(_formatFileSize(session.fileSizeBytes));
    return parts.join(' · ');
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day} ${_monthAbbr(dt.month)} ${dt.year}';
  }

  String _monthAbbr(int month) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month];
  }
}
