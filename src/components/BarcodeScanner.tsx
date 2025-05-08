import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, Result } from '@zxing/library'
import { X, Camera, RefreshCw } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>(
    []
  )
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const codeReader = useRef(new BrowserMultiFormatReader())

  useEffect(() => {
    let mounted = true

    const initializeScanner = async () => {
      try {
        setIsLoading(true)
        setError('')

        // Get list of video devices
        const devices = await codeReader.current.listVideoInputDevices()
        if (!mounted) return

        setAvailableDevices(devices)

        // Prefer back camera
        const backCamera = devices.find(
          device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear')
        )

        const deviceToUse = backCamera || devices[0]
        if (deviceToUse) {
          setSelectedDeviceId(deviceToUse.deviceId)
          await startScanning(deviceToUse.deviceId)
        } else {
          setError('No camera devices found')
        }
      } catch (err) {
        if (!mounted) return
        console.error('Scanner initialization error:', err)
        setError('Failed to initialize camera')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeScanner()

    return () => {
      mounted = false
      codeReader.current.reset()
    }
  }, [])

  const startScanning = async (deviceId: string) => {
    try {
      setError('')
      await codeReader.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result: Result | null, error?: Error) => {
          if (result) {
            const barcode = result.getText()
            onScan(barcode)
            codeReader.current.reset()
          }
          if (error && error?.message?.includes('NotFoundError')) {
            setError('No barcode found')
          }
        }
      )
    } catch (err) {
      console.error('Scanning error:', err)
      setError('Failed to start scanning')
    }
  }

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    codeReader.current.reset()
    await startScanning(deviceId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <Camera className="mr-2 h-5 w-5" />
            Scan Barcode
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {availableDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={e => handleDeviceChange(e.target.value)}
              className="mb-4 w-full rounded-md border border-gray-300 focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
            >
              {availableDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId}`}
                </option>
              ))}
            </select>
          )}

          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <RefreshCw className="h-8 w-8 animate-spin text-white" />
              </div>
            )}

            <video ref={videoRef} className="h-full w-full object-cover" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 border-2 border-white/50">
              <div className="absolute left-0 top-0 h-16 w-16 border-l-4 border-t-4 border-tmechs-forest" />
              <div className="absolute right-0 top-0 h-16 w-16 border-r-4 border-t-4 border-tmechs-forest" />
              <div className="absolute bottom-0 left-0 h-16 w-16 border-b-4 border-l-4 border-tmechs-forest" />
              <div className="absolute bottom-0 right-0 h-16 w-16 border-b-4 border-r-4 border-tmechs-forest" />

              {/* Scanning line */}
              <div className="animate-scan absolute left-0 right-0 h-0.5 bg-tmechs-forest/50" />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            Position the barcode within the frame to scan
          </p>
        </div>
      </div>
    </div>
  )
}
