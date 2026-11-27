export type NoticeData = { kind: 'success' | 'error'; text: string }

export default function Notice({ notice }: { notice: NoticeData | null }) {
  if (!notice) return null
  return (
    <div
      role="status"
      className={`mt-4 rounded-md p-3 text-sm ${
        notice.kind === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
      }`}
    >
      {notice.text}
    </div>
  )
}