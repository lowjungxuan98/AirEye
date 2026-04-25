import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_role_select/grim_role_select.dart';

void main() {
  testWidgets('lays out role cards horizontally on landscape screens', (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(844, 390);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: GrimRoleSelectPage())));

    final senderTopLeft = tester.getTopLeft(find.text('SENDER'));
    final receiverTopLeft = tester.getTopLeft(find.text('RECEIVER'));

    expect((senderTopLeft.dy - receiverTopLeft.dy).abs(), lessThan(1));
    expect(receiverTopLeft.dx, greaterThan(senderTopLeft.dx));
  });
}
