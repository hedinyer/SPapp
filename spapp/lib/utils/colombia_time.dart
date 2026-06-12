/// Formatea [dateTime] con la misma hora que muestra Supabase en
/// `hora_actualizacion` (componentes UTC del timestamptz almacenado).
String formatBogotaDateTime(DateTime? dateTime) {
  if (dateTime == null) return '';

  final stored = dateTime.toUtc();
  final day = stored.day.toString().padLeft(2, '0');
  final month = stored.month.toString().padLeft(2, '0');
  final year = stored.year;
  final hour = stored.hour.toString().padLeft(2, '0');
  final minute = stored.minute.toString().padLeft(2, '0');

  return '$day/$month/$year $hour:$minute';
}

/// Fecha actual en Colombia (UTC-5) para prellenar contratos.
DateTime nowColombia() {
  return DateTime.now().toUtc().subtract(const Duration(hours: 5));
}

({String dia, String mes, String anio, String anioCorto}) colombiaDateParts([
  DateTime? dateTime,
]) {
  final d = dateTime ?? nowColombia();
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return (
    dia: d.day.toString(),
    mes: meses[d.month - 1],
    anio: d.year.toString(),
    anioCorto: (d.year % 100).toString().padLeft(2, '0'),
  );
}
