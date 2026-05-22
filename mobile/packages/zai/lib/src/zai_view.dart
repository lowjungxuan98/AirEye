import 'dart:async';
import 'dart:convert';

import 'package:core/core.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import 'zai_controller.dart';
import 'zai_state.dart';

final _zaiUri = Uri.parse(ZaiController.initialUrl);
const _zaiCookieStorageKey = 'zai.webview.cookies';
const _zaiDarkModeScript = '''
(() => {
  const styleId = 'grim-zai-dark-mode';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.documentElement.appendChild(style);
  }

  style.textContent = `
    :root {
      color-scheme: dark !important;
    }

    html,
    body {
      background: #121212 !important;
    }
  `;

  try {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('color-theme', 'dark');
    localStorage.setItem('zai-theme', 'dark');
  } catch (_) {}
})();
''';

class ZaiView extends BaseStatefulPage {
  const ZaiView({super.key});

  @override
  BasePageState<ZaiView> createState() => _ZaiViewState();
}

class _ZaiViewState extends BasePageState<ZaiView> {
  late final WebViewCookieManager _cookieManager;
  late final WebViewController _controller;
  late final WebViewWidget _webViewWidget;

  @override
  void initState() {
    super.initState();

    _cookieManager = _createCookieManager();
    _controller = _createController();
    _webViewWidget = _createWebViewWidget(_controller);
    unawaited(_configureAndLoad(_controller));
  }

  WebViewCookieManager _createCookieManager() {
    var params = const PlatformWebViewCookieManagerCreationParams();

    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      params = WebKitWebViewCookieManagerCreationParams.fromPlatformWebViewCookieManagerCreationParams(params);
    } else if (WebViewPlatform.instance is AndroidWebViewPlatform) {
      params = AndroidWebViewCookieManagerCreationParams.fromPlatformWebViewCookieManagerCreationParams(params);
    }

