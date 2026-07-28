import Modal from './Modal'

export default function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirmar', busy = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="max-w-md">
      <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end sm:p-6">
        <button type="button" onClick={onClose} disabled={busy} className="button-secondary">
          Cancelar
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className="button-danger">
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
