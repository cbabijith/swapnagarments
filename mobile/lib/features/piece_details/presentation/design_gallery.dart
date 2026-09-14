import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../app/theme.dart';
import '../data/design_images.dart';
import '../domain/piece_snapshot.dart';

class DesignGallery extends StatelessWidget {
  const DesignGallery(this.assets, {super.key, required this.workCode});
  final List<DesignAsset> assets;
  final String workCode;
  @override
  Widget build(BuildContext context) => assets.isEmpty
      ? const Text('No design images saved.')
      : Wrap(
          spacing: 12,
          runSpacing: 16,
          children: [
            for (final asset in assets)
              SizedBox(
                width: 100,
                child: Column(
                  children: [
                    InkWell(
                      onTap: () => showDialog<void>(
                        context: context,
                        builder: (_) => Dialog(
                          child: SizedBox(
                            height: MediaQuery.sizeOf(context).height * .7,
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Text(asset.label),
                                      ),
                                    ),
                                    IconButton(
                                      tooltip: 'Close image',
                                      onPressed: () => Navigator.pop(context),
                                      icon: const Icon(Icons.close),
                                    ),
                                  ],
                                ),
                                Expanded(
                                  child: InteractiveViewer(
                                    minScale: .5,
                                    maxScale: 5,
                                    child: DesignImage(
                                      asset,
                                      workCode: workCode,
                                      full: true,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      borderRadius: BorderRadius.circular(10),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: SizedBox(
                          width: 100,
                          height: 100,
                          child: DesignImage(asset, workCode: workCode),
                        ),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      asset.label,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
}

class DesignImage extends ConsumerWidget {
  const DesignImage(
    this.asset, {
    super.key,
    required this.workCode,
    this.full = false,
  });
  final DesignAsset asset;
  final String workCode;
  final bool full;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = designImageProvider((
      id: asset.id,
      workCode: workCode,
      full: full,
    ));
    return ref
        .watch(provider)
        .when(
          loading: () => const Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
          error: (error, stack) => Center(
            child: IconButton(
              tooltip: 'Image unavailable. Retry',
              onPressed: () => ref.invalidate(provider),
              icon: const Icon(Icons.broken_image_outlined),
            ),
          ),
          data: (bytes) => Semantics(
            label: asset.label,
            image: true,
            child: !asset.id.startsWith('upload-')
                ? SvgPicture.memory(bytes, fit: BoxFit.contain)
                : Image.memory(
                    bytes,
                    fit: BoxFit.contain,
                    cacheWidth: full ? 1400 : 250,
                    errorBuilder: (_, _, _) =>
                        const Icon(Icons.broken_image_outlined),
                  ),
          ),
        );
  }
}
