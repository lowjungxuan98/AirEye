import 'package:core/core.dart';

sealed class SelectRoleState extends BaseState {
  const SelectRoleState();
}

class SelectRoleLoading extends SelectRoleState {
  const SelectRoleLoading();
}

class SelectRoleReady extends SelectRoleState {
  const SelectRoleReady();
}

class SelectRoleError extends SelectRoleState {
  const SelectRoleError(this.message);
  final String message;
}
