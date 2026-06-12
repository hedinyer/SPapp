import 'package:spapp/models/bike_inventory.dart';
import 'package:spapp/models/motorcycle_pricing.dart';
import 'package:spapp/models/user_moto_compra.dart';

class MotoPaymentSummary {
  const MotoPaymentSummary({
    required this.cuotaInicialMonto,
    required this.montoCuotaPeriodo,
    required this.montoTotalPrimerPago,
  });

  final int cuotaInicialMonto;
  final int montoCuotaPeriodo;
  final int montoTotalPrimerPago;
}

abstract final class MotoPaymentCalculator {
  static int montoCuotaPeriodo({
    required int cuotaDiaria,
    required FrecuenciaPago frecuencia,
  }) {
    return switch (frecuencia) {
      FrecuenciaPago.diario => cuotaDiaria,
      FrecuenciaPago.semanal => cuotaDiaria * 7,
      FrecuenciaPago.quincenal => cuotaDiaria * 15,
      FrecuenciaPago.mensual => cuotaDiaria * 30,
    };
  }

  static MotoPaymentSummary calculate({
    required BikeInventory bike,
    required FrecuenciaPago frecuencia,
  }) {
    final cuotaPeriodo = montoCuotaPeriodo(
      cuotaDiaria: bike.cuotaDiaria,
      frecuencia: frecuencia,
    );

    return MotoPaymentSummary(
      cuotaInicialMonto: bike.cuotaInicial,
      montoCuotaPeriodo: cuotaPeriodo,
      montoTotalPrimerPago: bike.cuotaInicial + cuotaPeriodo,
    );
  }

  static String formatCop(int amount) => MotorcyclePricing.formatCop(amount);
}
