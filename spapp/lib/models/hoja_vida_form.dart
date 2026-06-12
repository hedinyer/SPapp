enum TipoIdentificacion { ppt, cc, p, cv }

enum EstadoCivil { soltero, casado, unionLibre }

class ReferenciaPersonal {
  const ReferenciaPersonal({this.nombre = '', this.celular = ''});

  final String nombre;
  final String celular;

  ReferenciaPersonal copyWith({String? nombre, String? celular}) {
    return ReferenciaPersonal(
      nombre: nombre ?? this.nombre,
      celular: celular ?? this.celular,
    );
  }

  Map<String, dynamic> toJson() => {'nombre': nombre, 'celular': celular};

  factory ReferenciaPersonal.fromJson(Map<String, dynamic> json) {
    return ReferenciaPersonal(
      nombre: json['nombre'] as String? ?? '',
      celular: json['celular'] as String? ?? '',
    );
  }

  bool get isComplete => nombre.trim().isNotEmpty && celular.trim().length >= 10;
}

class HojaVidaForm {
  const HojaVidaForm({
    this.nombreCompleto = '',
    this.tipoIdentificacion,
    this.numeroIdentificacion = '',
    this.fechaNacimiento = '',
    this.celular = '',
    this.direccion = '',
    this.barrio = '',
    this.correo = '',
    this.trabajaEmpresa,
    this.nombreEmpresa = '',
    this.telefonoEmpresa = '',
    this.direccionEmpresa = '',
    this.independiente,
    this.habilidad = '',
    this.estadoCivil,
    this.nombreConyuge = '',
    this.celularConyuge = '',
    this.referencias = const [
      ReferenciaPersonal(),
      ReferenciaPersonal(),
    ],
  });

  final String nombreCompleto;
  final TipoIdentificacion? tipoIdentificacion;
  final String numeroIdentificacion;
  final String fechaNacimiento;
  final String celular;
  final String direccion;
  final String barrio;
  final String correo;
  final bool? trabajaEmpresa;
  final String nombreEmpresa;
  final String telefonoEmpresa;
  final String direccionEmpresa;
  final bool? independiente;
  final String habilidad;
  final EstadoCivil? estadoCivil;
  final String nombreConyuge;
  final String celularConyuge;
  final List<ReferenciaPersonal> referencias;

  bool get isComplete {
    if (nombreCompleto.trim().isEmpty) return false;
    if (tipoIdentificacion == null) return false;
    if (numeroIdentificacion.trim().isEmpty) return false;
    if (fechaNacimiento.trim().isEmpty) return false;
    if (celular.trim().length < 10) return false;
    if (direccion.trim().isEmpty || barrio.trim().isEmpty) return false;
    if (correo.trim().isEmpty || !correo.contains('@')) return false;
    if (trabajaEmpresa == null) return false;
    if (trabajaEmpresa == true) {
      if (nombreEmpresa.trim().isEmpty) return false;
    } else {
      if (independiente != true && habilidad.trim().isEmpty) return false;
    }
    if (estadoCivil == null) return false;
    if (estadoCivil == EstadoCivil.casado ||
        estadoCivil == EstadoCivil.unionLibre) {
      if (nombreConyuge.trim().isEmpty || celularConyuge.trim().length < 10) {
        return false;
      }
    }
    return referencias.every((r) => r.isComplete);
  }

