class ApiFailure implements Exception {
  const ApiFailure(this.message, {this.status, this.uncertain = false});
  final String message;
  final int? status;
  final bool uncertain;
  @override
  String toString() => message;
}