    return WebViewCookieManager.fromPlatformCreationParams(params);
  }

  WebViewController _createController() {
    final isAndroid = WebViewPlatform.instance is AndroidWebViewPlatform;
    var params = const PlatformWebViewControllerCreationParams();

    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      params = WebKitWebViewControllerCreationParams.fromPlatformWebViewControllerCreationParams(
        params,
        allowsInlineMediaPlayback: true,
        javaScriptCanOpenWindowsAutomatically: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
      );
    } else if (WebViewPlatform.instance is AndroidWebViewPlatform) {
      params = AndroidWebViewControllerCreationParams.fromPlatformWebViewControllerCreationParams(params);
    }

    return WebViewController.fromPlatformCreationParams(
        params,
        onPermissionRequest: (request) {
          request.deny();
          _zaiController.setError('ZAI requested device permission: ${request.types.map((type) => type.name).join(', ')}');
        },
      )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(GrimColors.scaffold)
      ..enableZoom(true)
      ..setOnJavaScriptAlertDialog(_showJavaScriptAlert)
      ..setOnJavaScriptConfirmDialog(_showJavaScriptConfirm)
      ..setOnJavaScriptTextInputDialog(_showJavaScriptPrompt)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: _zaiController.updateProgress,
          onPageStarted: (url) {
            _zaiController.clearError();
            _zaiController.startPage(url);
          },
          onPageFinished: (url) {
            _zaiController.finishPage(url);
            unawaited(_applyDefaultDarkMode());
            unawaited(_cacheZaiCookies());
          },
          onUrlChange: (change) {
            final url = change.url;
            if (url != null) {
              _zaiController.updateUrl(url);
            }
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);

            if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http')) {
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
          // iOS/macOS auth challenges currently cross a fragile WKWebView Pigeon path.
          // Let WebKit perform default auth handling there and keep explicit handling on Android.
          onHttpAuthRequest: isAndroid
              ? (request) {
                  request.onCancel();
                  _zaiController.setError('Authentication is required by ${request.host}.');
                }
              : null,
          onHttpError: (error) {
            final response = error.response;
            final statusCode = response?.statusCode;

            if (statusCode != null && statusCode >= 400) {
              _zaiController.setError('HTTP $statusCode while loading ${response?.uri ?? error.request?.uri ?? _zaiState.currentUrl}.');
            }
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true) {
              _zaiController.setError(error.description);
            }
          },
          onSslAuthError: isAndroid
              ? (error) {
                  error.cancel();
                  _zaiController.setError('Blocked a page with an invalid SSL certificate.');
                }
              : null,
        ),
      );
  }

  WebViewWidget _createWebViewWidget(WebViewController controller) {
    var params = PlatformWebViewWidgetCreationParams(controller: controller.platform);

    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      params = WebKitWebViewWidgetCreationParams.fromPlatformWebViewWidgetCreationParams(params);
    } else if (WebViewPlatform.instance is AndroidWebViewPlatform) {
      params = AndroidWebViewWidgetCreationParams.fromPlatformWebViewWidgetCreationParams(params, displayWithHybridComposition: true);
    }

    return WebViewWidget.fromPlatformCreationParams(params: params);
  }

  Future<void> _configureAndLoad(WebViewController controller) async {
    if (controller.platform case final WebKitWebViewController webKitController) {
      await webKitController.setAllowsBackForwardNavigationGestures(true);
      await webKitController.setAllowsLinkPreview(true);
      await webKitController.setInspectable(kDebugMode);
    } else if (controller.platform case final AndroidWebViewController androidController) {
      await AndroidWebViewController.enableDebugging(kDebugMode);
      await androidController.setMediaPlaybackRequiresUserGesture(false);
      await androidController.setMixedContentMode(MixedContentMode.neverAllow);
      await androidController.setGeolocationEnabled(true);
      await androidController.setGeolocationPermissionsPromptCallbacks(onShowPrompt: (_) async => const GeolocationPermissionsResponse(allow: false, retain: false));
      await (_cookieManager.platform as AndroidWebViewCookieManager).setAcceptThirdPartyCookies(androidController, true);

      final paymentRequestSupported = await androidController.isWebViewFeatureSupported(WebViewFeatureType.paymentRequest);
      if (paymentRequestSupported) {
        await androidController.setPaymentRequestEnabled(true);
      }
    }

    if (!mounted) {
      return;
    }

    await _restoreZaiCookies();
    _zaiController.setLoading();
    await controller.loadRequest(_zaiUri);
  }

  Future<void> _applyDefaultDarkMode() async {
    try {
      await _controller.runJavaScript(_zaiDarkModeScript);
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Unable to apply ZAI dark mode: $error');
      }
    }
  }

  Future<void> _restoreZaiCookies() async {
    try {
      final storedCookies = await grimSecureStorage.read(key: _zaiCookieStorageKey);
      if (storedCookies == null || storedCookies.isEmpty) {
        return;
      }

      final cookies = jsonDecode(storedCookies);
      if (cookies is! List) {
        return;
      }

      for (final cookie in cookies) {
        if (cookie is! Map) {
          continue;
        }

        final name = cookie['name'];
        final value = cookie['value'];
        if (name is! String || value is! String || name.isEmpty) {
          continue;
        }

        await _cookieManager.setCookie(
          WebViewCookie(name: name, value: value, domain: cookie['domain'] is String ? cookie['domain'] as String : _zaiUri.host, path: cookie['path'] is String ? cookie['path'] as String : '/'),
        );
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Unable to restore ZAI cookies: $error');
      }
    }
  }

  Future<void> _cacheZaiCookies() async {
    try {
      final cookies = await _cookieManager.platform.getCookies(_zaiUri);
      final storedCookies = cookies.where((cookie) => cookie.name.isNotEmpty).map((cookie) => {'name': cookie.name, 'value': cookie.value, 'domain': cookie.domain, 'path': cookie.path}).toList();

      if (storedCookies.isEmpty) {
        await grimSecureStorage.delete(key: _zaiCookieStorageKey);
        return;
      }

      await grimSecureStorage.write(key: _zaiCookieStorageKey, value: jsonEncode(storedCookies));
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Unable to cache ZAI cookies: $error');
      }
    }
  }

  Future<void> _handleBackPressed() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return;
    }

    if (mounted) {
      await Navigator.of(context).maybePop();
    }
  }

  Future<void> _showJavaScriptAlert(JavaScriptAlertDialogRequest request) async {
    if (!mounted) {
      return;
    }

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ZAI'),
        content: Text(request.message),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK'))],
      ),
    );
  }

  Future<bool> _showJavaScriptConfirm(JavaScriptConfirmDialogRequest request) async {
    if (!mounted) {
      return false;
    }

    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('ZAI'),
            content: Text(request.message),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
              FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('OK')),
            ],
          ),
        ) ??
        false;
  }

  Future<String> _showJavaScriptPrompt(JavaScriptTextInputDialogRequest request) async {
    if (!mounted) {
      return request.defaultText ?? '';
    }

    final textController = TextEditingController(text: request.defaultText);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ZAI'),
        content: TextField(
          controller: textController,
          decoration: InputDecoration(labelText: request.message),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(textController.text), child: const Text('OK')),
        ],
      ),
    );
    textController.dispose();

    return result ?? '';
  }

  ZaiController get _zaiController => ref.read(zaiControllerProvider.notifier);

  ZaiState get _zaiState => ref.read(zaiControllerProvider);

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(zaiControllerProvider);
    final progress = state.progress;
    final errorMessage = state.errorMessage;

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      appBar: AppBar(
        leading: GrimBackButton(onPressed: _handleBackPressed),
        title: const Text('ZAI'),
        actions: [IconButton(onPressed: _controller.reload, icon: const Icon(Icons.refresh), tooltip: 'Reload')],
      ),
      body: Stack(
        children: [
          Positioned.fill(child: _webViewWidget),
          if (progress < 100) LinearProgressIndicator(value: progress == 0 ? null : progress / 100),
          if (errorMessage case final message?)
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: SafeArea(
                child: DecoratedBox(
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.errorContainer, borderRadius: BorderRadius.circular(8)),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
