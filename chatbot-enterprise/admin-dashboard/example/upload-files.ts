import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function handleFileUpload(file: File, knowledgeBaseName: string) {
  // 1) upsert (or lookup) your KB as before…
  const { data, error: kbError } = await supabase
    .from('knowledge_bases')
    .upsert(
      { name: knowledgeBaseName },
      { onConflict: 'name'} 
    )
    .select(); // Ensures data is typed as an array of rows

  if (kbError) throw kbError;
  // Now check that data is actually an array
  if (!data || data.length === 0) {
    throw new Error('Upsert succeeded but returned no rows');
  }

  const kb = data[0];           // safe to index now
  const knowledgeBaseId = kb.id;


  // 2) try your desired path
  const desiredPath = `${knowledgeBaseName}/${file.name}`

  // 3) upload (Supabase will rename on collision)
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('chatbot-documents')
    .upload(desiredPath, file)
  if (uploadError) throw uploadError

  // uploadData.path is the real key, e.g. "Customer-Onboarding/Full Process(1).docx"
  const actualPath     = uploadData.path
  // derive only the filename portion
  const actualFilename = actualPath.split('/').pop()

  // 4) notify n8n with path, filename, and KB id
  await fetch('http://localhost:5678/webhook/upload-doc', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      path:               actualPath,
      file_name:          actualFilename,
      knowledge_base_id:  knowledgeBaseId
    })
  })
}
