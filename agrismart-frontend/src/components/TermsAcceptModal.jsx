import { Link } from 'react-router-dom'
import Modal from './Modal'

export default function TermsAcceptModal({ open, onAccept, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Accept terms to continue" maxWidth="max-w-md">
      <p className="mt-1 font-sans text-sm leading-relaxed text-muted">
        Since we didn't find an account for this Google profile, you'll be creating a
        new one. Please review and accept our{' '}
        <Link to="/terms" className="font-medium text-leaf hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</Link>{' '}
        and{' '}
        <Link to="/privacy" className="font-medium text-leaf hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>{' '}
        to continue.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-[10px] bg-leaf px-4 py-2.5 text-center font-sans text-sm font-bold text-white transition hover:bg-leaf-dark"
        >
          Accept &amp; continue
        </button>
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