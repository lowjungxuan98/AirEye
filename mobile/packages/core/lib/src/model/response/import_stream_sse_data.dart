import '../json_map.dart';
import 'import_stream_result.dart';
import 'import_stream_status.dart';
import 'import_stream_terminal_error.dart';

sealed class ImportStreamSseData {
  const ImportStreamSseData();

  factory ImportStreamSseData.fromJson(JsonMap json) {
    if (json.containsKey('status')) {
      return ImportStreamSseStatus(ImportStreamStatus.fromJson(json));
    }
    if (json.containsKey('error')) {
      return ImportStreamSseError(ImportStreamTerminalError.fromJson(json));
    }
    if (json.containsKey('id')) {
      return ImportStreamSseResult(ImportStreamResult.fromJson(json));
    }
    throw StateError('Unknown ImportStreamSseData payload: $json');
  }
}

class ImportStreamSseStatus extends ImportStreamSseData {
  const ImportStreamSseStatus(this.value);
  final ImportStreamStatus value;
}

class ImportStreamSseResult extends ImportStreamSseData {
  const ImportStreamSseResult(this.value);
  final ImportStreamResult value;
}

class ImportStreamSseError extends ImportStreamSseData {
  const ImportStreamSseError(this.value);
  final ImportStreamTerminalError value;
}
