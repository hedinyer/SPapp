class TrackingLocation {
  const TrackingLocation({
    required this.lat,
    required this.lng,
    required this.accuracy,
    required this.capturedAt,
  });

  final double lat;
  final double lng;
  final double accuracy;
  final DateTime capturedAt;

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'accuracy': accuracy,
        'captured_at': capturedAt.toUtc().toIso8601String(),
      };

  factory TrackingLocation.fromJson(Map<String, dynamic> json) {
    return TrackingLocation(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
      capturedAt: DateTime.parse(json['captured_at'] as String),
    );
  }
}

class UserTracking {
  const UserTracking({
    required this.id,
    required this.userId,
    this.ubicacion1,
    this.ubicacion2,
    this.ubicacion3,
    this.ubicacion4,
    this.ubicacion5,
    this.ubicacion6,
    this.ubicacion7,
    this.ubicacion8,
    this.ubicacion9,
    this.ubicacion10,
    this.ubicacion11,
    required this.seguimiento,
    required this.createdAt,
    required this.updatedAt,
  });

  final int id;
  final int userId;
  final TrackingLocation? ubicacion1;
  final TrackingLocation? ubicacion2;
  final TrackingLocation? ubicacion3;
  final TrackingLocation? ubicacion4;
  final TrackingLocation? ubicacion5;
  final TrackingLocation? ubicacion6;
  final TrackingLocation? ubicacion7;
  final TrackingLocation? ubicacion8;
  final TrackingLocation? ubicacion9;
  final TrackingLocation? ubicacion10;
  final TrackingLocation? ubicacion11;
  final bool seguimiento;
  final DateTime createdAt;
  final DateTime updatedAt;

  static TrackingLocation? _parseLocation(dynamic value) {
    if (value == null) return null;
    if (value is! Map) return null;
    return TrackingLocation.fromJson(Map<String, dynamic>.from(value));
  }

  factory UserTracking.fromJson(Map<String, dynamic> json) {
    return UserTracking(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      ubicacion1: _parseLocation(json['ubicacion_1']),
      ubicacion2: _parseLocation(json['ubicacion_2']),
      ubicacion3: _parseLocation(json['ubicacion_3']),
      ubicacion4: _parseLocation(json['ubicacion_4']),
      ubicacion5: _parseLocation(json['ubicacion_5']),
      ubicacion6: _parseLocation(json['ubicacion_6']),
      ubicacion7: _parseLocation(json['ubicacion_7']),
      ubicacion8: _parseLocation(json['ubicacion_8']),
      ubicacion9: _parseLocation(json['ubicacion_9']),
      ubicacion10: _parseLocation(json['ubicacion_10']),
      ubicacion11: _parseLocation(json['ubicacion_11']),
      seguimiento: json['seguimiento'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
