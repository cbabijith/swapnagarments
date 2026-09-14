import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:swapna_garments/app/swapna_app.dart';
import 'package:swapna_garments/core/providers.dart';
import 'support/fake_api.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
    for (final (family, path) in [
      ('Geist', 'Geist'),
      ('StudioSerif', 'StudioSerif'),
    ]) {
      await (FontLoader(
        family,
      )..addFont(rootBundle.load('assets/fonts/$path.ttf'))).load();
    }
  });
  Future<void> capture(WidgetTester tester, String name) async {
    if (!const bool.fromEnvironment('CAPTURE_SCREENSHOTS')) return;
    await expectLater(
      find.byKey(const ValueKey('capture')),
      matchesGoldenFile('../build/qa/$name.png'),
    );
  }

  for (final width in [320.0, 390.0, 768.0]) {
    testWidgets('worker navigation and layouts at $width pixels', (
      tester,
    ) async {
      final fake = FakeApi();
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiProvider.overrideWithValue(fake.api),
            eventsProvider.overrideWithValue(fake.events),
          ],
          child: const RepaintBoundary(
            key: ValueKey('capture'),
            child: SwapnaApp(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('My work'), findsWidgets);
      expect(find.text('Cotton with matching lining'), findsWidgets);
      expect(tester.takeException(), isNull);
      await capture(tester, 'queue-${width.toInt()}');
      for (final (label, title) in [
        ('Calendar', 'My calendar'),
        ('Scan piece', 'Scan a piece'),
        ('History', 'My history'),
        ('Profile', 'My profile'),
      ]) {
        await tester.tap(find.text(label).last);
        await tester.pumpAndSettle();
        expect(find.text(title), findsOneWidget);
        expect(tester.takeException(), isNull);
        await capture(
          tester,
          '${label.toLowerCase().replaceAll(' ', '-')}-${width.toInt()}',
        );
      }
      await tester.tap(find.text('History').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('View details →'));
      await tester.pumpAndSettle();
      expect(find.text('Work details'), findsOneWidget);
      expect(find.text('Sample Customer'), findsOneWidget);
      await capture(tester, 'history-detail-${width.toInt()}');
      await tester.tap(find.text('Measurements'));
      await tester.pumpAndSettle();
      expect(find.text('Bust'), findsOneWidget);
      expect(find.text('36'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await capture(tester, 'measurements-${width.toInt()}');
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      fake.dispose();
    });
  }
  testWidgets('sign-in validates and opens only worker data', (tester) async {
    final fake = FakeApi()..signedIn = false;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiProvider.overrideWithValue(fake.api),
          eventsProvider.overrideWithValue(fake.events),
        ],
        child: const SwapnaApp(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextFormField).first,
      'anjali@example.test',
    );
    await tester.enterText(find.byType(TextFormField).last, 'example password');
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('My work'), findsWidgets);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    fake.dispose();
  });
}
