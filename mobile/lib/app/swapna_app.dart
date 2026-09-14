import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/application/session_controller.dart';
import '../features/auth/presentation/sign_in_screen.dart';
import 'theme.dart';
import 'worker_shell.dart';

class SwapnaApp extends ConsumerStatefulWidget {
  const SwapnaApp({super.key});
  @override
  ConsumerState<SwapnaApp> createState() => _SwapnaAppState();
}

class _SwapnaAppState extends ConsumerState<SwapnaApp> {
  final _navigator = GlobalKey<NavigatorState>();
  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    ref.listen(sessionProvider, (previous, next) {
      if (previous?.value != null && next.value == null) {
        _navigator.currentState?.popUntil((route) => route.isFirst);
        PaintingBinding.instance.imageCache.clear();
        PaintingBinding.instance.imageCache.clearLiveImages();
      }
    });
    return MaterialApp(
      navigatorKey: _navigator,
      title: 'Swapna Garments',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      home: session.when(
        loading: () =>
            const Scaffold(body: Center(child: CircularProgressIndicator())),
        error: (error, stack) => SignInScreen(connectionError: error),
        data: (worker) => worker == null
            ? const SignInScreen()
            : WorkerShell(worker, key: ValueKey(worker.staffId)),
      ),
    );
  }
}
