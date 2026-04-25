import 'package:flutter/services.dart';
import 'package:grim_core/grim_core.dart';

import 'grim_image_full_screen_state.dart';

final grimImageFullScreenControllerProvider =
    NotifierProvider.autoDispose<GrimImageFullScreenController, GrimImageFullScreenState>(
      GrimImageFullScreenController.new,
    );

class GrimImageFullScreenController extends Notifier<GrimImageFullScreenState> {
  @override
  GrimImageFullScreenState build() {
    return const GrimImageFullScreenState();
  }

  Future<GrimImageActionResult> copyFinalText(String finalText) async {
    final text = finalText.trim();
    if (text.isEmpty) {
      return const GrimImageActionResult.failure('No final text to copy.');
    }

    await Clipboard.setData(ClipboardData(text: text));
    return const GrimImageActionResult.success();
  }

  Future<GrimImageActionResult> downloadImage(String imageUrl) async {
    if (state.isDownloading) {
      return const GrimImageActionResult.success();
    }

    state = state.copyWith(isDownloading: true);
    try {
      await GrimImageDownloadService().saveNetworkImageToDevice(imageUrl);
      return const GrimImageActionResult.success();
    } catch (error) {
      return GrimImageActionResult.failure(error.toString());
    } finally {
      if (ref.mounted) {
        state = state.copyWith(isDownloading: false);
      }
    }
  }
}
