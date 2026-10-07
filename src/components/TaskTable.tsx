'use client'

interface Task {
  id: string
  name: string
  phase: string
  responsible: string
  startDate: string
  endDate: string
  progress: number
  color: string
  notes?: string | null
  order: number
  stage?: string | null
  subStage?: string | null
  building?: string | null
  facade?: string | null
  floors?: string | null
  scaffoldingNum?: string | null
  cost?: number | null
  quantity?: number | null
  wbsStage?: string | null
  sdPhase?: string | null
}

interface TaskTableProps {
  tasks: Task[]
  onTaskUpdate: (id: string, data: Partial<Task>) => void | Promise<void>
  onTaskDelete?: (id: string) => void | Promise<void>
  canEdit?: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function exportToExcel(tasks: Task[]) {
  const today = new Date()
  const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`

  const headers = ['#', 'שלב', 'משימה', 'SD', 'שלב WBS', 'תת-התקנה', 'שלב עבודה', 'בניין', 'חזית', 'קומות', 'מס׳ פיגומים', 'כמות', 'אחראי', 'התחלה', 'סיום', 'התקדמות %', 'עלות', 'הערות']

  const colCount = headers.length
  const lastCol = String.fromCharCode(64 + colCount)

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="Default" ss:Name="Normal">
  <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="11"/>
 </Style>
 <Style ss:ID="Title">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#1F3864"/>
 </Style>
 <Style ss:ID="SubTitle">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10" ss:Color="#666666"/>
 </Style>
 <Style ss:ID="Header">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/>
  <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
  <Interior ss:Color="#1F3864" ss:Pattern="Solid"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D1B3E"/>
   <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2A4A7F"/>
   <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2A4A7F"/>
  </Borders>
 </Style>
 <Style ss:ID="Cell">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="CellAlt">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="TaskName">
  <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="TaskNameAlt">
  <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
  <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="DateCell">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <NumberFormat ss:Format="dd/mm/yyyy"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="DateCellAlt">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <NumberFormat ss:Format="dd/mm/yyyy"/>
  <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="Pct">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <NumberFormat ss:Format="0%"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="PctAlt">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <NumberFormat ss:Format="0%"/>
  <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="Num">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <NumberFormat ss:Format="#,##0.00"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
 <Style ss:ID="NumAlt">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  <Font ss:FontName="Arial" ss:Size="10"/>
  <NumberFormat ss:Format="#,##0.00"/>
  <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
  </Borders>
 </Style>
</Styles>
<Worksheet ss:Name="לוח זמנים" ss:RightToLeft="1">
 <Table ss:DefaultRowHeight="22">
  <Column ss:Width="35"/>
  <Column ss:Width="130"/>
  <Column ss:Width="200"/>
  <Column ss:Width="60"/>
  <Column ss:Width="80"/>
  <Column ss:Width="90"/>
  <Column ss:Width="90"/>
  <Column ss:Width="55"/>
  <Column ss:Width="60"/>
  <Column ss:Width="100"/>
  <Column ss:Width="75"/>
  <Column ss:Width="60"/>
  <Column ss:Width="100"/>
  <Column ss:Width="85"/>
  <Column ss:Width="85"/>
  <Column ss:Width="70"/>
  <Column ss:Width="75"/>
  <Column ss:Width="150"/>`

  xml += `
  <Row ss:Height="30">
   <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Title"><Data ss:Type="String">לוח זמנים — טרמינל סנטר 3</Data></Cell>
  </Row>
  <Row ss:Height="20">
   <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="SubTitle"><Data ss:Type="String">תאריך הפקה: ${dateStr} | סה״כ ${tasks.length} משימות</Data></Cell>
  </Row>
  <Row ss:Height="5"><Cell/></Row>`

  xml += `\n  <Row ss:Height="32">`
  for (const h of headers) {
    xml += `\n   <Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`
  }
  xml += `\n  </Row>`

  tasks.forEach((task, i) => {
    const alt = i % 2 === 1
    const cs = alt ? 'CellAlt' : 'Cell'
    const ns = alt ? 'TaskNameAlt' : 'TaskName'
    const ds = alt ? 'DateCellAlt' : 'DateCell'
    const ps = alt ? 'PctAlt' : 'Pct'
    const nms = alt ? 'NumAlt' : 'Num'

    const startD = new Date(task.startDate)
    const endD = new Date(task.endDate)
    const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T00:00:00.000`

    xml += `\n  <Row ss:Height="24">`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="Number">${i + 1}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.phase)}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${ns}"><Data ss:Type="String">${escXml(task.name)}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.sdPhase ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.wbsStage ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.subStage ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.stage ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.building ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.facade ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.floors ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.scaffoldingNum ?? '')}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${nms}"><Data ss:Type="Number">${task.quantity ?? 0}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.responsible)}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${ds}"><Data ss:Type="DateTime">${fmtISO(startD)}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${ds}"><Data ss:Type="DateTime">${fmtISO(endD)}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${ps}"><Data ss:Type="Number">${task.progress / 100}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${nms}"><Data ss:Type="Number">${task.cost ?? 0}</Data></Cell>`
    xml += `\n   <Cell ss:StyleID="${cs}"><Data ss:Type="String">${escXml(task.notes ?? '')}</Data></Cell>`
    xml += `\n  </Row>`
  })

  xml += `
 </Table>
 <AutoFilter x:Range="R4C1:R${4 + tasks.length}C${colCount}" xmlns="urn:schemas-microsoft-com:office:excel"/>
 <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
  <DisplayRightToLeft/>
  <FreezePanes/>
  <FrozenNoSplit/>
  <SplitHorizontal>4</SplitHorizontal>
  <TopRowBottomPane>4</TopRowBottomPane>
  <ActivePane>2</ActivePane>
 </WorksheetOptions>
</Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `לוח_זמנים_${dateStr.replace(/\./g, '-')}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default function TaskTable({ tasks, onTaskUpdate, onTaskDelete, canEdit = false }: TaskTableProps) {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8, gap: 8 }}>
        <button
          onClick={() => exportToExcel(tasks)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: '#1F7A3F', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 13,
            fontFamily: 'Arial', fontWeight: 600,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          ייצוא לאקסל
        </button>
        <button
          onClick={() => {
            const table = document.querySelector('#task-table-main')
            if (!table) return
            const range = document.createRange()
            range.selectNodeContents(table)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
            document.execCommand('copy')
            sel?.removeAllRanges()
            alert('הטבלה הועתקה ללוח')
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: '#374151', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 13,
            fontFamily: 'Arial', fontWeight: 600,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          העתק טבלה
        </button>
      </div>

      <div className="overflow-auto bg-white rounded-lg shadow-sm border border-gray-200" style={{ flex: 1 }}>
        <table id="task-table-main" className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: '#1F3864' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>שלב</th>
              <th style={{ ...thStyle, minWidth: 180 }}>משימה</th>
              <th style={thStyle}>SD</th>
              <th style={thStyle}>שלב WBS</th>
              <th style={thStyle}>תת-התקנה</th>
              <th style={thStyle}>שלב עבודה</th>
              <th style={thStyle}>בניין</th>
              <th style={thStyle}>חזית</th>
              <th style={thStyle}>קומות</th>
              <th style={thStyle}>מס׳ פיגומים</th>
              <th style={thStyle}>כמות יח׳</th>
              <th style={thStyle}>אחראי</th>
              <th style={thStyle}>התחלה</th>
              <th style={thStyle}>סיום</th>
              <th style={thStyle}>התקדמות</th>
              <th style={thStyle}>עלויות</th>
              <th style={thStyle}>הערות</th>
              {canEdit && <th style={thStyle}>פעולות</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <tr key={task.id} style={{ background: i % 2 === 1 ? '#F9FAFB' : 'white', borderBottom: '1px solid #F3F4F6' }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>
                  <span style={{ background: task.color || '#4472C4', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {task.phase}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'right' }}>{task.name}</td>
                <td style={tdStyle}>{task.sdPhase ?? ''}</td>
                <td style={tdStyle}>{task.wbsStage ?? ''}</td>
                <td style={tdStyle}>{task.subStage ?? ''}</td>
                <td style={tdStyle}>{task.stage ?? ''}</td>
                <td style={tdStyle}>{task.building ?? ''}</td>
                <td style={tdStyle}>{task.facade ?? ''}</td>
                <td style={tdStyle}>{task.floors ?? ''}</td>
                <td style={tdStyle}>{task.scaffoldingNum ?? ''}</td>
                <td style={tdStyle}>{task.quantity != null ? `${task.quantity}` : ''}</td>
                <td style={tdStyle}>{task.responsible}</td>
                <td style={tdStyle}>{formatDate(task.startDate)}</td>
                <td style={tdStyle}>{formatDate(task.endDate)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <div style={{ width: 50, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${task.progress}%`, height: '100%', background: task.color || '#4472C4', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{task.progress}%</span>
                  </div>
                </td>
                <td style={tdStyle}>{task.cost != null ? `${task.cost.toLocaleString()} מ"ר` : ''}</td>
                <td style={{ ...tdStyle, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.notes ?? ''}</td>
                {canEdit && (
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          const name = prompt('שם משימה:', task.name)
                          if (name && name !== task.name) onTaskUpdate(task.id, { name })
                        }}
                        style={actionBtnStyle}
                      >
                        ערוך
                      </button>
                      {onTaskDelete && (
                        <button onClick={() => onTaskDelete(task.id)} style={{ ...actionBtnStyle, color: '#DC2626' }}>
                          מחק
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>אין משימות להצגה</div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  color: 'white',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  fontFamily: 'Arial',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'center',
  fontSize: 13,
  color: '#374151',
  whiteSpace: 'nowrap',
  fontFamily: 'Arial',
}

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  fontSize: 12,
  border: '1px solid #D1D5DB',
  background: 'white',
  cursor: 'pointer',
  color: '#2563EB',
  fontFamily: 'Arial',
}
