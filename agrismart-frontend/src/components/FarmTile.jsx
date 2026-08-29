import CropGlyph from './CropGlyph'
import { Tag } from './ListingCard'

export default function FarmTile({ farm }) {
  return (
    <div className="flex gap-3 rounded-[13px] border border-line bg-[#fbfcfa] p-3">
      <CropGlyph cropType={farm.cropType} size="h-[52px] w-[52px] text-[20px]" />
      <div className="min-w-0">
        <p className="truncate font-serif text-[15px] font-semibold capitalize text-ink">{farm.cropType}</p>
        <p className="truncate font-sans text-xs text-muted">{farm.name}</p>
        <Tag className="mt-1.5">{farm.status}</Tag>
      </div>
    </div>
  )
}
