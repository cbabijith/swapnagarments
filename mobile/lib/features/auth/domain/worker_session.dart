import '../../../core/data/json.dart';

class WorkerSession {
  const WorkerSession({
    required this.name,
    required this.email,
    required this.staffId,
  });
  final String name, email, staffId;
  factory WorkerSession.fromJson(Json json) => WorkerSession(
    name: string(json['name']),
    email: string(json['email']),
    staffId: string(json['staffId']),
  );
}
