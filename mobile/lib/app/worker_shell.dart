import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/events/app_events.dart';
import '../core/providers.dart';
import '../features/auth/domain/worker_session.dart';
import '../features/calendar/presentation/calendar_screen.dart';
import '../features/history/presentation/history_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/scan/presentation/scan_screen.dart';
import '../features/work/presentation/work_screen.dart';
import '../shared/widgets/brand.dart';
import 'worker_navigation.dart';

class WorkerShell extends ConsumerStatefulWidget {
  const WorkerShell(this.session, {super.key});
  final WorkerSession session;
  @override
  ConsumerState<WorkerShell> createState() => _WorkerShellState();
}

class _WorkerShellState extends ConsumerState<WorkerShell>
    with WidgetsBindingObserver {
  int _index = 0;
  String _code = '';
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => _refresh());
  }

  void _refresh() => ref.read(eventsProvider).emit(const RefreshRequested());
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _timer?.cancel();
    if (state == AppLifecycleState.resumed) {
      _refresh();
      _startTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _openWork(String code) => setState(() {
    _code = code;
    _index = 0;
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Brand(),
      actions: [
        IconButton(
          tooltip: 'View ${widget.session.name}’s profile',
          onPressed: () => setState(() => _index = 4),
          icon: const Icon(Icons.person_outline),
        ),
        const SizedBox(width: 8),
      ],
    ),
    body: SafeArea(
      top: false,
      bottom: false,
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 880),
          child: switch (_index) {
            1 => CalendarScreen(onOpenWork: _openWork),
            2 => ScanScreen(onResolved: _openWork),
            3 => const HistoryScreen(),
            4 => ProfileScreen(
              onWork: _openWork,
              onHistory: () => setState(() => _index = 3),
            ),
            _ => WorkScreen(
              name: widget.session.name,
              code: _code,
              onScan: () => setState(() => _index = 2),
            ),
          },
        ),
      ),
    ),
    bottomNavigationBar: WorkerNavigation(
      index: _index,
      onSelect: (index) => setState(() {
        _index = index;
        if (index == 0) _code = '';
      }),
    ),
  );
}
