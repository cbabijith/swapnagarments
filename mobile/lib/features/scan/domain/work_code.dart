/// Printed garment labels are identifiers; scanning never executes a URL.
bool validWorkCode(String input) {
  final text = input.trim();
  if (text.isEmpty || text.length > 300) return false;
  if (text.startsWith('swapna:')) {
    final parts = text.split(':');
    return parts.length == 3 &&
        parts.every(
          (part) => part.isNotEmpty && !RegExp(r'[\s/?#]').hasMatch(part),
        );
  }
  return RegExp(r'^[a-zA-Z0-9_-]+$').hasMatch(text);
}
