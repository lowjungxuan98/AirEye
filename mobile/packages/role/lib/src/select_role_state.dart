import 'package:core/core.dart';

sealed class SelectRoleState extends BaseState {
  const SelectRoleState();
}

class SelectRoleLoading extends SelectRoleState {
  const SelectRoleLoading();
}

class SelectRoleReady extends SelectRoleState {
  const SelectRoleReady({required this.provider, this.isUpdatingProvider = false});
  final ProviderResponse provider;
  final bool isUpdatingProvider;
}

class SelectRoleError extends SelectRoleState {
  const SelectRoleError(this.message);
  final String message;
}
