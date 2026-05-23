import Flutter
import Foundation

final class NativeCameraEventSink: NSObject, FlutterStreamHandler {
    private var sink: FlutterEventSink?
    private var pending: [[String: Any]] = []
    private let lock = NSLock()

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        lock.lock()
        sink = events
        let drain = pending
        pending.removeAll()
        lock.unlock()

        for event in drain { events(event) }
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        lock.lock()
        sink = nil
        lock.unlock()
        return nil
    }

    func send(_ payload: [String: Any]) {
        lock.lock()
        let activeSink = sink
        if activeSink == nil { pending.append(payload) }
        lock.unlock()

        DispatchQueue.main.async {
            activeSink?(payload)
        }
    }
}
