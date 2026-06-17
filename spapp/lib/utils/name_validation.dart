bool isFullName(String value) {
  final words = value
      .trim()
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty)
      .toList();
  return words.length >= 3;
}

String? validateFullName(String? value) {
  if (value == null || value.trim().isEmpty) {
    return 'Escribe tu nombre completo';
  }
  if (!isFullName(value)) {
    return 'Escribe nombre, primer apellido y segundo apellido';
  }
  return null;
}
