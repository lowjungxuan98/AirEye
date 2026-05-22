import 'package:flutter_riverpod/flutter_riverpod.dart';

abstract class BaseWidget extends ConsumerWidget {
  const BaseWidget({super.key});
}

abstract class BaseStatefulWidget extends ConsumerStatefulWidget {
  const BaseStatefulWidget({super.key});
}

abstract class BaseWidgetState<T extends BaseStatefulWidget> extends ConsumerState<T> {}
