import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_image_full_screen/grim_image_full_screen.dart';

import '../../application/grim_receiver_grid_controller.dart';
import '../../application/grim_receiver_grid_providers.dart';
import '../widgets/grim_receiver_grid_tile.dart';

class GrimReceiverGridPage extends ConsumerWidget {
  const GrimReceiverGridPage({super.key});

  static const Color _gap = Color(0xFF0A0C10);
  static const int _crossAxisCount = 4;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final exportAsync = ref.watch(grimReceiverExportPageProvider);
    final gridState = ref.watch(grimReceiverGridControllerProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        bottom: false,
        child: ColoredBox(
          color: _gap,
          child: exportAsync.when(
            data: (page) {
              final imageRows = page.data.where((row) => row.hasImage).toList(growable: false);
              final fullScreenImages = imageRows
                  .map((row) => GrimFullScreenImage(imageUrl: row.imageUrl!, finalText: row.finalText ?? ''))
                  .toList(growable: false);

              if (page.data.isEmpty) {
                return RefreshIndicator(
                  color: GrimColors.accent,
                  onRefresh: () => _refreshExport(ref),
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 120),
                      Center(
                        child: Text(
                          'No uploads yet.\nPull to refresh after sending an image.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white54, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                color: GrimColors.accent,
                onRefresh: () => _refreshExport(ref),
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    if (page.isNext)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(12, 10, 12, 4),
                          child: Text(
                            'Showing first page only — more rows on the server.',
                            style: TextStyle(color: Colors.white38, fontSize: 12),
                          ),
                        ),
                      ),
                    SliverPadding(
                      padding: const EdgeInsets.all(2),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: _crossAxisCount,
                          crossAxisSpacing: 2,
                          mainAxisSpacing: 2,
                          childAspectRatio: 1,
                        ),
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final row = page.data[index];
                          return GrimReceiverGridTile(
                            row: row,
                            onImageTap: (selectedRow) {
                              final initialIndex = imageRows.indexOf(selectedRow);
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => GrimImageFullScreenPage(
                                    contents: fullScreenImages,
                                    initialIndex: initialIndex < 0 ? 0 : initialIndex,
                                  ),
                                ),
                              );
                            },
                          );
                        }, childCount: page.data.length),
                      ),
                    ),
                  ],
                ),
              );
            },
            loading: () => const Center(
              child: SizedBox(
                width: 36,
                height: 36,
                child: CircularProgressIndicator(strokeWidth: 3, color: GrimColors.accent),
              ),
            ),
            error: (error, _) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 48),
                const Icon(Icons.cloud_off_outlined, size: 48, color: Colors.white38),
                const SizedBox(height: 16),
                const Text(
                  'Could not load export',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white38, fontSize: 13),
                ),
                const SizedBox(height: 24),
                Center(
                  child: FilledButton(onPressed: () => _refreshExport(ref), child: const Text('Retry')),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: GrimColors.accentAlt,
        foregroundColor: Colors.black,
        elevation: 6,
        tooltip: 'Request capture',
        onPressed: gridState.isRequestingCapture ? null : () => _requestCapture(context, ref),
        child: gridState.isRequestingCapture
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.6, color: Colors.black),
              )
            : const Icon(Icons.camera_alt_outlined, size: 28),
      ),
    );
  }

  static Future<void> _requestCapture(BuildContext context, WidgetRef ref) async {
    final result = await ref.read(grimReceiverGridControllerProvider.notifier).requestCapture();
    if (!context.mounted) {
      return;
    }
    if (result.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Capture request sent')));
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Capture request failed: ${result.errorMessage}')));
  }

  static Future<void> _refreshExport(WidgetRef ref) async {
    await ref.read(grimReceiverGridControllerProvider.notifier).refreshExport();
  }
}
