import 'package:flutter/material.dart';
import '../../app/theme.dart';
import '../formatters.dart';

class ChoiceTabs extends StatelessWidget {
  const ChoiceTabs({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
  });
  final Map<String, String> options;
  final String value;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: const Color(0xffe9eee7),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: options.entries
          .map(
            (entry) => Expanded(
              child: Semantics(
                selected: value == entry.key,
                child: TextButton(
                  style: TextButton.styleFrom(
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    backgroundColor: value == entry.key
                        ? Colors.white
                        : Colors.transparent,
                    foregroundColor: AppColors.dark,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(9),
                    ),
                  ),
                  onPressed: () => onChanged(entry.key),
                  child: Text(
                    entry.value,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ),
            ),
          )
          .toList(),
    ),
  );
}

class StationFilter extends StatelessWidget {
  const StationFilter({
    super.key,
    required this.value,
    required this.onChanged,
  });
  final String value;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => DropdownButtonFormField<String>(
    initialValue: value,
    key: ValueKey(value),
    isExpanded: true,
    decoration: const InputDecoration(semanticCounterText: 'Work station'),
    items: [
      const DropdownMenuItem(value: 'all', child: Text('All stations')),
      for (var i = 0; i < stations.length; i++)
        DropdownMenuItem(value: '$i', child: Text(stations[i])),
    ],
    onChanged: (next) {
      if (next != null) onChanged(next);
    },
  );
}
