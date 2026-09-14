import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme.dart';
import '../../../shared/widgets/panel.dart';
import '../application/scan_controller.dart';
import 'camera_scanner.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key, required this.onResolved});
  final ValueChanged<String> onResolved;
  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _code = TextEditingController();
  Object? _error;
  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _resolve(String text) async {
    setState(() => _error = null);
    try {
      final code = await ref.read(scanProvider.notifier).resolve(text);
      if (mounted && code != null) widget.onResolved(code);
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  Future<void> _camera() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const CameraScanner()),
    );
    if (mounted && code != null) {
      _code.text = code;
      await _resolve(code);
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = ref.watch(scanProvider);
    final supported =
        kIsWeb ||
        [
          TargetPlatform.android,
          TargetPlatform.iOS,
          TargetPlatform.macOS,
        ].contains(defaultTargetPlatform);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
      children: [
        const PageHeading(
          eyebrow: 'QR SCAN OR PRINTED CODE',
          title: 'Scan a piece',
          description:
              'Open a piece’s current task, check the details, then choose what to do.',
        ),
        Panel(
          child: Column(
            children: [
              Container(
                width: 140,
                height: 130,
                decoration: BoxDecoration(
                  color: AppColors.pale,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.qr_code_scanner,
                  size: 64,
                  color: AppColors.green,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Scan a garment label',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 10),
              const Text(
                'Point the camera at a garment label. Scanning opens its details; you confirm any work update.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              if (supported)
                FilledButton.icon(
                  onPressed: busy ? null : _camera,
                  icon: const Icon(Icons.camera_alt_outlined, size: 18),
                  label: const Text('Open camera'),
                )
              else
                const Text('Enter the printed code on this device.'),
              const Divider(height: 40),
              TextField(
                controller: _code,
                maxLength: 300,
                enabled: !busy,
                autocorrect: false,
                textInputAction: TextInputAction.search,
                onSubmitted: _resolve,
                decoration: const InputDecoration(
                  labelText: 'Printed order number',
                  hintText: 'e.g. SG-1041',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: busy ? null : () => _resolve(_code.text),
                  icon: const Icon(Icons.arrow_forward, size: 16),
                  label: Text(busy ? 'Finding piece…' : 'Find piece'),
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      '$_error',
                      style: const TextStyle(color: AppColors.danger),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
