import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class CameraScanner extends StatefulWidget {
  const CameraScanner({super.key});
  @override
  State<CameraScanner> createState() => _CameraScannerState();
}

class _CameraScannerState extends State<CameraScanner>
    with WidgetsBindingObserver {
  final _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
    autoStart: false,
  );
  bool _found = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    if (!mounted || _found) return;
    try {
      await _controller.start();
    } on MobileScannerException {
      // MobileScanner renders its permission/device error with a manual-entry escape.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_controller.value.hasCameraPermission) return;
    if (state == AppLifecycleState.resumed) {
      unawaited(_start());
    } else {
      unawaited(_controller.stop());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_controller.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Scan garment label'),
      actions: [
        IconButton(
          tooltip: 'Toggle torch',
          onPressed: _controller.toggleTorch,
          icon: const Icon(Icons.flashlight_on_outlined),
        ),
      ],
    ),
    body: Column(
      children: [
        Expanded(
          child: MobileScanner(
            controller: _controller,
            errorBuilder: (context, error) => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Camera access is unavailable. Allow camera access in Settings, or enter the printed code below.',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            onDetect: (capture) {
              if (_found) return;
              final values = capture.barcodes
                  .map((code) => code.rawValue)
                  .whereType<String>();
              if (values.isEmpty) return;
              _found = true;
              unawaited(_controller.stop());
              Navigator.pop(context, values.first);
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: OutlinedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Enter printed code instead'),
          ),
        ),
      ],
    ),
  );
}
