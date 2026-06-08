class PaymentOption {
  const PaymentOption({
    required this.label,
    required this.amount,
    required this.period,
  });

  final String label;
  final int amount;
  final String period;
}

abstract final class MotorcyclePricing {
  static const dailyAmount = 38000;

  static const options = [
    PaymentOption(
      label: 'Diario',
      amount: dailyAmount,
      period: 'por día',
    ),
    PaymentOption(
      label: 'Semanal',
      amount: dailyAmount * 7,
      period: '7 días · por adelantado',
    ),
    PaymentOption(
      label: 'Quincenal',
      amount: dailyAmount * 15,
      period: '15 días · por adelantado',
    ),
    PaymentOption(
      label: 'Mensual',
      amount: dailyAmount * 30,
      period: '30 días · por adelantado',
    ),
  ];

  static const advanceNote =
      'Elige pagar semanal, quincenal o mensual por adelantado.';

  static String formatCop(int amount) {
    final digits = amount.toString();
    final buffer = StringBuffer('\$');
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }

  static String get dailyFormatted => formatCop(dailyAmount);
}
