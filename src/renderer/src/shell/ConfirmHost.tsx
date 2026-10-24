import { Modal } from '@renderer/components/ui'
import { useUi } from '@renderer/store/uiStore'

/** Shows the confirmation box requested with confirmAction(). */
export function ConfirmHost() {
  const request = useUi((s) => s.confirm)
  if (!request) return null
  return (
    <Modal
      title={request.title}
      onClose={() => request.resolve('cancel')}
      footer={
        <>
          <button className="btn ghost" onClick={() => request.resolve('cancel')}>
            Cancel
          </button>
          {request.alternateLabel && (
            <button className="btn" onClick={() => request.resolve('alternate')}>
              {request.alternateLabel}
            </button>
          )}
          <button className={`btn ${request.danger ? 'danger' : 'primary'}`} autoFocus onClick={() => request.resolve('confirm')}>
            {request.confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{request.message}</p>
    </Modal>
  )
}
