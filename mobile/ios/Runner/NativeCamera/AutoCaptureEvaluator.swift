import CoreVideo
import Foundation
import QuartzCore

struct AutoCaptureContext {
    let isAdjustingFocus: Bool
    let isAdjustingExposure: Bool
    let pixelBuffer: CVPixelBuffer
}

final class AutoCaptureEvaluator {
    private let cooldownInterval: TimeInterval = 3.0
    private let brightnessWindow = 6
    private let stabilityThreshold = 0.02
    private let minContrast = 0.012
    private let requiredSettleFrames = 4

    private var lastCaptureTime: TimeInterval = 0
    private var brightnessHistory: [Double] = []
    private var settledFrames = 0

    private(set) var lastReason: String?

    func reset() {
        brightnessHistory.removeAll()
        settledFrames = 0
        lastReason = nil
    }

    func markCaptured() {
        lastCaptureTime = CACurrentMediaTime()
        reset()
    }

    func shouldCapture(in context: AutoCaptureContext) -> Bool {
        if CACurrentMediaTime() - lastCaptureTime < cooldownInterval {
            return false
        }

        if context.isAdjustingFocus || context.isAdjustingExposure {
            settledFrames = 0
            return false
        }

        settledFrames += 1
        if settledFrames < requiredSettleFrames { return false }

        guard let metrics = sampleCentreMetrics(context.pixelBuffer) else { return false }
        brightnessHistory.append(metrics.brightness)
        if brightnessHistory.count > brightnessWindow {
            brightnessHistory.removeFirst(brightnessHistory.count - brightnessWindow)
        }

        guard brightnessHistory.count == brightnessWindow else { return false }

        let avg = brightnessHistory.reduce(0, +) / Double(brightnessHistory.count)
        let variance = brightnessHistory
            .map { ($0 - avg) * ($0 - avg) }
            .reduce(0, +) / Double(brightnessHistory.count)

        if variance > stabilityThreshold || metrics.contrast < minContrast {
            lastReason = nil
            return false
        }

        lastReason = "auto:stable_focused_contrast"
        return true
    }

    private struct CentreMetrics {
        let brightness: Double
        let contrast: Double
    }

    private func sampleCentreMetrics(_ pixelBuffer: CVPixelBuffer) -> CentreMetrics? {
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        guard let base = CVPixelBufferGetBaseAddress(pixelBuffer) else { return nil }

        let cropW = width / 3
        let cropH = height / 3
        let startX = (width - cropW) / 2
        let startY = (height - cropH) / 2
        let stepX = max(1, cropW / 16)
        let stepY = max(1, cropH / 16)

        var sum: Double = 0
        var sumSq: Double = 0
        var count = 0
        let buffer = base.assumingMemoryBound(to: UInt8.self)

        var y = startY
        while y < startY + cropH {
            var x = startX
            let rowOffset = y * bytesPerRow
            while x < startX + cropW {
                let offset = rowOffset + x * 4
                let b = Double(buffer[offset])
                let g = Double(buffer[offset + 1])
                let r = Double(buffer[offset + 2])
                let luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
                sum += luma
                sumSq += luma * luma
                count += 1
                x += stepX
            }
            y += stepY
        }

        guard count > 0 else { return nil }
        let mean = sum / Double(count)
        let variance = max(0, (sumSq / Double(count)) - (mean * mean))
        return CentreMetrics(brightness: mean, contrast: variance)
    }
}
