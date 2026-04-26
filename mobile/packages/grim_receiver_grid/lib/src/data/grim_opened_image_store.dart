import 'package:shared_preferences/shared_preferences.dart';

class GrimOpenedImageStore {
  static const String _openedImageKeysPrefsKey = 'grim_receiver_opened_image_keys';

  Future<Set<String>> loadOpenedImageKeys() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_openedImageKeysPrefsKey)?.toSet() ?? <String>{};
  }

  static const int _maxStoredKeys = 200;

  Future<void> markImageOpened(String imageKey) async {
    final prefs = await SharedPreferences.getInstance();
    final imageKeys = prefs.getStringList(_openedImageKeysPrefsKey)?.toSet() ?? <String>{};
    if (imageKeys.contains(imageKey)) return;
    imageKeys.add(imageKey);
    final capped = imageKeys.length > _maxStoredKeys
        ? imageKeys.skip(imageKeys.length - _maxStoredKeys).toSet()
        : imageKeys;
    await prefs.setStringList(_openedImageKeysPrefsKey, capped.toList(growable: false));
  }
}
