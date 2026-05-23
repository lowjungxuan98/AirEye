enum NativeCameraMode: String {
    case normal
    case screenText

    init(rawString: String) {
        self = NativeCameraMode(rawValue: rawString) ?? .normal
    }
}
