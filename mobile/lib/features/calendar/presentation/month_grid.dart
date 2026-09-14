import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../app/theme.dart';
import '../../../core/data/json.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/panel.dart';

class MonthGrid extends StatelessWidget {
  const MonthGrid({
    super.key,
    required this.selected,
    required this.days,
    required this.onSelect,
    required this.today,
  });
  final DateTime selected;
  final Json days;
  final String today;
  final ValueChanged<DateTime> onSelect;
  @override
  Widget build(BuildContext context) {
    final first = DateTime(selected.year, selected.month);
    final offset = first.weekday % 7;
    final length = DateTime(selected.year, selected.month + 1, 0).day;
    final cells = ((offset + length) / 7).ceil() * 7;
    return Panel(
      padding: 12,
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Previous month',
                onPressed: () =>
                    onSelect(DateTime(selected.year, selected.month - 1)),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: Text(
                  DateFormat('MMMM yyyy').format(selected),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Next month',
                onPressed: () =>
                    onSelect(DateTime(selected.year, selected.month + 1)),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
          TextButton(
            onPressed: () => onSelect(DateTime.parse(today)),
            child: const Text('Today'),
          ),
          Row(
            children: [
              for (final label in [
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
              ])
                Expanded(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.muted,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cells,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisExtent: 52,
              crossAxisSpacing: 2,
              mainAxisSpacing: 3,
            ),
            itemBuilder: (context, index) {
              final day = index - offset + 1;
              if (day < 1 || day > length) return const SizedBox.shrink();
              final date = DateTime(selected.year, selected.month, day),
                  key = dateKey(DateTime(selected.year, selected.month, day));
              final counts = object(object(days[key])['counts']);
              final due = integer(counts['due']),
                  done = integer(counts['completed']);
              final active = day == selected.day;
              return Semantics(
                label:
                    '${DateFormat('d MMMM').format(date)}, $due due, $done completed',
                selected: active,
                child: InkWell(
                  onTap: () => onSelect(date),
                  borderRadius: BorderRadius.circular(9),
                  child: Container(
                    decoration: BoxDecoration(
                      color: active ? AppColors.green : Colors.transparent,
                      borderRadius: BorderRadius.circular(9),
                      border: key == today
                          ? Border.all(color: AppColors.green)
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$day',
                          style: TextStyle(
                            color: active ? Colors.white : AppColors.ink,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          [
                            if (due > 0) '$due D',
                            if (done > 0) '$done C',
                          ].join(' '),
                          style: TextStyle(
                            fontSize: 8,
                            color: active ? Colors.white : AppColors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 10),
          const Text(
            'D · Work due     C · Completed',
            style: TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}
