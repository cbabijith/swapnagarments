import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../events/app_events.dart';
import 'api_failure.dart';
import 'session_store.dart';

class ApiClient {
  ApiClient(this.config, this.store, this.events, {Dio? dio})
    : _dio = dio ?? Dio() {
    _dio.options = BaseOptions(
      baseUrl: config.baseUrl.origin,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 15),
      followRedirects: false,
      headers: {'Accept': 'application/json', 'Origin': config.origin},
    );
  }
  final AppConfig config;
  final SessionStore store;
  final AppEvents events;
  final Dio _dio;
  Future<void>? _loading;
  String? _cookie;
  int _sessionEpoch = 0;
  Future<void> _restore() => _loading ??= _load();
  Future<void> _load() async {
    _cookie = await store.read();
  }

  Future<void> clearSession() async {
    _sessionEpoch++;
    _cookie = null;
    _loading = Future.value();
    await store.clear();
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancel,
  }) async {
    final response = await _request(path, query: query, cancel: cancel);
    if (response.data is! Map) {
      throw const ApiFailure('The server returned an unexpected response.');
    }
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<void> signIn(String email, String password) async {
    await clearSession();
    final response = await _request(
      '/api/auth',
      method: 'POST',
      body: {
        'action': 'signin',
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );
    final headers = response.headers['set-cookie'] ?? [];
    final match = RegExp(
      r'(?:^|[,\s])swapna_session=([^;\s,]+)',
    ).firstMatch(headers.join(','));
    if (match == null) {
      throw const ApiFailure(
        'The website did not return a session. Try again.',
      );
    }
    final cookie = 'swapna_session=${match.group(1)}';
    final maxAge =
        int.tryParse(
          RegExp(
                r'[Mm]ax-[Aa]ge=(\d+)',
              ).firstMatch(headers.join(';'))?.group(1) ??
              '',
        ) ??
        604800;
    await store.write(
      jsonEncode({
        'cookie': cookie,
        'expires': DateTime.now()
            .toUtc()
            .add(Duration(seconds: maxAge))
            .toIso8601String(),
      }),
    );
    _cookie = cookie;
  }

  Future<void> signOut() async {
    await _request('/api/auth', method: 'DELETE');
    await clearSession();
  }

  Future<Map<String, dynamic>> command(Map<String, dynamic> body) async {
    final response = await _request('/api/work', method: 'POST', body: body);
    if (response.data is! Map) {
      throw const ApiFailure(
        'Could not confirm the update. Refresh your work.',
        uncertain: true,
      );
    }
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<Uint8List> imageBytes(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancel,
  }) async {
    final result = await _request(
      path,
      query: query,
      cancel: cancel,
      responseType: ResponseType.bytes,
    );
    return Uint8List.fromList((result.data as List).cast<int>());
  }

  Future<Response<dynamic>> _request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? query,
    Object? body,
    CancelToken? cancel,
    ResponseType? responseType,
  }) async {
    // Never send a session to an absolute/scanned URL or follow redirects.
    if (!path.startsWith('/') ||
        path.startsWith('//') ||
        path.contains('://')) {
      throw ArgumentError('Only relative API paths are allowed.');
    }
    await _restore();
    final epoch = _sessionEpoch;
    try {
      return await _dio.request<dynamic>(
        path,
        queryParameters: query,
        data: body,
        cancelToken: cancel,
        options: Options(
          method: method,
          responseType: responseType,
          headers: {
            if (_cookie != null) 'Cookie': _cookie,
            if (method == 'POST') 'Prefer': 'return=minimal',
          },
        ),
      );
    } on DioException catch (error) {
      if (CancelToken.isCancel(error)) rethrow;
      final status = error.response?.statusCode;
      if (status == 401 && path != '/api/auth' && epoch == _sessionEpoch) {
        await clearSession();
        events.emit(const SessionExpired());
      }
      final data = error.response?.data;
      final message = data is Map ? data['error'] : null;
      throw ApiFailure(
        message is String
            ? message
            : status == null
            ? 'Connection interrupted. Check your connection and try again.'
            : 'The request could not be completed ($status). Please try again.',
        status: status,
        uncertain: status == null && method == 'POST',
      );
    }
  }

  void dispose() => _dio.close(force: true);
}
