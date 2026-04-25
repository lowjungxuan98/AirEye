import 'dart:async';
import 'dart:convert';

class GrimSseDecoder {
  const GrimSseDecoder();

  Stream<String> decode(Stream<List<int>> byteStream) async* {
    final dataLines = <String>[];

    await for (final line in byteStream.transform(utf8.decoder).transform(const LineSplitter())) {
      if (line.isEmpty) {
        if (dataLines.isNotEmpty) {
          yield dataLines.join('\n');
          dataLines.clear();
        }
        continue;
      }

      if (line.startsWith('data:')) {
        dataLines.add(line.substring(5).trimLeft());
      }
    }

    if (dataLines.isNotEmpty) {
      yield dataLines.join('\n');
    }
  }
}
