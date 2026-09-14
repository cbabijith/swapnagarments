import '../../../core/data/json.dart';

class WorkerProfile {
  WorkerProfile.fromJson(Json data) : data = Map.unmodifiable(data);
  final Json data;
  String get name => string(data['name']);
  String get email => string(data['email']);
  String get role => string(data['role']);
  bool get available => data['available'] == true;
  List<int> get skills => (data['skills'] as List? ?? [])
      .whereType<num>()
      .map((v) => v.toInt())
      .toList();
  int get capacity => integer(data['capacityMinutes']);
}
