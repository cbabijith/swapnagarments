// Placeholder smoke test: the app renders its home page.

import 'package:flutter_test/flutter_test.dart';

import 'package:swapna_garments/main.dart';

void main() {
  testWidgets('Home page renders app bar and module cards', (WidgetTester tester) async {
    await tester.pumpWidget(const SwapnaApp());

    expect(find.text('Swapna Garments'), findsOneWidget);
    expect(find.text('Station scanning'), findsOneWidget);
    expect(find.text('Work queues'), findsOneWidget);
    expect(find.text('Staff sign-in'), findsOneWidget);
  });
}
