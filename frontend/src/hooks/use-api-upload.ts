import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileError, type FileRejection, useDropzone } from 'react-dropzone'
import { uploadFile } from '@/db/api'

interface FileWithPreview extends File {
  preview?: string
  errors: readonly FileError[]
}

type UseApiUploadOptions = {
  /**
   * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
   *
   * Defaults to allowing uploading of all MIME types.
   */
  allowedMimeTypes?: string[]
  /**
   * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
   */
  maxFileSize?: number
  /**
   * Maximum number of files allowed per upload.
   */
  maxFiles?: number
}

type UseApiUploadReturn = ReturnType<typeof useApiUpload>

const useApiUpload = (options: UseApiUploadOptions) => {
  const {
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
  } = options

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([])
  const [successes, setSuccesses] = useState<string[]>([])

  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) {
      return false
    }
    if (errors.length === 0 && successes.length === files.length) {
      return true
    }
    return false
  }, [errors.length, successes.length, files.length])

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x: FileWithPreview) => x.name === file.name))
        .map((file) => {
          const fileWithPreview = file as FileWithPreview;
          fileWithPreview.preview = URL.createObjectURL(file);
          fileWithPreview.errors = [];
          return fileWithPreview;
        })

      const invalidFiles = fileRejections.map(({ file, errors }) => {
        const fileWithPreview = file as FileWithPreview;
        fileWithPreview.preview = URL.createObjectURL(file);
        fileWithPreview.errors = errors;
        return fileWithPreview;
      })

      const newFiles = [...files, ...validFiles, ...invalidFiles]

      setFiles(newFiles)
    },
    [files, setFiles]
  )

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    maxFiles: maxFiles,
    multiple: maxFiles !== 1,
  })

  const onUpload = useCallback(async () => {
    setLoading(true)

    const filesWithErrors = errors.map((x: { name: string }) => x.name)
    const filesToUpload =
      filesWithErrors.length > 0
        ? [
          ...files.filter((f: FileWithPreview) => filesWithErrors.includes(f.name)),
          ...files.filter((f: FileWithPreview) => !successes.includes(f.name)),
        ]
        : files

    const responses = await Promise.all(
      filesToUpload.map(async (file: FileWithPreview) => {
        try {
          const result = await uploadFile(file);
          if (result && result.success) {
            return { name: file.name, message: undefined, url: result.url }
          } else {
            return { name: file.name, message: (result as any)?.error || 'Upload failed' }
          }
        } catch (error: any) {
          return { name: file.name, message: error.message || 'Upload failed' }
        }
      })
    )

    const responseErrors = responses.filter((x: any) => x.message !== undefined) as { name: string; message: string }[]
    setErrors(responseErrors)

    const responseSuccesses = responses.filter((x: any) => x.message === undefined)
    const newSuccesses = Array.from(
      new Set([...successes, ...responseSuccesses.map((x: any) => x.name)])
    )
    setSuccesses(newSuccesses)

    setLoading(false)
    return responses;
  }, [files, errors, successes])

  useEffect(() => {
    if (files.length === 0) {
      setErrors([])
    }

    if (files.length <= maxFiles) {
      let changed = false
      const newFiles = files.map((file: FileWithPreview) => {
        if (file.errors.some((e: FileError) => e.code === 'too-many-files')) {
          const updatedFile = { ...file };
          updatedFile.errors = file.errors.filter((e: FileError) => e.code !== 'too-many-files');
          changed = true;
          return updatedFile;
        }
        return file
      })
      if (changed) {
        setFiles(newFiles)
      }
    }
  }, [files.length, setFiles, maxFiles])

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  }
}

export { useApiUpload, type UseApiUploadOptions, type UseApiUploadReturn }