  HojaVidaForm copyWith({
    String? nombreCompleto,
    TipoIdentificacion? tipoIdentificacion,
    String? numeroIdentificacion,
    String? fechaNacimiento,
    String? celular,
    String? direccion,
    String? barrio,
    String? correo,
    bool? trabajaEmpresa,
    String? nombreEmpresa,
    String? telefonoEmpresa,
    String? direccionEmpresa,
    bool? independiente,
    String? habilidad,
    EstadoCivil? estadoCivil,
    String? nombreConyuge,
    String? celularConyuge,
    List<ReferenciaPersonal>? referencias,
  }) {
    return HojaVidaForm(
      nombreCompleto: nombreCompleto ?? this.nombreCompleto,
      tipoIdentificacion: tipoIdentificacion ?? this.tipoIdentificacion,
      numeroIdentificacion: numeroIdentificacion ?? this.numeroIdentificacion,
      fechaNacimiento: fechaNacimiento ?? this.fechaNacimiento,
      celular: celular ?? this.celular,
      direccion: direccion ?? this.direccion,
      barrio: barrio ?? this.barrio,
      correo: correo ?? this.correo,
      trabajaEmpresa: trabajaEmpresa ?? this.trabajaEmpresa,
      nombreEmpresa: nombreEmpresa ?? this.nombreEmpresa,
      telefonoEmpresa: telefonoEmpresa ?? this.telefonoEmpresa,
      direccionEmpresa: direccionEmpresa ?? this.direccionEmpresa,
      independiente: independiente ?? this.independiente,
      habilidad: habilidad ?? this.habilidad,
      estadoCivil: estadoCivil ?? this.estadoCivil,
      nombreConyuge: nombreConyuge ?? this.nombreConyuge,
      celularConyuge: celularConyuge ?? this.celularConyuge,
      referencias: referencias ?? this.referencias,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'nombre_completo': nombreCompleto,
      'tipo_identificacion': tipoIdentificacion?.name,
      'numero_identificacion': numeroIdentificacion,
      'fecha_nacimiento': fechaNacimiento,
      'celular': celular,
      'direccion': direccion,
      'barrio': barrio,
      'correo': correo,
      'trabaja_empresa': trabajaEmpresa,
      'nombre_empresa': nombreEmpresa,
      'telefono_empresa': telefonoEmpresa,
      'direccion_empresa': direccionEmpresa,
      'independiente': independiente,
      'habilidad': habilidad,
      'estado_civil': _estadoCivilToDb(estadoCivil),
      'nombre_conyuge': nombreConyuge,
      'celular_conyuge': celularConyuge,
      'referencias': referencias.map((r) => r.toJson()).toList(),
    };
  }

  factory HojaVidaForm.fromJson(Map<String, dynamic> json) {
    final refsRaw = json['referencias'] as List?;
    final refs = refsRaw != null && refsRaw.isNotEmpty
        ? refsRaw
            .map((e) => ReferenciaPersonal.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ))
            .toList()
        : [const ReferenciaPersonal(), const ReferenciaPersonal()];

    while (refs.length < 2) {
      refs.add(const ReferenciaPersonal());
    }

    return HojaVidaForm(
      nombreCompleto: json['nombre_completo'] as String? ?? '',
      tipoIdentificacion: _tipoFromDb(json['tipo_identificacion'] as String?),
      numeroIdentificacion: json['numero_identificacion'] as String? ?? '',
      fechaNacimiento: json['fecha_nacimiento'] as String? ?? '',
      celular: json['celular'] as String? ?? '',
      direccion: json['direccion'] as String? ?? '',
      barrio: json['barrio'] as String? ?? '',
      correo: json['correo'] as String? ?? '',
      trabajaEmpresa: json['trabaja_empresa'] as bool?,
      nombreEmpresa: json['nombre_empresa'] as String? ?? '',
      telefonoEmpresa: json['telefono_empresa'] as String? ?? '',
      direccionEmpresa: json['direccion_empresa'] as String? ?? '',
      independiente: json['independiente'] as bool?,
      habilidad: json['habilidad'] as String? ?? '',
      estadoCivil: _estadoCivilFromDb(json['estado_civil'] as String?),
      nombreConyuge: json['nombre_conyuge'] as String? ?? '',
      celularConyuge: json['celular_conyuge'] as String? ?? '',
      referencias: refs,
    );
  }

  static TipoIdentificacion? _tipoFromDb(String? value) {
    if (value == null) return null;
    for (final t in TipoIdentificacion.values) {
      if (t.name == value) return t;
    }
    return null;
  }

  static String? _estadoCivilToDb(EstadoCivil? value) {
    if (value == null) return null;
    return switch (value) {
      EstadoCivil.soltero => 'soltero',
      EstadoCivil.casado => 'casado',
      EstadoCivil.unionLibre => 'union_libre',
    };
  }

  static EstadoCivil? _estadoCivilFromDb(String? value) {
    return switch (value) {
      'soltero' => EstadoCivil.soltero,
      'casado' => EstadoCivil.casado,
      'union_libre' => EstadoCivil.unionLibre,
      _ => null,
    };
  }

  static String labelTipoIdentificacion(TipoIdentificacion tipo) {
    return switch (tipo) {
      TipoIdentificacion.ppt => 'PPT',
      TipoIdentificacion.cc => 'C.C.',
      TipoIdentificacion.p => 'P',
      TipoIdentificacion.cv => 'C.V.',
    };
  }

  static String labelEstadoCivil(EstadoCivil estado) {
    return switch (estado) {
      EstadoCivil.soltero => 'Soltero(a)',
      EstadoCivil.casado => 'Casado(a)',
      EstadoCivil.unionLibre => 'Unión libre',
    };
  }
}
