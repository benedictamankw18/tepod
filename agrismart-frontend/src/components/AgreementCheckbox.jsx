export default function AgreementCheckbox({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2.5 font-sans text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-line accent-leaf"
      />
      <span>
        I agree to the{' '}
        <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-leaf hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-leaf hover:underline">
          Privacy Policy
        </a>
        .
      </span>
    </label>
  )
}