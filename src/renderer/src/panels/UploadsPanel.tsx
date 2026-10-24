import type { DesignDocument } from '@shared/model'
import { Icon } from '@renderer/components/Icon'
import { createImage } from '@renderer/editor/elementFactory'
import { useImage } from '@renderer/editor/useImage'
import { importImagesDialog } from '@renderer/io/projectIo'
import { assets } from '@renderer/store/assets'
import { editor } from '@renderer/store/editorStore'

export function UploadsPanel({ doc }: { doc: DesignDocument }) {
  return (
    <div className="panel">
      <h2 className="panel-title">Uploads</h2>
      <button className="button primary wide" onClick={() => void importImagesDialog()}>
        <Icon name="plus" size={18} /> Import images
      </button>
      <p className="muted small">You can also drag image files onto the page, or paste them with Ctrl+V.</p>
      {doc.assets.length > 0 && <h3 className="panel-subtitle">In this design</h3>}
      <div className="upload-grid">
        {doc.assets.map((asset) => (
          <UploadThumb key={asset.id} doc={doc} assetId={asset.id} name={asset.name} />
        ))}
      </div>
    </div>
  )
}

function UploadThumb({ doc, assetId, name }: { doc: DesignDocument; assetId: string; name: string }) {
  const url = assets.url(assetId)
  const image = useImage(url)
  if (!url) return null
  return (
    <button
      className="upload-thumb"
      title={`Add ${name} again`}
      disabled={!image}
      onClick={() => image && editor.addElements([createImage(doc, assetId, name, image.naturalWidth || 512, image.naturalHeight || 512)], 'Add image')}
    >
      <img src={url} alt={name} />
    </button>
  )
}
