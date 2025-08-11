import '../globals.css'

// Embed layout - works within the root layout, no HTML structure needed
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          * {
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: hidden !important;
            width: 100% !important;
            height: 100% !important;
            font-family: system-ui, sans-serif !important;
          }
          /* Reset any inherited styles */
          body * {
            font-family: inherit;
          }
        `
      }} />
      <div style={{
        width: '100vw',
        height: '100vh', 
        background: 'transparent',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {children}
      </div>
    </>
  )
}
