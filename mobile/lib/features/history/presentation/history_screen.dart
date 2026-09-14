import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/filters.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/query_feedback.dart';
import '../application/history_controller.dart';
import '../domain/completed_work.dart';
import '../domain/history_dates.dart';
import 'history_detail_screen.dart';
import 'history_tile.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});
  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '', _station = 'all';
  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final HistoryFilter filter = (query: _query, station: _station);
    final state = ref.watch(historyProvider(filter));
    final controller = ref.read(historyProvider(filter).notifier);
    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (event) {
          if (event.metrics.extentAfter < 300 && state.error == null) {
            controller.loadMore();
          }
          return false;
        },
        child: CustomScrollView(
          key: const PageStorageKey('history'),
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
              sliver: SliverToBoxAdapter(
                child: Column(
                  children: [
                    const PageHeading(
                      eyebrow: 'EVERY STAGE, ACCOUNTED FOR',
                      title: 'My history',
                      description:
                          'The work you’ve completed, all in one place.',
                    ),
                    TextField(
                      controller: _search,
                      maxLength: 100,
                      decoration: const InputDecoration(
                        hintText: 'Search order, garment or piece',
                        prefixIcon: Icon(Icons.search),
                        counterText: '',
                      ),
                      onChanged: (value) {
                        _debounce?.cancel();
                        _debounce = Timer(
                          const Duration(milliseconds: 350),
                          () {
                            if (mounted) setState(() => _query = value.trim());
                          },
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    StationFilter(
                      value: _station,
                      onChanged: (value) => setState(() => _station = value),
                    ),
                    if (state.items.isEmpty &&
                        !state.loading &&
                        state.error == null)
                      const EmptyMessage(
                        'No completed work yet',
                        'Completed stages will appear here.',
                      ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList.builder(
                itemCount: state.items.length,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (index == 0 ||
                          historyDay(state.items[index - 1].completedAt) !=
                              historyDay(state.items[index].completedAt))
                        Padding(
                          padding: const EdgeInsets.only(top: 12, bottom: 12),
                          child: Text(
                            historyDayLabel(state.items[index].completedAt),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                      HistoryTile(
                        state.items[index],
                        key: ValueKey(state.items[index].id),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                HistoryDetailScreen(state.items[index].id),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: PageFooter(
                  state: state,
                  loadMore: controller.loadMore,
                  refresh: controller.refresh,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
