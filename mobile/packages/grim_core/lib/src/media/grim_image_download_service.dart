import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:gal/gal.dart';

class GrimImageDownloadService {
  GrimImageDownloadService({Dio? dio}) : _dio = dio ?? Dio();

  final Dio _dio;

  Future<void> saveNetworkImageToDevice(String imageUrl) async {
    final hasAccess = await Gal.hasAccess();
    final isGranted = hasAccess || await Gal.requestAccess();
    if (!isGranted) {
      throw StateError('Photo library access was denied.');
    }

    final response = await _dio.get<List<int>>(imageUrl, options: Options(responseType: ResponseType.bytes));
    final bytes = response.data;
    if (bytes == null || bytes.isEmpty) {
      throw StateError('Downloaded image was empty.');
    }

    await Gal.putImageBytes(Uint8List.fromList(bytes), album: 'GRIM', name: _downloadNameFromUrl(imageUrl));
  }
}

String _downloadNameFromUrl(String imageUrl) {
  final uri = Uri.tryParse(imageUrl);
  final lastSegment = uri?.pathSegments.isNotEmpty == true ? uri!.pathSegments.last : 'grim_image';
  final withoutExtension = lastSegment.replaceFirst(RegExp(r'\.[^.]+$'), '');
  final safeName = withoutExtension.replaceAll(RegExp(r'[^A-Za-z0-9_-]+'), '_');
  return safeName.isEmpty ? 'grim_image' : safeName;
}
