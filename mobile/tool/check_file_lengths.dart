import 'dart:io';

void main() {
  final tooLong = <String>[];
  var count = 0, maximum = 0;
  for (final folder in ['lib', 'test', 'tool']) {
    for (final file in Directory(
      folder,
    ).listSync(recursive: true).whereType<File>()) {
      if (!file.path.endsWith('.dart')) continue;
      final lines = file.readAsLinesSync().length;
      count++;
      if (lines > maximum) maximum = lines;
      if (lines > 300) tooLong.add('${file.path}: $lines lines');
    }
  }
  if (tooLong.isNotEmpty) {
    stderr.writeln(tooLong.join('\n'));
    exitCode = 1;
  } else {
    stdout.writeln(
      '$count Dart files checked; largest is $maximum lines (limit: 300).',
    );
  }
}
