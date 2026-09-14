import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class SessionStore {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore(String origin)
    : _key = 'session:${Uri.encodeComponent(origin)}';
  final String _key;
  final _storage = const FlutterSecureStorage();
  @override
  Future<String?> read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      if (DateTime.parse(data['expires'] as String).isAfter(DateTime.now())) {
        return data['cookie'] as String;
      }
    } on FormatException {
      // Treat a corrupt local session as signed out.
    } on TypeError {
      // The next sign-in issues a fresh session.
    }
    await clear();
    return null;
  }

  @override
  Future<void> write(String value) => _storage.write(key: _key, value: value);
  @override
  Future<void> clear() => _storage.delete(key: _key);
}
