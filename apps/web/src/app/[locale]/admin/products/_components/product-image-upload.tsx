'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { X, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/store/auth.store'
import {
  isAllowedImageType,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  requestPresignedUrl,
  uploadFileToS3,
  type AllowedImageMimeType,
} from '@/lib/api/upload'

type ImageUploadStatus = 'pending' | 'uploading' | 'done' | 'error'

interface ImageUploadItem {
  id: string
  file: File
  previewUrl: string
  publicUrl?: string
  progress: number
  status: ImageUploadStatus
  errorMessage?: string
}

interface ProductImageUploadProps {
  onImagesChange: (publicUrls: string[]) => void
  errorMessage?: string
}

export function ProductImageUpload({ onImagesChange, errorMessage }: ProductImageUploadProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const [uploadItems, setUploadItems] = useState<ImageUploadItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateItem = useCallback(
    (itemId: string, patch: Partial<ImageUploadItem>) => {
      setUploadItems((previousItems) => {
        const updatedItems = previousItems.map((uploadItem) =>
          uploadItem.id === itemId ? { ...uploadItem, ...patch } : uploadItem,
        )
        const completedPublicUrls = updatedItems
          .filter(
            (uploadItem): uploadItem is ImageUploadItem & { publicUrl: string } =>
              uploadItem.status === 'done' && uploadItem.publicUrl !== undefined,
          )
          .map((uploadItem) => uploadItem.publicUrl)
        onImagesChange(completedPublicUrls)
        return updatedItems
      })
    },
    [onImagesChange],
  )

  const uploadFile = useCallback(
    async (item: ImageUploadItem) => {
      if (!accessToken) return

      updateItem(item.id, { status: 'uploading', progress: 0 })

      try {
        const { uploadUrl, publicUrl } = await requestPresignedUrl(
          item.file.name,
          item.file.type as AllowedImageMimeType,
          accessToken,
        )

        await uploadFileToS3(item.file, uploadUrl, (progressPercent) => {
          updateItem(item.id, { progress: progressPercent })
        })

        updateItem(item.id, { status: 'done', publicUrl, progress: 100 })
      } catch {
        updateItem(item.id, {
          status: 'error',
          errorMessage: t('uploadFileError'),
        })
      }
    },
    [accessToken, updateItem, t],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const currentCount = uploadItems.length
      const remainingSlots = MAX_IMAGES_PER_PRODUCT - currentCount

      if (remainingSlots <= 0) return

      const validatedFiles: Array<{ file: File; error?: string }> = files
        .slice(0, remainingSlots)
        .map((file) => {
          if (!isAllowedImageType(file.type)) {
            return { file, error: t('uploadFileTypeError') }
          }
          if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return { file, error: t('uploadFileSizeError') }
          }
          return { file }
        })

      const newItems: ImageUploadItem[] = validatedFiles.map(({ file, error }) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: error ? 'error' : 'pending',
        errorMessage: error,
      }))

      setUploadItems((previousItems) => [...previousItems, ...newItems])

      // Start uploading valid files immediately
      newItems
        .filter((newItem) => newItem.status === 'pending')
        .forEach((newItem) => void uploadFile(newItem))
    },
    [uploadItems.length, t, uploadFile],
  )

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      if (files.length > 0) addFiles(files)
      // Reset input so same file can be re-selected after removal
      event.target.value = ''
    },
    [addFiles],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(false)
      const files = Array.from(event.dataTransfer.files)
      addFiles(files)
    },
    [addFiles],
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleRemoveImage = useCallback(
    (itemId: string) => {
      setUploadItems((previousItems) => {
        const removedItem = previousItems.find((uploadItem) => uploadItem.id === itemId)
        if (removedItem) URL.revokeObjectURL(removedItem.previewUrl)

        const remainingItems = previousItems.filter((uploadItem) => uploadItem.id !== itemId)
        const completedPublicUrls = remainingItems
          .filter(
            (uploadItem): uploadItem is ImageUploadItem & { publicUrl: string } =>
              uploadItem.status === 'done' && uploadItem.publicUrl !== undefined,
          )
          .map((uploadItem) => uploadItem.publicUrl)
        onImagesChange(completedPublicUrls)
        return remainingItems
      })
    },
    [onImagesChange],
  )

  const hasActiveUploads = uploadItems.some(
    (uploadItem) => uploadItem.status === 'uploading' || uploadItem.status === 'pending',
  )
  const canAddMore = uploadItems.length < MAX_IMAGES_PER_PRODUCT

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">{t('uploadLabel')}</legend>

      {/* Dropzone */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label={t('uploadDropzoneAriaLabel')}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
          }}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragOver
              ? 'border-primary bg-accent text-accent-foreground'
              : 'border-border text-muted-foreground hover:border-primary hover:bg-accent/50',
          ].join(' ')}
        >
          <Upload className="size-8" aria-hidden="true" />
          <p className="text-sm font-medium">
            {isDragOver ? t('uploadDropzoneActive') : t('uploadDropzone')}
          </p>
          <p className="text-xs">
            {t('uploadDropzoneHint', { maxSize: '5MB', formats: 'JPG, PNG, WebP' })}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            aria-hidden="true"
            onChange={handleFileInputChange}
          />
        </div>
      )}

      {/* Upload progress indicator */}
      {hasActiveUploads && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t('uploadInProgress')}
        </p>
      )}

      {/* Image grid */}
      {uploadItems.length > 0 && (
        <ul role="list" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {uploadItems.map((uploadItem) => (
            <li key={uploadItem.id} className="relative">
              <figure className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={uploadItem.previewUrl}
                  alt={t('uploadImagePreviewAlt', { name: uploadItem.file.name })}
                  fill
                  className={[
                    'object-cover transition-opacity',
                    uploadItem.status !== 'done' ? 'opacity-60' : 'opacity-100',
                  ].join(' ')}
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                  unoptimized // preview uses objectURL — next/image optimizer can't fetch it
                />

                {/* Upload progress overlay */}
                {(uploadItem.status === 'uploading' || uploadItem.status === 'pending') && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-background/80 p-1"
                    aria-label={t('uploadProgress', { percent: uploadItem.progress })}
                  >
                    <Progress value={uploadItem.progress} className="h-1" />
                  </div>
                )}

                {/* Error overlay */}
                {uploadItem.status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 p-2">
                    <p className="text-center text-xs font-medium text-destructive">
                      {uploadItem.errorMessage}
                    </p>
                  </div>
                )}
              </figure>

              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 size-6 rounded-full"
                aria-label={t('uploadRemoveAriaLabel', { name: uploadItem.file.name })}
                onClick={() => handleRemoveImage(uploadItem.id)}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Validation error from form */}
      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t('uploadCount', { current: uploadItems.length, max: MAX_IMAGES_PER_PRODUCT })}
      </p>
    </fieldset>
  )
}
