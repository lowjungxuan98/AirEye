import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:gal/gal.dart';

import '../theme/grim_colors.dart';
import 'grim_text_sheet.dart';

class GrimImageContextMenu extends StatelessWidget {
  const GrimImageContextMenu({
    super.key,
    required this.imageUrl,
    required this.text,
    required this.child,
    this.error,
    this.onDownload,
  });

  final String imageUrl;
  final String text;
  final String? error;
  final Widget child;

  /// When provided, called instead of internal download logic.
  /// The caller is responsible for tracking download progress state.
  final Future<void> Function()? onDownload;

  void _show(BuildContext context, LongPressStartDetails details) {
    final overlay =
        Overlay.of(context).context.findRenderObject()! as RenderBox;
    final position = RelativeRect.fromRect(
      details.globalPosition & const Size(1, 1),
      Offset.zero & overlay.size,
    );
    showMenu<_Action>(
      context: context,
      position: position,
      color: GrimColors.surfaceRaised,
      items: [
        PopupMenuItem(
          value: _Action.copy,
          child: Text('Copy text', style: TextStyle(color: GrimColors.onSurface)),
        ),
        PopupMenuItem(
          value: _Action.download,
          child: Text(
            'Download image',
            style: TextStyle(color: GrimColors.onSurface),
          ),
        ),
        PopupMenuItem(
          value: _Action.showText,
          child: Text('Show text', style: TextStyle(color: GrimColors.onSurface)),
        ),
      ],
    ).then((action) {
      if (action == null || !context.mounted) return;
      switch (action) {
        case _Action.copy:
          _copy(context);
        case _Action.download:
          if (onDownload != null) {
            onDownload!();
          } else {
            _download(context);
          }
        case _Action.showText:
          _showText(context);
      }
    });
  }

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Text copied')));
    }
  }

  Future<void> _download(BuildContext context) async {
    try {
      final response = await Dio().get<List<int>>(
        imageUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      await Gal.putImageBytes(Uint8List.fromList(response.data!));
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Image saved to gallery')));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to save image')));
      }
    }
  }

  void _showText(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => GrimTextSheet(
        text: text.isNotEmpty ? text : 'No text',
        error: error?.isNotEmpty == true ? error : null,
        onClose: () => Navigator.pop(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (details) => _show(context, details),
      child: child,
    );
  }
}

enum _Action { copy, download, showText }
