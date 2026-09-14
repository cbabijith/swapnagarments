import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/data/json.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/filters.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/query_feedback.dart';
import '../application/work_controller.dart';
import '../domain/work_piece.dart';
import 'work_card.dart';
import 'work_summary.dart';

class WorkScreen extends ConsumerStatefulWidget {
  const WorkScreen({
    super.key,
    required this.name,
    required this.onScan,
    this.code = '',
  });
  final String name, code;
  final VoidCallback onScan;
  @override
  ConsumerState<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends ConsumerState<WorkScreen> {
  late String _code = widget.code;
  String _status = 'all', _station = 'all';
  WorkFilter get _filter => (status: _status, station: _station, code: _code);
  @override
  void didUpdateWidget(covariant WorkScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.code != oldWidget.code) {
      _code = widget.code;
      _status = 'all';
      _station = 'all';
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = workProvider(_filter);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
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
          key: const PageStorageKey('work'),
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  children: [
                    PageHeading(
                      eyebrow: 'HELLO, ${widget.name.split(' ').first}',
                      title: 'My work',
                      description: 'Urgent pieces first, then earliest due.',
                      action: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                        onPressed: widget.onScan,
                        icon: const Icon(Icons.qr_code_scanner, size: 17),
                        label: const Text('Scan a piece'),
                      ),
                    ),
                    WorkSummary(object(state.metadata['summary'])),
                    const SizedBox(height: 14),
                    ChoiceTabs(
                      options: const {
                        'all': 'All work',
                        'pending': 'To do',
                        'in_progress': 'Active',
                        'blocked': 'Blocked',
                      },
                      value: _status,
                      onChanged: (value) => setState(() => _status = value),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: StationFilter(
                            value: _station,
                            onChanged: (value) =>
                                setState(() => _station = value),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton.icon(
                          onPressed: state.loading ? null : controller.refresh,
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Refresh'),
                        ),
                      ],
                    ),
                    if (_code.isNotEmpty ||
                        _status != 'all' ||
                        _station != 'all')
                      TextButton.icon(
                        onPressed: () => setState(() {
                          _code = '';
                          _status = 'all';
                          _station = 'all';
                        }),
                        icon: const Icon(Icons.close, size: 16),
                        label: Text(
                          _code.isNotEmpty
                              ? 'Scanned label · Show full queue'
                              : 'Clear filters',
                        ),
                      ),
                    if (state.items.isEmpty &&
                        !state.loading &&
                        state.error == null)
                      EmptyMessage(
                        _filter == allWork
                            ? 'Your queue is clear'
                            : 'No matching work',
                        'Pull to refresh or choose another station or status.',
                      ),
                    const SizedBox(height: 14),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList.builder(
                itemCount: state.items.length,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: WorkCard(
                    state.items[index],
                    key: ValueKey(state.items[index].id),
                    refreshing: state.loading,
                    today: string(state.metadata['today'], dateKey(shopNow())),
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
