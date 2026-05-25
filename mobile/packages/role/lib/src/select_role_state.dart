import 'package:core/core.dart';

sealed class SelectRoleState extends BaseState {
  const SelectRoleState();
}

class SelectRoleLoading extends SelectRoleState {
  const SelectRoleLoading();
}

class SelectRoleReady extends SelectRoleState {
  const SelectRoleReady({required this.provider, this.aiEnabled = true, this.isUpdatingProvider = false, this.isUpdatingAi = false});
  final ProviderResponse provider;
  final bool aiEnabled;
  final bool isUpdatingProvider;
  final bool isUpdatingAi;
}

class SelectRoleError extends SelectRoleState {
  const SelectRoleError(this.message);
  final String message;
}
