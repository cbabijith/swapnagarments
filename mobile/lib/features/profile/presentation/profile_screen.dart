import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme.dart';
import '../../../core/events/app_events.dart';
import '../../../core/providers.dart';
import '../../../shared/formatters.dart';
import '../../../shared/widgets/panel.dart';
import '../../../shared/widgets/query_feedback.dart';
import '../../auth/application/session_controller.dart';
import '../../history/presentation/history_detail_screen.dart';
import '../application/profile_providers.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({
    super.key,
    required this.onWork,
    required this.onHistory,
  });
  final ValueChanged<String> onWork;
  final VoidCallback onHistory;
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _signingOut = false;
  Object? _error;
  Future<void> _signOut() async {
    setState(() {
      _signingOut = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).signOut();
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider),
        work = ref.watch(profileWorkProvider),
        history = ref.watch(profileHistoryProvider);
    return RefreshIndicator(
      onRefresh: () async {
        ref.read(eventsProvider).emit(const RefreshRequested());
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const PageHeading(
            eyebrow: 'YOUR SPACE',
            title: 'My profile',
            description: 'Your details, skills and work overview.',
          ),
          profile.when(
            loading: () => const LinearProgressIndicator(),
            error: (error, stack) =>
                QueryError(error, retry: () => ref.invalidate(profileProvider)),
            data: (person) => person == null
                ? const EmptyMessage(
                    'Profile unavailable',
                    'Ask your shop owner to check your worker account.',
                  )
                : Column(
                    children: [
                      Panel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 25,
                                  backgroundColor: AppColors.pale,
                                  child: Text(
                                    person.name.isEmpty
                                        ? '?'
                                        : person.name.characters.first
                                              .toUpperCase(),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        person.name,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.headlineSmall,
                                      ),
                                      Text(person.role),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              person.available
                                  ? '● Available for work'
                                  : '● Not available',
                              style: const TextStyle(color: AppColors.green),
                            ),
                            const Divider(),
                            Text(person.email),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _Metric(
                              'Assigned now',
                              work.value?.total,
                              () => widget.onWork(''),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _Metric(
                              'Completed stages',
                              history.value?.total,
                              widget.onHistory,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Panel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Profile details',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const Divider(),
                            const Text('Work skills'),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                for (final skill in person.skills)
                                  Chip(label: Text(stationName(skill))),
                              ],
                            ),
                            const Divider(),
                            const Text('Queue capacity'),
                            Text(
                              '${person.capacity ~/ 60} hours ${person.capacity % 60} min',
                              style: const TextStyle(fontSize: 20),
                            ),
                            const Text(
                              'Estimated work that can be assigned at once.',
                            ),
                            const Divider(),
                            const Text(
                              'Your shop owner manages your details, password and availability. Ask them for any changes.',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
          Panel(
            padding: 8,
            child: ExpansionTile(
              title: const Text('My current work'),
              subtitle: const Text('Assignments and progress'),
              children: [
                work.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, stack) => QueryError(
                    error,
                    retry: () => ref.invalidate(profileWorkProvider),
                  ),
                  data: (result) => Column(
                    children: [
                      if (result.items.isEmpty)
                        const Text('Your queue is clear.'),
                      for (final item in result.items)
                        ListTile(
                          title: Text(item.garment),
                          subtitle: Text('${item.number} · ${item.stepName}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => widget.onWork(item.code),
                        ),
                      TextButton(
                        onPressed: () => widget.onWork(''),
                        child: const Text('View all work →'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Panel(
            padding: 8,
            child: ExpansionTile(
              title: const Text('Recently completed'),
              subtitle: const Text('Your latest finished stages'),
              children: [
                history.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, stack) => QueryError(
                    error,
                    retry: () => ref.invalidate(profileHistoryProvider),
                  ),
                  data: (result) => Column(
                    children: [
                      if (result.items.isEmpty)
                        const Text('No completed stages yet.'),
                      for (final item in result.items)
                        ListTile(
                          title: Text(item.garment),
                          subtitle: Text('${item.number} · ${item.stepName}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => HistoryDetailScreen(item.id),
                            ),
                          ),
                        ),
                      TextButton(
                        onPressed: widget.onHistory,
                        child: const Text('View history →'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          OutlinedButton.icon(
            onPressed: _signingOut ? null : _signOut,
            icon: const Icon(Icons.logout, size: 18),
            label: Text(_signingOut ? 'Signing out…' : 'Sign out'),
          ),
          if (_error != null)
            Text('$_error', style: const TextStyle(color: AppColors.danger)),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value, this.onTap);
  final String label;
  final int? value;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Panel(
      padding: 14,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11)),
          Text(
            '${value ?? '—'}',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const Text('View →', style: TextStyle(color: AppColors.green)),
        ],
      ),
    ),
  );
}
