import 'package:core/core.dart';
import 'package:details/details.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const item = ExportListItem(createdAt: 1, imageUrl: 'https://example.com/image.jpg', finalText: '<p>Extracted text</p>', errorMessage: 'OCR warning');

  Future<void> pumpDetail(WidgetTester tester, Size size) async {
    tester.view
      ..physicalSize = size
      ..devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: ImageDetailView(item: item)),
      ),
    );
    await tester.pump();
  }

  testWidgets('portrait shows bottom text sheet', (tester) async {
    await pumpDetail(tester, const Size(390, 844));

    expect(find.byType(GrimTextSheet), findsOneWidget);
    expect(find.byKey(const Key('imageDetailLandscapeTextPanel')), findsNothing);
  });

  testWidgets('landscape shows right text panel without bottom sheet', (tester) async {
    await pumpDetail(tester, const Size(844, 390));

    expect(find.byType(GrimTextSheet), findsNothing);
    expect(find.byKey(const Key('imageDetailLandscapeTextPanel')), findsOneWidget);
    expect(find.byKey(const Key('imageDetailLandscapeSplitHandle')), findsOneWidget);
    expect(find.byType(GrimTextContent), findsOneWidget);
  });

  testWidgets('landscape split handle resizes text panel', (tester) async {
    await pumpDetail(tester, const Size(844, 390));

    final panelFinder = find.byKey(const Key('imageDetailLandscapeTextPanel'));
    final initialPanelWidth = tester.getSize(panelFinder).width;

    await tester.drag(find.byKey(const Key('imageDetailLandscapeSplitHandle')), const Offset(-120, 0));
    await tester.pump();

    expect(tester.getSize(panelFinder).width, greaterThan(initialPanelWidth));
  });
}
