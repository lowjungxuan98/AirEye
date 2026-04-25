import 'package:grim_core/grim_core.dart';

import 'grim_role_select_state.dart';

final grimRoleSelectionProvider = NotifierProvider.autoDispose<GrimRoleSelectionNotifier, GrimRole>(
  GrimRoleSelectionNotifier.new,
);

class GrimRoleSelectionNotifier extends Notifier<GrimRole> {
  @override
  GrimRole build() => GrimRole.sender;

  void setRole(GrimRole role) => state = role;
}
