import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:swapna_garments/app/swapna_app.dart';
import 'package:swapna_garments/core/events/app_events.dart';
import 'package:swapna_garments/core/providers.dart';
import 'support/fake_api.dart';

void main() {
  late FakeApi fake;
  Future<void> mount(WidgetTester tester) async {
    fake = FakeApi();
    tester.view.physicalSize = const Size(390, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
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
  }

  Future<void> unmount(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    fake.dispose();
  }

  testWidgets('completion requires confirmation and refreshes the queue', (
    tester,
  ) async {
    await mount(tester);
    await tester.ensureVisible(find.text('Complete stage').first);
    await tester.tap(find.text('Complete stage').first);
    await tester.pumpAndSettle();
    expect(find.text('Complete Cutting?'), findsOneWidget);
    expect(fake.commands, isEmpty);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(fake.commands, isEmpty);
    await tester.tap(find.text('Complete stage').first);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Complete stage').last);
    await tester.pumpAndSettle();
    expect(fake.commands, hasLength(1));
    expect(find.text('Your queue is clear'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await unmount(tester);
  });
  testWidgets(
    'block dialog validates a reason and persists successful action',
    (tester) async {
      await mount(tester);
      await tester.ensureVisible(find.text('Block').first);
      await tester.tap(find.text('Block').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Block work'));
      await tester.pumpAndSettle();
      expect(
        find.text('Add a reason between 3 and 500 characters.'),
        findsOneWidget,
      );
      expect(fake.commands, isEmpty);
      await tester.enterText(find.byType(TextField), 'Waiting for lining');
      await tester.tap(find.text('Block work'));
      await tester.pumpAndSettle();
      expect(fake.commands.single['action']['reason'], 'Waiting for lining');
      expect(find.text('Block this work?'), findsNothing);
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );
  testWidgets('session expiry closes protected detail routes', (tester) async {
    await mount(tester);
    await tester.tap(find.text('History').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('View details →'));
    await tester.pumpAndSettle();
    fake.signedIn = false;
    fake.events.emit(const RefreshRequested());
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Work details'), findsNothing);
    expect(tester.takeException(), isNull);
    await unmount(tester);
  });
  testWidgets('manual scan navigates to a filtered queue without a mutation', (
    tester,
  ) async {
    await mount(tester);
    await tester.tap(find.text('Scan piece').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'SG-2100');
    await tester.ensureVisible(find.text('Find piece'));
    await tester.tap(find.text('Find piece'));
    await tester.pumpAndSettle();
    expect(find.text('Scanned label · Show full queue'), findsOneWidget);
    expect(fake.commands, isEmpty);
    expect(tester.takeException(), isNull);
    await unmount(tester);
  });
}
