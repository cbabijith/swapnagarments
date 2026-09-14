class AppConfig {
  AppConfig(String url, {String? origin})
    : baseUrl = Uri.parse(url),
      origin = origin ?? Uri.parse(url).origin {
    if (!['http', 'https'].contains(baseUrl.scheme) ||
        baseUrl.host.isEmpty ||
        baseUrl.userInfo.isNotEmpty ||
        baseUrl.path.replaceAll('/', '').isNotEmpty ||
        baseUrl.hasQuery ||
        baseUrl.hasFragment) {
      throw ArgumentError('API_BASE_URL must be a website origin.');
    }
  }
  factory AppConfig.environment() => AppConfig(
    const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://swapna-garmentsweb-production.up.railway.app',
    ),
    origin: const String.fromEnvironment('API_ORIGIN').isEmpty
        ? null
        : const String.fromEnvironment('API_ORIGIN'),
  );
  final Uri baseUrl;
  final String origin;
}
