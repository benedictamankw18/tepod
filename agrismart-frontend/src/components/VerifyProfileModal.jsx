import { Link } from 'react-router-dom'
import Modal from './Modal'

export default function VerifyProfileModal({ open, onClose, action = 'list produce on the market' }) {
  return (
    <Modal open={open} onClose={onClose} title="Verify your farmer profile" maxWidth="max-w-md">
      <p className="mt-1 font-sans text-sm leading-relaxed text-muted">
        You need a verified farmer profile before you can {action}. It only takes a few minutes.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/verify"
          onClick={onClose}
          className="flex-1 rounded-[10px] bg-leaf px-4 py-2.5 text-center font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
        >
          Verify my profile
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-line px-4 py-2.5 font-sans text-sm font-semibold text-ink transition hover:bg-paper"
        >
          Not now
        </button>
      </div>
    </Modal>
  )
}
