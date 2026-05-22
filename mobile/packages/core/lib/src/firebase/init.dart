import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;

import '../env.dart';

Future<void> initializeFirebase() async {
  if (Firebase.apps.isNotEmpty) return;
  await Firebase.initializeApp(options: _firebaseOptions());
}

FirebaseOptions _firebaseOptions() {
  final projectId = Env.firebaseProjectId;
  final messagingSenderId = Env.firebaseMessagingSenderId;
  final databaseURL = Env.firebaseDatabaseUrl;
  final storageBucket = Env.firebaseStorageBucket;

  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return FirebaseOptions(
      apiKey: Env.firebaseIosApiKey,
      appId: Env.firebaseIosAppId,
      messagingSenderId: messagingSenderId,
      projectId: projectId,
      databaseURL: databaseURL,
      storageBucket: storageBucket,
      iosBundleId: Env.firebaseIosBundleId,
    );
  }
  return FirebaseOptions(
    apiKey: Env.firebaseAndroidApiKey,
    appId: Env.firebaseAndroidAppId,
    messagingSenderId: messagingSenderId,
    projectId: projectId,
    databaseURL: databaseURL,
    storageBucket: storageBucket,
  );
}
