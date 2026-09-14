import 'package:flutter/material.dart';
import '../../app/theme.dart';
import '../../core/data/paged_controller.dart';

class QueryError extends StatelessWidget {
  const QueryError(this.error, {super.key, required this.retry});
  final Object error;
  final VoidCallback retry;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          liveRegion: true,
          child: Text(
            error.toString(),
            style: const TextStyle(color: AppColors.danger),
          ),
        ),
        TextButton.icon(
          onPressed: retry,
          icon: const Icon(Icons.refresh, size: 16),
          label: const Text('Try again'),
        ),
      ],
    ),
  );
}

class EmptyMessage extends StatelessWidget {
  const EmptyMessage(this.title, this.message, {super.key});
  final String title, message;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 36),
    child: Column(
      children: [
        const Icon(Icons.checklist_rounded, color: AppColors.muted, size: 34),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.muted),
        ),
      ],
    ),
  );
}

class PageFooter<T> extends StatelessWidget {
  const PageFooter({
    super.key,
    required this.state,
    required this.loadMore,
    required this.refresh,
  });
  final PageState<T> state;
  final VoidCallback loadMore, refresh;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 16),
    child: Column(
      children: [
        if (state.loading || state.loadingMore) const LinearProgressIndicator(),
        if (state.error != null)
          QueryError(
            state.error!,
            retry: state.appendError ? loadMore : refresh,
          ),
        if (state.hasMore && !state.loadingMore && !state.loading)
          OutlinedButton(onPressed: loadMore, child: const Text('Load more')),
        if (state.page > 0)
          Text(
            '${state.items.length} of ${state.total}',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
      ],
    ),
  );
}
