import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'base_controller.dart';
import 'base_state.dart';

typedef BaseNotifierProvider<C extends BaseController<S>, S extends BaseState> = NotifierProvider<C, S>;
