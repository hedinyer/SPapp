import 'package:flutter_test/flutter_test.dart';

import 'package:spapp/main.dart';

void main() {
  testWidgets('Muestra la pantalla de inicio de sesión', (WidgetTester tester) async {
    await tester.pumpWidget(const SpApp());
    await tester.pumpAndSettle();

    expect(find.text('Iniciar sesión'), findsOneWidget);
  });
}
