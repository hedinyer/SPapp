class MotorcycleSpec {
  const MotorcycleSpec({required this.label, required this.value});

  final String label;
  final String value;
}

class Motorcycle {
  const Motorcycle({
    required this.id,
    required this.name,
    required this.tag,
    required this.description,
    required this.longDescription,
    required this.coverImage,
    required this.gallery,
    required this.specs,
    required this.highlights,
  });

  final String id;
  final String name;
  final String tag;
  final String description;
  final String longDescription;
  final String coverImage;
  final List<String> gallery;
  final List<MotorcycleSpec> specs;
  final List<String> highlights;
}

abstract final class MotorcycleCatalog {
  static const bikes = [
    Motorcycle(
      id: 'bera-sbr-150',
      name: 'Bera SBR 150',
      tag: 'Urbana',
      description:
          'El caballito de hierro. Ágil, económica y lista para conquistar la ciudad cada día.',
      longDescription:
          'La Bera SBR 150 es el equilibrio perfecto entre potencia y economía. Con su motor de 150 cc, freno de disco delantero y consumo de menos de 3 L/100 km, es la compañera ideal para el trabajo, el estudio o la aventura urbana.',
      coverImage: 'public/motos/Berasbr150/1.jpg',
      gallery: [
        'public/motos/Berasbr150/1.jpg',
        'public/motos/Berasbr150/2.jpg',
        'public/motos/Berasbr150/3.jpg',
        'public/motos/Berasbr150/4.jpg',
      ],
      specs: [
        MotorcycleSpec(label: 'Motor', value: '150 cc · 4 tiempos'),
        MotorcycleSpec(label: 'Potencia', value: '12 HP'),
        MotorcycleSpec(label: 'Transmisión', value: 'Manual · 5 vel.'),
        MotorcycleSpec(label: 'Frenos', value: 'Disco / Tambor'),
        MotorcycleSpec(label: 'Tanque', value: '13 litros'),
        MotorcycleSpec(label: 'Consumo', value: '~2,5 L/100 km'),
        MotorcycleSpec(label: 'Vel. máxima', value: '130 km/h'),
        MotorcycleSpec(label: 'Carga útil', value: '180 kg'),
      ],
      highlights: [
        'Freno de disco delantero',
        'Arranque eléctrico y pedal',
        'Bajo costo de mantenimiento',
        'Ideal para ciudad y ruta corta',
      ],
    ),
    Motorcycle(
      id: 'bera-gbr-200',
      name: 'Bera GBR 200',
      tag: 'Deportiva',
      description:
          'Actitud racing y motor 200 cc. Para quien quiere velocidad, estilo y doble freno de disco.',
      longDescription:
          'La GBR 200 mezcla diseño agresivo con componentes de alto nivel: barras invertidas, monoshock, rines 17" y frenos de disco en ambas ruedas. Más potencia, más presencia — sin renunciar al día a día.',
      coverImage: 'public/motos/gbr/gbrnegra.png',
      gallery: [
        'public/motos/gbr/gbrnegra.png',
        'public/motos/gbr/gbrblanca.png',
        'public/motos/gbr/gbramarilla.png',
      ],
      specs: [
        MotorcycleSpec(label: 'Motor', value: '200 cc · 4 tiempos'),
        MotorcycleSpec(label: 'Potencia', value: '~14,5 HP'),
        MotorcycleSpec(label: 'Transmisión', value: 'Manual · 5 vel.'),
        MotorcycleSpec(label: 'Frenos', value: 'Disco / Disco'),
        MotorcycleSpec(label: 'Tanque', value: '14 litros'),
        MotorcycleSpec(label: 'Consumo', value: '~2,9 L/100 km'),
        MotorcycleSpec(label: 'Vel. máxima', value: '120 km/h'),
        MotorcycleSpec(label: 'Peso', value: '131 kg'),
      ],
      highlights: [
        'Suspensión con barras invertidas',
        'Monoshock trasero',
        'Iluminación LED',
        'Rines de aleación 17"',
      ],
    ),
    Motorcycle(
      id: 'bera-milan-150',
      name: 'Bera Milan 150',
      tag: 'Automática',
      description:
          'Scooter automática sin complicaciones. Solo acelera, maneja y llega con estilo a donde quieras.',
      longDescription:
          'La Milan 150 elimina el estrés del tráfico con transmisión automática CVT, tablero digital y un diseño compacto pensado para la ciudad. Práctica, ligera y con espacio para tu día a día.',
      coverImage: 'public/motos/milan/milan-negra.png',
      gallery: [
        'public/motos/milan/milan-negra.png',
        'public/motos/milan/Milan-azul.png',
        'public/motos/milan/milan-rosa.png',
      ],
      specs: [
        MotorcycleSpec(label: 'Motor', value: '150 cc · 4 tiempos'),
        MotorcycleSpec(label: 'Potencia', value: '7 HP'),
        MotorcycleSpec(label: 'Transmisión', value: 'Automática CVT'),
        MotorcycleSpec(label: 'Frenos', value: 'Disco / Tambor'),
        MotorcycleSpec(label: 'Tanque', value: '6 litros'),
        MotorcycleSpec(label: 'Consumo', value: '~2,9 L/100 km'),
        MotorcycleSpec(label: 'Vel. máxima', value: '90 km/h'),
        MotorcycleSpec(label: 'Peso', value: '88 kg'),
      ],
      highlights: [
        'Transmisión automática',
        'Tablero digital',
        'Puerto USB',
        'Compartimiento bajo asiento',
      ],
    ),
    Motorcycle(
      id: 'akt-nkd-125',
      name: 'AKT NKD 125',
      tag: 'Clásica',
      description:
          'El ícono urbano por excelencia. Liviana, eficiente y con el carácter clásico que nunca pasa de moda.',
      longDescription:
          'La NKD 125 combina estilo atemporal con tecnología actual: tablero digital, farola LED, frenos CBS y slipper clutch. Perfecta como primera moto o herramienta de trabajo — ágil en el tráfico y increíblemente eficiente.',
      coverImage: 'public/motos/nkd/1.webp',
      gallery: [
        'public/motos/nkd/1.webp',
        'public/motos/nkd/nkd 2.png',
        'public/motos/nkd/nkd 3.webp',
      ],
      specs: [
        MotorcycleSpec(label: 'Motor', value: '124 cc · 4 tiempos'),
        MotorcycleSpec(label: 'Potencia', value: '10,34 HP'),
        MotorcycleSpec(label: 'Torque', value: '9,3 Nm'),
        MotorcycleSpec(label: 'Transmisión', value: 'Manual · 5 vel.'),
        MotorcycleSpec(label: 'Frenos', value: 'Disco / Tambor · CBS'),
        MotorcycleSpec(label: 'Tanque', value: '9,8 litros'),
        MotorcycleSpec(label: 'Peso', value: '94,5 kg'),
        MotorcycleSpec(label: 'Vel. máxima', value: '110 km/h'),
      ],
      highlights: [
        'Slipper clutch antirrebote',
        'Frenos CBS',
        'Farola LED multifocal',
        'Solo 94 kg de peso seco',
      ],
    ),
  ];

  static Motorcycle? findById(String id) {
    for (final bike in bikes) {
      if (bike.id == id) return bike;
    }
    return null;
  }
}
