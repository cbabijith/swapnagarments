import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/data/json.dart';
import '../../../core/events/app_events.dart';
import '../../../core/providers.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/filters.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/query_feedback.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../history/presentation/history_detail_screen.dart';
import '../application/calendar_controller.dart';
import 'month_grid.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key, required this.onOpenWork});
  final ValueChanged<String> onOpenWork;
  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _selected = shopNow();
  String _kind = 'all';
  @override
  Widget build(BuildContext context) {
    final monthProvider = calendarMonthProvider(
      DateFormat('yyyy-MM').format(_selected),
    );
    final month = ref.watch(monthProvider);
    final dayProvider = calendarDayProvider((
      date: dateKey(_selected),
      kind: _kind,
    ));
    final day = ref.watch(dayProvider),
        controller = ref.read(dayProvider.notifier);
    final summary = object(day.metadata['summary']),
        counts = object(object(day.metadata['summary'])['counts']);
    return NotificationListener<ScrollNotification>(
      onNotification: (event) {
        if (event.metrics.extentAfter < 300 && day.error == null) {
          controller.loadMore();
        }
        return false;
      },
      child: CustomScrollView(
        key: const PageStorageKey('calendar'),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PageHeading(
                    eyebrow: 'YOUR WORK, DAY BY DAY',
                    title: 'My calendar',
                    description:
                        'Choose a date to see your work due and completed stages.',
                    action: IconButton(
                      tooltip: 'Refresh calendar',
                      onPressed: () => ref
                          .read(eventsProvider)
                          .emit(const RefreshRequested()),
                      icon: const Icon(Icons.refresh),
                    ),
                  ),
                  if (month.isLoading) const LinearProgressIndicator(),
                  if (month.hasError)
                    QueryError(
                      month.error!,
                      retry: () => ref.invalidate(monthProvider),
                    ),
                  MonthGrid(
                    selected: _selected,
                    days: object(month.value?['days']),
                    today: string(month.value?['today'], dateKey(shopNow())),
                    onSelect: (date) => setState(() => _selected = date),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    DateFormat('EEEE, d MMMM').format(_selected),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Due work uses the delivery date. Completed stages use India Standard Time.',
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 14,
                    runSpacing: 10,
                    children: [
                      for (final field in {
                        'Work due': counts['due'],
                        'Completed': counts['completed'],
                        'In progress': summary['inProgress'],
                        'Overdue': summary['overdue'],
                      }.entries)
                        Text('${field.key}: ${field.value ?? '—'}'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ChoiceTabs(
                    options: const {
                      'all': 'All work',
                      'due': 'Work due',
                      'completed': 'Completed',
                    },
                    value: _kind,
                    onChanged: (value) => setState(() => _kind = value),
                  ),
                  if (day.items.isEmpty && !day.loading && day.error == null)
                    const EmptyMessage(
                      'No work on this date',
                      'Choose another date to see due work and completed stages.',
                    ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList.builder(
              itemCount: day.items.length,
              itemBuilder: (context, index) {
                final entry = day.items[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () => entry.kind == 'completed'
                        ? Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  HistoryDetailScreen(entry.historyId),
                            ),
                          )
                        : widget.onOpenWork(entry.code),
                    child: Panel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(entry.number)),
                              StatusBadge(entry.status),
                            ],
                          ),
                          Text(
                            entry.garment,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(entry.stepName),
                          const SizedBox(height: 8),
                          Text(
                            entry.kind == 'completed'
                                ? 'View completed stage →'
                                : 'Open current work →',
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: PageFooter(
                state: day,
                loadMore: controller.loadMore,
                refresh: controller.refresh,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
