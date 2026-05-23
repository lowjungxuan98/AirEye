import 'dart:async';

import 'package:flutter/services.dart';

import 'native_camera_capture_result.dart';

/// Controls a single native camera platform view.
///
/// Lifecycle: the controller is created by the host (e.g. the page) and
/// passed to [NativeCameraWidget]. The widget attaches the controller to
/// its platform view on creation and detaches it on disposal.
///
/// All commands sent before the view is created are buffered and flushed
/// once the view id is known.
class NativeCameraController {
  NativeCameraController({
    NativeCameraMode initialMode = NativeCameraMode.normal,
    bool autoCaptureEnabled = true,
  })  : _mode = initialMode,
        _autoCaptureEnabled = autoCaptureEnabled;

  static const String _methodChannelPrefix = 'aireye/native_camera/method/';
  static const String _eventChannelPrefix = 'aireye/native_camera/events/';

  MethodChannel? _methodChannel;
  StreamSubscription<dynamic>? _eventSub;
  int? _viewId;
  bool _disposed = false;
  bool _started = false;

  NativeCameraMode _mode;
  bool _autoCaptureEnabled;
  bool _isCapturing = false;

  final List<Future<void> Function()> _pendingCommands = <Future<void> Function()>[];

  /// Fires when the native side reports a successful capture.
  void Function(NativeCameraCaptureResult result)? onCaptured;

  /// Fires when the native side surfaces an error.
  void Function(String message)? onError;

  /// Fires when the native preview reports it is ready.
  VoidCallback? onPreviewReady;

  /// Fires every time the auto-capture evaluator's state changes.
  void Function(bool isCapturing)? onCapturingChanged;

  NativeCameraMode get mode => _mode;
  bool get autoCaptureEnabled => _autoCaptureEnabled;
  bool get isAttached => _viewId != null && !_disposed;
  bool get isCapturing => _isCapturing;

  void attach(int viewId) {
    if (_disposed) return;
    if (_viewId == viewId) return;

    unawaited(_eventSub?.cancel());
    _started = false;
    _pendingCommands.clear();
    _setCapturing(false);
    _viewId = viewId;
    _methodChannel = MethodChannel('$_methodChannelPrefix$viewId');
    _eventSub = EventChannel('$_eventChannelPrefix$viewId').receiveBroadcastStream().listen(_handleEvent, onError: (Object e) {
      onError?.call(e.toString());
    });

    unawaited(_send('setMode', <String, dynamic>{'mode': _mode.channelName}));
    unawaited(_send('setAutoCaptureEnabled', <String, dynamic>{'enabled': _autoCaptureEnabled}));

    final pending = List<Future<void> Function()>.from(_pendingCommands);
    _pendingCommands.clear();
    for (final cmd in pending) {
      unawaited(cmd());
    }
  }

  Future<void> detach() async {
    final eventSub = _eventSub;
    _eventSub = null;
    _methodChannel = null;
    _viewId = null;
    _started = false;
    _pendingCommands.clear();
    _setCapturing(false);
    await eventSub?.cancel();
  }

  Future<void> start() {
    if (_started) return Future<void>.value();
    _started = true;
    return _send('start');
  }

  Future<void> stop() {
    if (!_started) return Future<void>.value();
    _started = false;
    return _send('stop');
  }

  Future<void> setMode(NativeCameraMode mode) {
    _mode = mode;
    return _send('setMode', <String, dynamic>{'mode': mode.channelName});
  }

  Future<void> setAutoCaptureEnabled(bool enabled) {
    _autoCaptureEnabled = enabled;
    return _send('setAutoCaptureEnabled', <String, dynamic>{'enabled': enabled});
  }

  Future<void> requestManualCapture({String reason = 'manual'}) {
    return _send('capture', <String, dynamic>{'reason': reason});
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    try {
      await _send('dispose');
    } catch (_) {}
    await detach();
  }

  Future<void> _send(String method, [Map<String, dynamic>? arguments]) async {
    if (_disposed && method != 'dispose') return;
    final channel = _methodChannel;
    if (channel == null) {
      if (!_disposed) {
        _pendingCommands.add(() => _send(method, arguments));
      }
      return;
    }
    try {
      await channel.invokeMethod<void>(method, arguments);
    } on PlatformException catch (e) {
      onError?.call(e.message ?? e.code);
    }
  }

  void _handleEvent(dynamic raw) {
    if (raw is! Map) return;
    final type = raw['type'];
    switch (type) {
      case 'ready':
        onPreviewReady?.call();
        break;
      case 'capturing':
        _setCapturing(true);
        break;
      case 'captured':
        _setCapturing(false);
        try {
          onCaptured?.call(NativeCameraCaptureResult.fromMap(raw));
        } catch (e) {
          onError?.call('Malformed capture payload: $e');
        }
        break;
      case 'error':
        _setCapturing(false);
        final message = raw['message']?.toString() ?? 'Unknown native camera error';
        onError?.call(message);
        break;
    }
  }

  void _setCapturing(bool value) {
    if (_isCapturing == value) return;
    _isCapturing = value;
    onCapturingChanged?.call(value);
  }
}
