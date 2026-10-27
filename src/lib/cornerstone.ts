import { init as initCore } from '@cornerstonejs/core'
import { init as initDicomImageLoader } from '@cornerstonejs/dicom-image-loader'

let initialization: Promise<void> | undefined

function initializeCornerstone() {
  if (!initialization) {
    initialization = Promise.resolve()
      .then(() => {
        initCore()
        initDicomImageLoader({
          maxWebWorkers: Math.max(
            1,
            Math.floor((navigator.hardwareConcurrency || 2) / 2)
          ),
          // Local Part 10 files include bit-packed SEG pixel data that the
          // naturalized metadata provider does not expose as frame data.
          // The legacy provider parses Pixel Data directly from the dataset
          // and supports both these SEG fixtures and ordinary image objects.
          useLegacyMetadataProvider: true,
        })
      })
      .catch((error: unknown) => {
        initialization = undefined
        throw error
      })
  }

  return initialization
}

function createDicomImageIds(fileName: string, frames: number) {
  const publicBaseUrl = new URL(
    import.meta.env.BASE_URL,
    window.location.origin
  )
  const fileUrl = new URL(
    `assets/dicom/${encodeURIComponent(fileName)}`,
    publicBaseUrl
  )
  const baseImageId = `wadouri:${fileUrl.href}`

  if (frames === 1) return [baseImageId]

  return Array.from(
    { length: frames },
    (_, index) => `${baseImageId}?frame=${index + 1}`
  )
}

export { createDicomImageIds, initializeCornerstone }
