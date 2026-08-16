/**
 * docx preview rendering: inline images (w:drawing/a:blip) and run/paragraph
 * shading (w:shd) must survive into the HTML.
 */
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { docxToHtml, rebuildDocx } from '../src/client/preview/office.tsx'

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
const PIC = 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'
const MC = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
const WP = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'

describe('docxToHtml', () => {
  it('renders an inline image as <img> with a data URL', async () => {
    const documentXml = `<?xml version="1.0"?><w:document ${W} ${R} ${A} ${PIC}><w:body><w:p><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p></w:body></w:document>`
    const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="media/image1.png"/></Relationships>`
    const zip = new JSZip()
    zip.file('word/document.xml', documentXml)
    zip.file('word/_rels/document.xml.rels', rels)
    zip.file('word/media/image1.png', 'fake-png-bytes')
    const html = await docxToHtml(documentXml, zip)
    expect(html).toContain('<img')
    expect(html).toContain('data:image/png;base64,')
  })

  it('renders paragraph and run shading as background-color', async () => {
    const documentXml = `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:pPr><w:shd w:fill="FF0000"/></w:pPr><w:r><w:t>红底文字</w:t></w:r></w:p></w:body></w:document>`
    const html = await docxToHtml(documentXml)
    expect(html).toContain('background-color:#FF0000')
    expect(html).toContain('红底文字')
  })

  it('round-trips formatting through edit + save (bold/color/size survive)', async () => {
    const documentXml = `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:rPr><w:b/><w:color w:val="FF0000"/><w:sz w:val="32"/></w:rPr><w:t>加粗红色16pt</w:t></w:r></w:p></w:body></w:document>`
    const zip = new JSZip()
    zip.file('word/document.xml', documentXml)
    const html = await docxToHtml(documentXml, zip)
    // Rebuild from the preview HTML (the edit+save path).
    const bytes = await rebuildDocx(zip, html)
    const rebuilt = await new JSZip().loadAsync(bytes)
    const rebuiltXml = await rebuilt.file('word/document.xml').async('string')
    expect(rebuiltXml).toContain('<w:b/>')
    expect(rebuiltXml).toContain('w:color w:val="FF0000"')
    expect(rebuiltXml).toContain('<w:sz w:val="32"/>')
    expect(rebuiltXml).toContain('加粗红色16pt')
  })

  it('renders text inside w:sdt content controls (resume templates)', async () => {
    const documentXml = `<?xml version="1.0"?><w:document ${W}><w:body><w:tbl><w:tr><w:tc><w:sdt><w:sdtContent><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:sdtContent></w:sdt></w:tc></w:tr></w:tbl></w:body></w:document>`
    const html = await docxToHtml(documentXml)
    expect(html).toContain('<table')
    expect(html).toContain('姓名')
  })

  it('renders an image wrapped in mc:AlternateContent (shape/picture)', async () => {
    const documentXml = `<?xml version="1.0"?><w:document ${W} ${R} ${A} ${MC} ${WP}><w:body><w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:inline><a:graphic><a:blip r:embed="rId1"/></a:graphic></wp:inline></w:drawing></mc:Choice></mc:AlternateContent></w:r></w:p></w:body></w:document>`
    const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="media/image1.jpeg"/></Relationships>`
    const zip = new JSZip()
    zip.file('word/document.xml', documentXml)
    zip.file('word/_rels/document.xml.rels', rels)
    zip.file('word/media/image1.jpeg', 'fake-jpeg-bytes')
    const html = await docxToHtml(documentXml, zip)
    expect(html).toContain('<img')
    expect(html).toContain('data:image/jpeg;base64,')
  })

  it('renders header images (letterhead logo) via header1.xml.rels', async () => {
    const documentXml = `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:t>正文</w:t></w:r></w:p></w:body></w:document>`
    const docRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`
    const headerXml = `<?xml version="1.0"?><w:hdr ${W} ${R} ${A}><w:p><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p></w:hdr>`
    const headerRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="media/logo.png"/></Relationships>`
    const zip = new JSZip()
    zip.file('word/document.xml', documentXml)
    zip.file('word/_rels/document.xml.rels', docRels)
    zip.file('word/header1.xml', headerXml)
    zip.file('word/_rels/header1.xml.rels', headerRels)
    zip.file('word/media/logo.png', 'fake-logo-bytes')
    const html = await docxToHtml(documentXml, zip)
    expect(html).toContain('正文')
    expect(html).toContain('data:image/png;base64,')
    // header content must precede the body content
    expect(html.indexOf('data:image/png')).toBeLessThan(html.indexOf('正文'))
  })
})
