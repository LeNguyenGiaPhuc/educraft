import { AppError } from '../../common/errors.js'
import { REFERENCE_MATERIALS_BUCKET } from '../storage/storageService.js'

const REFERENCE_COLUMNS = [
  'id',
  'assignment_id',
  'storage_path',
  'original_filename',
  'mime_type',
  'size_bytes',
  'uploaded_by',
  'created_at',
].join(',')

function requireTeacherContext(auth) {
  if (
    auth?.profile?.role !== 'TEACHER'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
  }

  return {
    supabase: auth.supabase,
    teacherId: auth.profile.id,
  }
}

function throwDatabaseError(result) {
  if (result.error) throw result.error
}

function referenceMetadata(assignmentId, teacherId, uploaded) {
  return {
    assignment_id: assignmentId,
    storage_path: uploaded.path,
    original_filename: uploaded.originalFilename,
    mime_type: uploaded.mimeType,
    size_bytes: uploaded.sizeBytes,
    uploaded_by: teacherId,
  }
}

export function createReferenceService({ assignmentService, storageService, logger = console }) {
  async function getReferenceForAssignment(supabase, assignmentId, referenceId) {
    const result = await supabase
      .from('reference_files')
      .select(REFERENCE_COLUMNS)
      .eq('id', referenceId)
      .eq('assignment_id', assignmentId)
      .maybeSingle()

    throwDatabaseError(result)

    if (!result.data) {
      throw new AppError(404, 'REFERENCE_NOT_FOUND', 'Không tìm thấy file tham chiếu.')
    }

    return result.data
  }

  function logCleanupFailure(event, uploaded, error) {
    logger.error({
      event,
      bucket: uploaded.bucket,
      path: uploaded.path,
      errorCode: error?.code ?? 'UNKNOWN_STORAGE_ERROR',
    })
  }

  async function rollbackNewObject(uploaded, databaseError) {
    try {
      await storageService.rollbackUploadedFile(uploaded)
    } catch (cleanupError) {
      logCleanupFailure('reference_new_object_rollback_failed', uploaded, cleanupError)
      throw new AppError(
        500,
        'REFERENCE_ROLLBACK_FAILED',
        'Không thể hoàn tác file tham chiếu sau khi lưu dữ liệu thất bại.',
      )
    }

    throw databaseError
  }

  async function removeOldObject(supabase, uploaded) {
    try {
      await storageService.removeReferenceFile({
        client: supabase,
        path: uploaded.path,
      })
    } catch (cleanupError) {
      logCleanupFailure('reference_old_object_cleanup_failed', uploaded, cleanupError)
      throw new AppError(
        500,
        'REFERENCE_OLD_FILE_CLEANUP_FAILED',
        'File tham chiếu mới đã được lưu nhưng file cũ chưa được dọn khỏi lưu trữ.',
      )
    }
  }

  return {
    async listReferences(auth, assignmentId) {
      const { supabase } = requireTeacherContext(auth)
      await assignmentService.getAssignment(auth, assignmentId)

      const result = await supabase
        .from('reference_files')
        .select(REFERENCE_COLUMNS)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true })

      throwDatabaseError(result)
      return result.data ?? []
    },

    async uploadReference(auth, assignmentId, file) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      await assignmentService.getAssignment(auth, assignmentId)

      const uploaded = await storageService.uploadReferenceFile({
        client: supabase,
        assignmentId,
        file,
      })
      const result = await supabase
        .from('reference_files')
        .insert(referenceMetadata(assignmentId, teacherId, uploaded))
        .select(REFERENCE_COLUMNS)
        .single()

      if (result.error) {
        return rollbackNewObject(uploaded, result.error)
      }

      return result.data
    },

    async replaceReference(auth, assignmentId, referenceId, file) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      const previous = await getReferenceForAssignment(supabase, assignmentId, referenceId)
      await assignmentService.getAssignment(auth, assignmentId)

      const uploaded = await storageService.uploadReferenceFile({
        client: supabase,
        assignmentId,
        file,
      })
      const metadata = referenceMetadata(assignmentId, teacherId, uploaded)
      delete metadata.assignment_id

      const result = await supabase
        .from('reference_files')
        .update(metadata)
        .eq('id', referenceId)
        .eq('assignment_id', assignmentId)
        .select(REFERENCE_COLUMNS)
        .single()

      if (result.error) {
        return rollbackNewObject(uploaded, result.error)
      }

      await removeOldObject(supabase, {
        bucket: uploaded.bucket,
        path: previous.storage_path,
      })
      return result.data
    },

    async deleteReference(auth, assignmentId, referenceId) {
      const { supabase } = requireTeacherContext(auth)
      const reference = await getReferenceForAssignment(supabase, assignmentId, referenceId)
      await assignmentService.getAssignment(auth, assignmentId)

      const result = await supabase
        .from('reference_files')
        .delete()
        .eq('id', referenceId)
        .eq('assignment_id', assignmentId)
        .select(REFERENCE_COLUMNS)
        .single()

      throwDatabaseError(result)

      try {
        await storageService.removeReferenceFile({
          client: supabase,
          path: reference.storage_path,
        })
      } catch (cleanupError) {
        logCleanupFailure('reference_deleted_object_cleanup_failed', {
          bucket: REFERENCE_MATERIALS_BUCKET,
          path: reference.storage_path,
        }, cleanupError)
        throw new AppError(
          500,
          'REFERENCE_FILE_CLEANUP_FAILED',
          'Dữ liệu tham chiếu đã được xóa nhưng file chưa được dọn khỏi lưu trữ.',
        )
      }

      return result.data
    },
  }
}
