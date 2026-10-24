import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createDocument, type DesignDocument } from '@shared/model'
import { decodeProject, encodeProject, ProjectFileError } from '@shared/projectFile'

function sampleDocument(): DesignDocument {
  const doc = createDocument(1080, 1080, 'Poster')
  doc.pages[0].background = '#fafafa'
  doc.assets = [
    { id: 'img1', name: 'photo', mime: 'image/png' },
    { id: 'unused', name: 'old', mime: 'image/png' }
  ]
  doc.pages[0].elements = [
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
    expect(document.pages[0].elements).toEqual(doc.pages[0].elements)
    expect(document.pages[0].background).toBe('#fafafa')
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

  it('opens version 1 projects (single page) as a one-page design', () => {
    const v1 = {
      schemaVersion: 1,
      title: 'Old',
      width: 800,
      height: 600,
      background: '#123456',
      assets: [],
      elements: [{ ...sampleDocument().pages[0].elements[0] }]
    }
    const file = zipSync({
      'manifest.json': strToU8('{"format":"offline-design-editor","schemaVersion":1}'),
      'document.json': strToU8(JSON.stringify(v1))
    })
    const { document } = decodeProject(file)
    expect(document.schemaVersion).toBe(2)
    expect(document.pages).toHaveLength(1)
    expect(document.pages[0].background).toBe('#123456')
    expect(document.pages[0].elements[0].id).toBe('t1')
  })

  it('keeps every page and the images used on any page', () => {
    const doc = sampleDocument()
    const second = { ...doc.pages[0], id: 'p2', elements: [], backgroundAssetId: 'unused' }
    doc.pages.push(second)
    const { document, assets } = decodeProject(encodeProject(doc, new Map([['img1', png], ['unused', png]])))
    expect(document.pages.map((p) => p.id)).toEqual([doc.pages[0].id, 'p2'])
    expect([...assets.keys()].sort()).toEqual(['img1', 'unused'])
  })
})
