import 'package:core/core.dart';
import 'receiver_controller.dart';
import 'receiver_state.dart';
import 'widgets/grid_item.dart';

class ReceiverView extends BasePage {
  const ReceiverView({super.key});

  @override
  Widget buildPage(context, ref) {
    final state = ref.watch(receiverControllerProvider);
    final controller = ref.read(receiverControllerProvider.notifier);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state is ReceiverInitial) {
        controller.loadFirstPage();
      }
    });

    final isCapturing = state is ReceiverReady && state.isCapturing;

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: isCapturing ? null : controller.capture,
        child: isCapturing
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.add),
      ),
      body: Stack(
        children: [
          switch (state) {
            ReceiverLoading() => const Center(
              child: CircularProgressIndicator(),
            ),
            ReceiverError(:final message) => Center(
              child: Text(
                message,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
            ReceiverReady(
              :final items,
              :final isLoadingMore,
              :final isRefreshing,
              :final regeneratingIds,
            ) =>
              Stack(
                children: [
                  RefreshIndicator(
                    onRefresh: controller.refresh,
                    child: NotificationListener<ScrollNotification>(
                      onNotification: (n) {
                        if (n.metrics.extentAfter < 400) {
                          controller.loadNextPage();
                        }
                        return false;
                      },
                      child: CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          SliverPadding(
                            padding: const EdgeInsets.only(top: 100),
                            sliver: SliverGrid(
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 4,
                                    crossAxisSpacing: 0,
                                    mainAxisSpacing: 0,
                                  ),
                              delegate: SliverChildBuilderDelegate((
                                context,
                                index,
                              ) {
                                final item = items[index];
                                final imageUrl = item.imageUrl;
                                if (imageUrl == null || imageUrl.isEmpty) {
                                  return Container(
                                    color: GrimColors.surfaceAlt,
                                  );
                                }
                                return GridItem(
                                  item: item,
                                  imageUrl: imageUrl,
                                  isRegenerating: regeneratingIds.contains(
                                    imageUrl,
                                  ),
                                  onRegenerate: () =>
                                      controller.regenerate(item),
                                );
                              }, childCount: items.length),
                            ),
                          ),
                          if (isLoadingMore)
                            const SliverToBoxAdapter(
                              child: Padding(
                                padding: EdgeInsets.all(12),
                                child: Center(
                                  child: CircularProgressIndicator(),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  if (isRefreshing)
                    const ColoredBox(
                      color: Color(0x80000000),
                      child: SizedBox.expand(
                        child: Center(child: CircularProgressIndicator()),
                      ),
                    ),
                ],
              ),
            _ => const SizedBox.shrink(),
          },
          const GrimBackButton(),
        ],
      ),
    );
  }
}
