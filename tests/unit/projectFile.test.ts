import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createDocument, type DesignDocument } from '@shared/model'
import { decodeProject, encodeProject, ProjectFileError } from '@shared/projectFile'

function sampleDocument(): DesignDocument {
  const doc = createDocument(1080, 1080, 'Poster')
  doc.background = '#fafafa'
  doc.assets = [
    { id: 'img1', name: 'photo', mime: 'image/png' },
    { id: 'unused', name: 'old', mime: 'image/png' }
  ]
  doc.elements = [
    {
      id: 't1',
      name: 'Heading',
      type: 'text',
      x: 10,
      y: 20,
      width: 500,
      height: 60,
      rotation: 15,
      opacity: 0.8,
      locked: false,
      hidden: false,
      text: 'Hello\nworld',
      fontFamily: 'Georgia',
      fontSize: 48,
      fontStyle: 'italic bold',
      underline: true,
      fill: '#ff0000',
      align: 'center',
      lineHeight: 1.3,
      letterSpacing: 2
    },
    {
      id: 'i1',
      name: 'photo',
      type: 'image',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      locked: true,
      hidden: false,
      assetId: 'img1'
    }
  ]
  return doc
}

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])

describe('project file', () => {
  it('round-trips a design and its images without losing anything', () => {
    const doc = sampleDocument()
    const assets = new Map([
      ['img1', png],
      ['unused', new Uint8Array([9])]
    ])
    const { document, assets: loaded } = decodeProject(encodeProject(doc, assets))
    expect(document.elements).toEqual(doc.elements)
    expect(document.background).toBe('#fafafa')
    expect(loaded.get('img1')).toEqual(png)
  })

  it('leaves out images that the design no longer uses', () => {
    const files = unzipSync(encodeProject(sampleDocument(), new Map([['img1', png], ['unused', png]])))
    expect(Object.keys(files).sort()).toEqual(['assets/img1', 'document.json', 'manifest.json'])
  })

  it('refuses to save when an image is missing', () => {
    expect(() => encodeProject(sampleDocument(), new Map())).toThrow(ProjectFileError)
  })

  it('gives a friendly error for files that are not projects', () => {
    expect(() => decodeProject(new Uint8Array([1, 2, 3]))).toThrow(/not a design project/)
    const other = zipSync({ 'manifest.json': strToU8('{"format":"something-else","schemaVersion":1}') })
    expect(() => decodeProject(other)).toThrow(/not a design project made by this app/)
  })

  it('refuses projects from a newer app version', () => {
    const newer = zipSync({
      'manifest.json': strToU8('{"format":"offline-design-editor","schemaVersion":99}'),
      'document.json': strToU8('{}')
    })
    expect(() => decodeProject(newer)).toThrow(/newer version/)
  })

  it('rejects a damaged document', () => {
    const damaged = zipSync({
      'manifest.json': strToU8('{"format":"offline-design-editor","schemaVersion":1}'),
      'document.json': strToU8('{"schemaVersion":1,"elements":"oops"}')
    })
    expect(() => decodeProject(damaged)).toThrow(/damaged/)
  })
})
